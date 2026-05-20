-- P2.2: indices para paginacao e filtros server-side do inventario.

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_itens_inventory_order_active
  on public.itens_inventario(unidade_id, comodo, nome)
  where deletado_em is null;

create index if not exists idx_itens_inventory_quantity_active
  on public.itens_inventario(unidade_id, quantidade)
  where deletado_em is null;

create index if not exists idx_itens_inventory_nome_trgm_active
  on public.itens_inventario
  using gin (nome gin_trgm_ops)
  where deletado_em is null;

create index if not exists idx_itens_inventory_categoria_trgm_active
  on public.itens_inventario
  using gin (categoria gin_trgm_ops)
  where deletado_em is null and categoria is not null;

create index if not exists idx_itens_inventory_comodo_trgm_active
  on public.itens_inventario
  using gin (comodo gin_trgm_ops)
  where deletado_em is null;

create index if not exists idx_itens_inventory_armario_trgm_active
  on public.itens_inventario
  using gin (armario gin_trgm_ops)
  where deletado_em is null and armario is not null;

create index if not exists idx_itens_inventory_caixa_trgm_active
  on public.itens_inventario
  using gin (caixa gin_trgm_ops)
  where deletado_em is null and caixa is not null;
