-- Ordo Domus - baseline schema for reproducible Supabase environments.
-- This migration intentionally creates only the base objects that later
-- hardening/feature migrations depend on. It does not recreate legacy broad
-- write policies for inventory, movements, pending imports or dictionary data.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.unidades (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  codigo_convite text unique default gen_random_uuid()::text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.membros_unidades (
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  papel text default 'admin',
  status text default 'pendente',
  adicionado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (unidade_id, user_id)
);

create table if not exists public.itens_inventario (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  nome text not null,
  categoria text,
  comodo text not null,
  armario text,
  caixa text,
  validade text,
  quantidade numeric default 1,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  deletado_em timestamptz,
  deletado_por uuid references auth.users(id)
);

create table if not exists public.movimentacoes_inventario (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  item_id uuid,
  item_nome text not null,
  categoria text,
  comodo text,
  quantidade numeric default 1,
  tipo text not null,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.importacoes_pendentes (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  nome_bruto text not null,
  quantidade numeric default 1,
  valor_unitario numeric,
  match_id uuid references public.itens_inventario(id) on delete set null,
  processado boolean default false,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '24 hours') not null
);

create table if not exists public.dicionario_produtos (
  id uuid default gen_random_uuid() primary key,
  unidade_id uuid references public.unidades(id) on delete cascade not null,
  nome_bruto_cupom text not null,
  nome_oficial_inventario text not null,
  categoria text,
  comodo text,
  criado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(unidade_id, nome_bruto_cupom)
);

create table if not exists public.system_admins (
  user_id uuid references auth.users(id) primary key,
  adicionado_em timestamp with time zone default timezone('utc'::text, now()) not null
);

create or replace view public.membros_unidades_view as
select
  m.unidade_id,
  m.papel,
  m.status,
  m.adicionado_em,
  encode(sha256(m.user_id::text::bytea), 'hex') as user_hash
from public.membros_unidades m;

create index if not exists idx_membros_unidades_user_id on public.membros_unidades(user_id);
create index if not exists idx_membros_unidades_unidade_id on public.membros_unidades(unidade_id);
create index if not exists idx_membros_unidades_status on public.membros_unidades(status);
create index if not exists idx_itens_unidade_id on public.itens_inventario(unidade_id);
create index if not exists idx_itens_categoria on public.itens_inventario(categoria);
create index if not exists idx_itens_unidade_nome_lower on public.itens_inventario(unidade_id, lower(trim(nome)));
create index if not exists idx_itens_unidade_comodo_lower on public.itens_inventario(unidade_id, lower(trim(comodo)));
create index if not exists idx_itens_upsert_lookup
  on public.itens_inventario(
    unidade_id,
    lower(trim(nome)),
    lower(trim(comodo)),
    lower(trim(armario)),
    lower(trim(caixa)),
    validade
  )
  where deletado_em is null;
create index if not exists idx_movimentacoes_unidade_id on public.movimentacoes_inventario(unidade_id);
create index if not exists idx_movimentacoes_criado_em on public.movimentacoes_inventario(criado_em);
create index if not exists idx_importacoes_pendentes_unidade_id on public.importacoes_pendentes(unidade_id);
create index if not exists idx_importacoes_pendentes_expires_at on public.importacoes_pendentes(expires_at);
create index if not exists idx_dicionario_unidade_nome
  on public.dicionario_produtos(unidade_id, lower(trim(nome_bruto_cupom)));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unique_item_location'
      and conrelid = 'public.itens_inventario'::regclass
  ) then
    alter table public.itens_inventario
      add constraint unique_item_location
      unique (unidade_id, nome, comodo, armario, caixa, validade);
  end if;
end;
$$;

alter table public.unidades enable row level security;
alter table public.membros_unidades enable row level security;
alter table public.itens_inventario enable row level security;
alter table public.movimentacoes_inventario enable row level security;
alter table public.importacoes_pendentes enable row level security;
alter table public.dicionario_produtos enable row level security;
alter table public.system_admins enable row level security;

drop policy if exists "Permitir inserção de unidades para usuários autenticados" on public.unidades;
create policy "Permitir inserção de unidades para usuários autenticados"
  on public.unidades for insert
  to authenticated
  with check (true);

drop policy if exists "Permitir leitura de unidades que o usuário é membro" on public.unidades;
create policy "Permitir leitura de unidades que o usuário é membro"
  on public.unidades for select
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = unidades.id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Ver membros da unidade" on public.membros_unidades;
create policy "Ver membros da unidade"
  on public.membros_unidades for select
  using (user_id = auth.uid());

drop policy if exists "Inserir membros" on public.membros_unidades;
create policy "Inserir membros"
  on public.membros_unidades for insert
  with check (auth.uid() = user_id);

drop policy if exists "System admins can read their own status" on public.system_admins;
create policy "System admins can read their own status"
  on public.system_admins for select
  using (user_id = auth.uid());
