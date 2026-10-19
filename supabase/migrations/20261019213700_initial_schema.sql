create type public.transaction_kind as enum ('despesa', 'receita');

-- Lista fixa de categorias, igual para todos os usuários
create table public.categories (
  id text primary key,
  name text not null,
  kind public.transaction_kind not null,
  icon text not null,
  color text not null,
  sort smallint not null
);

insert into public.categories (id, name, kind, icon, color, sort) values
  ('alimentacao',  'Alimentação',            'despesa', 'restaurant',       '#F97316', 1),
  ('mercado',      'Mercado',                'despesa', 'cart',             '#EAB308', 2),
  ('moradia',      'Moradia',                'despesa', 'home',             '#8B5CF6', 3),
  ('contas',       'Contas da casa',         'despesa', 'flash',            '#06B6D4', 4),
  ('transporte',   'Transporte',             'despesa', 'car',              '#3B82F6', 5),
  ('saude',        'Saúde',                  'despesa', 'medkit',           '#EF4444', 6),
  ('educacao',     'Educação',               'despesa', 'school',           '#14B8A6', 7),
  ('lazer',        'Lazer',                  'despesa', 'game-controller',  '#EC4899', 8),
  ('compras',      'Compras',                'despesa', 'bag-handle',       '#F43F5E', 9),
  ('assinaturas',  'Assinaturas e digitais', 'despesa', 'repeat',           '#A855F7', 10),
  ('seguros',      'Seguros e taxas',        'despesa', 'shield-checkmark', '#64748B', 11),
  ('outros',       'Outros',                 'despesa', 'ellipsis-horizontal', '#94A3B8', 12),
  ('salario',      'Salário',                'receita', 'briefcase',        '#22C55E', 20),
  ('renda_extra',  'Renda extra',            'receita', 'trending-up',      '#10B981', 21),
  ('outras_receitas', 'Outras receitas',     'receita', 'cash',             '#84CC16', 22);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  description text not null check (char_length(description) between 1 and 200),
  -- descrição normalizada, usada para achar lançamentos parecidos
  merchant_key text not null,
  amount numeric(14, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  category_id text not null references public.categories (id),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_user_merchant_idx on public.transactions (user_id, merchant_key);
create index transactions_category_idx on public.transactions (category_id);

-- "Comerciante X vai para a categoria Y", aprendida quando o usuário corrige uma categoria
create table public.category_rules (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  merchant_key text not null,
  category_id text not null references public.categories (id),
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
create index category_rules_category_idx on public.category_rules (category_id);

alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.category_rules enable row level security;

create policy "categories readable" on public.categories for select to authenticated using (true);
create policy "own transactions" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rules" on public.category_rules for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
