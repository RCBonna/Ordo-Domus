-- P1 auditability: record the authenticated user responsible for each inventory movement.

alter table public.movimentacoes_inventario
  add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_movimentacoes_user_id
  on public.movimentacoes_inventario(user_id);

create index if not exists idx_movimentacoes_unidade_user_criado
  on public.movimentacoes_inventario(unidade_id, user_id, criado_em desc);
