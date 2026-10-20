-- Etapa 3: agentes de alerta.
-- Gasto do dia, gasto fora do normal e cobrança recorrente são checados na hora em que
-- um gasto é lançado (trigger). O resumo semanal roda toda segunda pelo pg_cron.

create extension if not exists pg_cron;

create type public.agent_template as enum ('gasto_diario', 'fora_do_normal', 'assinatura_nova', 'resumo_semanal');

create table public.agents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template public.agent_template not null,
  enabled boolean not null default false,
  -- só o "gasto_diario" usa: limite de gasto por dia
  limit_amount numeric(14, 2) check (limit_amount is null or limit_amount > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, template)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template public.agent_template not null,
  title text not null,
  body text not null,
  -- evita repetir o mesmo aviso (ex.: um resumo por semana)
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, dedupe_key)
);
create index alerts_user_created_idx on public.alerts (user_id, created_at desc);

alter table public.agents enable row level security;
alter table public.alerts enable row level security;

create policy "own agents read" on public.agents for select to authenticated using ((select auth.uid()) = user_id);
create policy "own agents insert" on public.agents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own agents update" on public.agents for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Avisos são criados só pelo banco; o app lê, marca como lido e apaga.
create policy "own alerts read" on public.alerts for select to authenticated using ((select auth.uid()) = user_id);
create policy "own alerts update" on public.alerts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own alerts delete" on public.alerts for delete to authenticated using ((select auth.uid()) = user_id);

-- "1234.5" -> "R$ 1.234,50"
create function public.brl(v numeric) returns text
language sql immutable set search_path = '' as $$
  select 'R$ ' || translate(to_char(v, 'FM999,999,999,990.00'), ',.', '.,')
$$;

create function public.today_br() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create function public.add_alert(p_user uuid, p_template public.agent_template, p_title text, p_body text, p_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.alerts (user_id, template, title, body, dedupe_key)
  values (p_user, p_template, p_title, p_body, p_key)
  on conflict (user_id, dedupe_key) do nothing
$$;

create function public.agent_enabled(p_user uuid, p_template public.agent_template) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select enabled from public.agents where user_id = p_user and template = p_template), false)
$$;

-- Agentes ligados por padrão para cada conta nova (o de limite diário precisa de um valor, então começa desligado).
create function public.seed_default_agents() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agents (user_id, template, enabled) values
    (new.id, 'gasto_diario', false),
    (new.id, 'fora_do_normal', true),
    (new.id, 'assinatura_nova', true),
    (new.id, 'resumo_semanal', true)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_agents
  after insert on auth.users
  for each row execute function public.seed_default_agents();

insert into public.agents (user_id, template, enabled)
select u.id, t.template, t.template <> 'gasto_diario'
from auth.users u
cross join (select unnest(enum_range(null::public.agent_template)) as template) t
on conflict do nothing;

-- Checagens feitas na hora em que um gasto é lançado.
create function public.check_transaction_agents() returns trigger
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
  if new.kind <> 'despesa' then
    return null;
  end if;

  -- 1. Gasto do dia passou do limite (só para gastos de hoje)
  if new.occurred_on = v_today and public.agent_enabled(new.user_id, 'gasto_diario') then
    select limit_amount into v_limit from public.agents where user_id = new.user_id and template = 'gasto_diario';
    if v_limit is not null then
      select coalesce(sum(amount), 0) into v_total
      from public.transactions
      where user_id = new.user_id and kind = 'despesa' and occurred_on = v_today;
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
  if new.amount >= 50 and new.occurred_on >= v_today - 7 and public.agent_enabled(new.user_id, 'fora_do_normal') then
    select avg(amount), max(amount), count(*) into v_avg, v_max, v_count
    from public.transactions
    where user_id = new.user_id and kind = 'despesa' and category_id = new.category_id and id <> new.id
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
  if public.agent_enabled(new.user_id, 'assinatura_nova') then
    select count(*) into v_count
    from public.transactions
    where user_id = new.user_id and kind = 'despesa' and merchant_key = new.merchant_key and id <> new.id
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

create trigger transactions_check_agents
  after insert on public.transactions
  for each row execute function public.check_transaction_agents();

-- Resumo semanal: últimos 7 dias comparados aos 7 anteriores.
create function public.run_weekly_summaries() returns void
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
    where user_id = r.user_id and kind = 'despesa' and occurred_on > v_today - 14 and occurred_on <= v_today;

    continue when v_count = 0;

    select string_agg(format('%s (%s)', c.name, public.brl(t.total)), ', ' order by t.total desc) into v_top
    from (
      select category_id, sum(amount) as total
      from public.transactions
      where user_id = r.user_id and kind = 'despesa' and occurred_on > v_today - 7 and occurred_on <= v_today
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

-- Funções internas: não ficam expostas para o app chamar direto.
revoke execute on function public.add_alert(uuid, public.agent_template, text, text, text) from public, anon, authenticated;
revoke execute on function public.agent_enabled(uuid, public.agent_template) from public, anon, authenticated;
revoke execute on function public.seed_default_agents() from public, anon, authenticated;
revoke execute on function public.check_transaction_agents() from public, anon, authenticated;
revoke execute on function public.run_weekly_summaries() from public, anon, authenticated;

-- Toda segunda às 12:00 UTC (09:00 em Brasília).
select cron.schedule('resumo-semanal', '0 12 * * 1', 'select public.run_weekly_summaries()');
