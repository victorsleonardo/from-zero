-- Etapa 4: gastos fixos e parcelas, lançamentos ignorados nos totais e totais por mês.

alter table public.transactions
  add column hidden boolean not null default false,
  -- lançamentos criados juntos (fixo mensal ou compra parcelada) compartilham o series_id
  add column series_id uuid,
  add column series_type text check (series_type in ('fixo', 'parcelado')),
  add constraint transactions_series_check check ((series_id is null) = (series_type is null));
create index transactions_series_idx on public.transactions (series_id) where series_id is not null;

-- Entradas e gastos de cada um dos últimos meses (o atual incluído), sem os ignorados.
create function public.monthly_totals(p_months int default 6)
returns table (month date, income numeric, expense numeric)
language sql stable set search_path = '' as $$
  with months as (
    select generate_series(
      date_trunc('month', public.today_br()) - make_interval(months => greatest(1, least(p_months, 24)) - 1),
      date_trunc('month', public.today_br()),
      interval '1 month'
    )::date as month
  )
  select
    m.month,
    coalesce(sum(t.amount) filter (where t.kind = 'receita'), 0) as income,
    coalesce(sum(t.amount) filter (where t.kind = 'despesa'), 0) as expense
  from months m
  left join public.transactions t
    on t.user_id = (select auth.uid())
   and not t.hidden
   and t.occurred_on >= m.month
   and t.occurred_on < (m.month + interval '1 month')::date
  group by m.month
  order by m.month
$$;
revoke execute on function public.monthly_totals(int) from public, anon;
grant execute on function public.monthly_totals(int) to authenticated;

-- Agentes: ignoram lançamentos ocultos; fixos e parcelas não contam como "fora do normal" nem "cobrança nova".
create or replace function public.check_transaction_agents() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.today_br();
  v_limit numeric;
  v_total numeric;
  v_avg numeric;
  v_max numeric;
  v_count int;
  v_category text;
begin
  -- Lançamentos ignorados nos totais não disparam agentes.
  if new.kind <> 'despesa' or new.hidden then
    return null;
  end if;

  -- 1. Gasto do dia passou do limite (só para gastos de hoje)
  if new.occurred_on = v_today and public.agent_enabled(new.user_id, 'gasto_diario') then
    select limit_amount into v_limit from public.agents where user_id = new.user_id and template = 'gasto_diario';
    if v_limit is not null then
      select coalesce(sum(amount), 0) into v_total
      from public.transactions
      where user_id = new.user_id and kind = 'despesa' and not hidden and occurred_on = v_today;
      if v_total > v_limit then
        perform public.add_alert(
          new.user_id, 'gasto_diario',
          'Gasto do dia passou do limite',
          format('Hoje você já gastou %s, acima do limite de %s que você definiu.', public.brl(v_total), public.brl(v_limit)),
          'gasto_diario:' || v_today);
      end if;
    end if;
  end if;

  -- 2. Gasto fora do normal na categoria (lançamentos da última semana)
  -- (fixos e parcelas já são esperados: não contam como fora do normal nem como cobrança nova)
  if new.series_id is null and new.amount >= 50 and new.occurred_on between v_today - 7 and v_today
     and public.agent_enabled(new.user_id, 'fora_do_normal') then
    select avg(amount), max(amount), count(*) into v_avg, v_max, v_count
    from public.transactions
    where user_id = new.user_id and kind = 'despesa' and not hidden and category_id = new.category_id and id <> new.id
      and occurred_on between new.occurred_on - 90 and new.occurred_on;
    if v_count >= 3 and new.amount >= v_avg * 2 and new.amount > v_max then
      select name into v_category from public.categories where id = new.category_id;
      perform public.add_alert(
        new.user_id, 'fora_do_normal',
        'Gasto fora do normal em ' || v_category,
        format('"%s" de %s está bem acima do seu normal em %s (média de %s nos últimos 3 meses). Confira se está certo.',
               new.description, public.brl(new.amount), v_category, public.brl(round(v_avg, 2))),
        'fora_do_normal:' || new.id);
    end if;
  end if;

  -- 3. Cobrança que se repete: mesmo comerciante, valor parecido, em mês anterior
  if new.series_id is null and public.agent_enabled(new.user_id, 'assinatura_nova') then
    select count(*) into v_count
    from public.transactions
    where user_id = new.user_id and kind = 'despesa' and not hidden and merchant_key = new.merchant_key and id <> new.id
      and occurred_on between new.occurred_on - 100 and new.occurred_on - 20
      and abs(amount - new.amount) <= new.amount * 0.15;
    if v_count >= 1 then
      perform public.add_alert(
        new.user_id, 'assinatura_nova',
        'Cobrança que se repete: ' || new.description,
        format('Você paga cerca de %s em "%s" todo mês. Se não usa mais, vale cancelar.', public.brl(new.amount), new.description),
        'assinatura:' || new.merchant_key);
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.run_weekly_summaries() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.today_br();
  r record;
  v_current numeric;
  v_previous numeric;
  v_count int;
  v_top text;
  v_compare text;
begin
  for r in select user_id from public.agents where template = 'resumo_semanal' and enabled loop
    select
      coalesce(sum(amount) filter (where occurred_on > v_today - 7), 0),
      coalesce(sum(amount) filter (where occurred_on <= v_today - 7), 0),
      count(*) filter (where occurred_on > v_today - 7)
    into v_current, v_previous, v_count
    from public.transactions
    where user_id = r.user_id and kind = 'despesa' and not hidden and occurred_on > v_today - 14 and occurred_on <= v_today;

    continue when v_count = 0;

    select string_agg(format('%s (%s)', c.name, public.brl(t.total)), ', ' order by t.total desc) into v_top
    from (
      select category_id, sum(amount) as total
      from public.transactions
      where user_id = r.user_id and kind = 'despesa' and not hidden and occurred_on > v_today - 7 and occurred_on <= v_today
      group by category_id
      order by total desc
      limit 3
    ) t
    join public.categories c on c.id = t.category_id;

    v_compare := case
      when v_previous = 0 then ''
      when abs(v_current - v_previous) / v_previous < 0.05 then ' Ficou parecido com a semana anterior.'
      else format(' Isso é %s%% %s que na semana anterior (%s).',
                  round(abs(v_current - v_previous) / v_previous * 100),
                  case when v_current > v_previous then 'a mais' else 'a menos' end,
                  public.brl(v_previous))
    end;

    perform public.add_alert(
      r.user_id, 'resumo_semanal',
      'Seu resumo da semana',
      format('Nos últimos 7 dias você gastou %s em %s lançamento%s.%s Onde mais foi: %s.',
             public.brl(v_current), v_count, case when v_count > 1 then 's' else '' end, v_compare, v_top),
      'resumo:' || to_char(v_today, 'IYYY-IW'));
  end loop;
end;
$$;
