-- ==============================================================================
-- Ordo Domus - Busca acento-insensivel no inventario
-- Data/hora de criacao: 2026-05-20 20:00:00 -03:00
-- Data/hora de modificacao: 2026-05-20 20:15:00 -03:00
-- ==============================================================================
--
-- Bloco 1: extensoes necessarias.
-- Bloco 2: funcao imutavel de normalizacao para indices e filtros.
-- Bloco 3: indices trigram acento-insensiveis.
-- Bloco 4: RPC paginada para filtros server-side do inventario.

-- Bloco 1
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- Bloco 2
create or replace function public.normalize_search_text(value text)
returns text
language sql
immutable
parallel safe
as $normalize_search_text$
  select lower(extensions.unaccent(coalesce(value, '')));
$normalize_search_text$;

-- Bloco 3
create index if not exists idx_itens_inventory_nome_unaccent_trgm_active
  on public.itens_inventario
  using gin (public.normalize_search_text(nome) gin_trgm_ops)
  where deletado_em is null;

create index if not exists idx_itens_inventory_categoria_unaccent_trgm_active
  on public.itens_inventario
  using gin (public.normalize_search_text(categoria) gin_trgm_ops)
  where deletado_em is null and categoria is not null;

create index if not exists idx_itens_inventory_comodo_unaccent_trgm_active
  on public.itens_inventario
  using gin (public.normalize_search_text(comodo) gin_trgm_ops)
  where deletado_em is null;

create index if not exists idx_itens_inventory_armario_unaccent_trgm_active
  on public.itens_inventario
  using gin (public.normalize_search_text(armario) gin_trgm_ops)
  where deletado_em is null and armario is not null;

create index if not exists idx_itens_inventory_caixa_unaccent_trgm_active
  on public.itens_inventario
  using gin (public.normalize_search_text(caixa) gin_trgm_ops)
  where deletado_em is null and caixa is not null;

-- Bloco 4
create or replace function public.get_inventory_page(
  p_unidade_id uuid,
  p_search_term text default '',
  p_category_filter text default '',
  p_room_filter text default '',
  p_expiry_filter text default 'todos',
  p_page integer default 1,
  p_page_size integer default 24
)
returns table (
  id uuid,
  unidade_id uuid,
  nome text,
  categoria text,
  comodo text,
  armario text,
  caixa text,
  validade text,
  quantidade numeric,
  criado_em timestamp with time zone,
  deletado_em timestamp with time zone,
  deletado_por uuid,
  validade_date date,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, extensions
as $get_inventory_page$
begin
  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.status = 'aprovado'
  ) then
    return;
  end if;

  return query
  with params as (
    select
      public.normalize_search_text(trim(coalesce(p_search_term, ''))) as search_text,
      public.normalize_search_text(trim(coalesce(p_category_filter, ''))) as category_text,
      public.normalize_search_text(trim(coalesce(p_room_filter, ''))) as room_text,
      coalesce(p_expiry_filter, 'todos') as expiry_text,
      least(greatest(coalesce(p_page_size, 24), 1), 100) as page_size,
      (greatest(coalesce(p_page, 1), 1) - 1) * least(greatest(coalesce(p_page_size, 24), 1), 100) as page_offset
  ),
  filtered as (
    select i.*
    from public.itens_inventario i
    cross join params p
    where i.unidade_id = p_unidade_id
      and i.deletado_em is null
      and (
        p.search_text = ''
        or public.normalize_search_text(i.nome) like '%' || p.search_text || '%'
        or public.normalize_search_text(i.categoria) like '%' || p.search_text || '%'
        or public.normalize_search_text(i.comodo) like '%' || p.search_text || '%'
        or public.normalize_search_text(i.armario) like '%' || p.search_text || '%'
        or public.normalize_search_text(i.caixa) like '%' || p.search_text || '%'
      )
      and (
        p.category_text = ''
        or public.normalize_search_text(i.categoria) like '%' || p.category_text || '%'
      )
      and (
        p.room_text = ''
        or public.normalize_search_text(i.comodo) like '%' || p.room_text || '%'
      )
      and (
        p.expiry_text = 'todos'
        or (p.expiry_text = 'vencidos' and i.validade_date is not null and i.validade_date < current_date)
        or (p.expiry_text = 'vence_7' and i.validade_date is not null and i.validade_date between current_date and current_date + 7)
        or (p.expiry_text = 'vence_30' and i.validade_date is not null and i.validade_date between current_date and current_date + 30)
        or (p.expiry_text = 'sem_validade' and i.validade_date is null)
        or (p.expiry_text = 'estoque_critico' and i.quantidade <= 1)
      )
  ),
  numbered as (
    select
      f.*,
      count(*) over() as total_count,
      row_number() over(order by f.comodo asc nulls last, f.nome asc) as row_number
    from filtered f
  )
  select
    n.id,
    n.unidade_id,
    n.nome,
    n.categoria,
    n.comodo,
    n.armario,
    n.caixa,
    n.validade,
    n.quantidade,
    n.criado_em,
    n.deletado_em,
    n.deletado_por,
    n.validade_date,
    n.total_count
  from numbered n
  cross join params p
  where n.row_number > p.page_offset
    and n.row_number <= p.page_offset + p.page_size
  order by n.row_number;
end;
$get_inventory_page$;

revoke execute on function public.get_inventory_page(uuid, text, text, text, text, integer, integer) from public;
revoke execute on function public.get_inventory_page(uuid, text, text, text, text, integer, integer) from anon;
grant execute on function public.get_inventory_page(uuid, text, text, text, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
