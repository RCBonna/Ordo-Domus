-- ==============================================================================
-- Ordo Domus - Lista de compras manual
-- Data/hora de criacao: 2026-05-20 21:15:00 -03:00
-- Data/hora de modificacao: 2026-05-20 21:15:00 -03:00
-- ==============================================================================
--
-- Bloco 1: tabela de itens manuais da lista de compras.
-- Bloco 2: indices de consulta por unidade/status.
-- Bloco 3: RLS para membros aprovados da unidade.

-- Bloco 1
create table if not exists public.lista_compras (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null,
  quantidade numeric not null default 1 check (quantidade > 0),
  observacao text,
  status text not null default 'pendente' check (status in ('pendente', 'comprado', 'cancelado')),
  origem text not null default 'manual' check (origem in ('manual')),
  criado_por uuid references auth.users(id),
  criado_em timestamp with time zone not null default timezone('utc'::text, now()),
  atualizado_em timestamp with time zone not null default timezone('utc'::text, now())
);

-- Bloco 2
create index if not exists idx_lista_compras_unidade_status
  on public.lista_compras(unidade_id, status, criado_em desc);

create index if not exists idx_lista_compras_unidade_nome
  on public.lista_compras(unidade_id, lower(trim(nome)));

-- Bloco 3
alter table public.lista_compras enable row level security;

drop policy if exists "Membros aprovados leem lista de compras" on public.lista_compras;
create policy "Membros aprovados leem lista de compras"
  on public.lista_compras for select
  using (
    unidade_id in (
      select unidade_id
      from public.membros_unidades
      where user_id = auth.uid()
        and status = 'aprovado'
    )
  );

drop policy if exists "Membros aprovados inserem lista de compras" on public.lista_compras;
create policy "Membros aprovados inserem lista de compras"
  on public.lista_compras for insert
  with check (
    unidade_id in (
      select unidade_id
      from public.membros_unidades
      where user_id = auth.uid()
        and status = 'aprovado'
    )
  );

drop policy if exists "Membros aprovados atualizam lista de compras" on public.lista_compras;
create policy "Membros aprovados atualizam lista de compras"
  on public.lista_compras for update
  using (
    unidade_id in (
      select unidade_id
      from public.membros_unidades
      where user_id = auth.uid()
        and status = 'aprovado'
    )
  )
  with check (
    unidade_id in (
      select unidade_id
      from public.membros_unidades
      where user_id = auth.uid()
        and status = 'aprovado'
    )
  );

drop policy if exists "Membros aprovados removem lista de compras" on public.lista_compras;
create policy "Membros aprovados removem lista de compras"
  on public.lista_compras for delete
  using (
    unidade_id in (
      select unidade_id
      from public.membros_unidades
      where user_id = auth.uid()
        and status = 'aprovado'
    )
  );
