-- P2.1: KPIs e series do dashboard calculados no Postgres.
-- Mantem checagem explicita de tenant antes de retornar dados.

create index if not exists idx_itens_unidade_comodo_active
  on public.itens_inventario(unidade_id, comodo)
  where deletado_em is null;

create index if not exists idx_itens_unidade_categoria_active
  on public.itens_inventario(unidade_id, categoria)
  where deletado_em is null;

create index if not exists idx_movimentacoes_unidade_criado_desc
  on public.movimentacoes_inventario(unidade_id, criado_em desc);

create or replace function public.get_dashboard_metrics(p_unidade_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = p_unidade_id
      and m.user_id = auth.uid()
      and m.status = 'aprovado'
  ) then
    raise exception 'Acesso negado: membro nao aprovado para esta unidade.';
  end if;

  with items as (
    select
      i.id,
      i.unidade_id,
      i.nome,
      i.categoria,
      i.comodo,
      i.armario,
      i.caixa,
      i.validade,
      i.validade_date,
      coalesce(i.quantidade, 0)::double precision as quantidade
    from public.itens_inventario i
    where i.unidade_id = p_unidade_id
      and i.deletado_em is null
  ),
  item_stats as (
    select
      count(*)::int as total_skus,
      coalesce(sum(quantidade), 0)::double precision as total_quantity,
      count(*) filter (
        where quantidade <= 1
          and lower(trim(coalesce(categoria, ''))) not in (
            'ferramentas',
            'ferramenta',
            'utensilios',
            'utensílios',
            'eletrodomesticos',
            'eletrodomésticos',
            'moveis',
            'móveis',
            'eletronicos',
            'eletrônicos',
            'construcao',
            'construção'
          )
      )::int as critical_stock_count,
      count(*) filter (where validade_date < current_date)::int as expired_count,
      count(*) filter (where validade_date >= current_date and validade_date <= current_date + 7)::int as urgent_expiry_count,
      count(*) filter (where validade_date > current_date + 7 and validade_date <= current_date + 30)::int as expiring_soon_count
    from items
  ),
  movement_stats as (
    select count(*)::int as today_activity_count
    from public.movimentacoes_inventario m
    where m.unidade_id = p_unidade_id
      and m.criado_em >= date_trunc('day', now())
      and m.criado_em < date_trunc('day', now()) + interval '1 day'
  ),
  room_chart as (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', name, 'total', total) order by total desc),
      '[]'::jsonb
    ) as data
    from (
      select coalesce(nullif(trim(comodo), ''), 'Outros') as name, sum(quantidade)::double precision as total
      from items
      group by 1
      order by total desc
      limit 6
    ) grouped_rooms
  ),
  category_chart as (
    select coalesce(
      jsonb_agg(jsonb_build_object('name', name, 'value', value) order by value desc),
      '[]'::jsonb
    ) as data
    from (
      select coalesce(nullif(trim(categoria), ''), 'Geral') as name, sum(quantidade)::double precision as value
      from items
      group by 1
      order by value desc
      limit 5
    ) grouped_categories
  ),
  expired_items as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.validade_date), '[]'::jsonb) as data
    from (
      select id, unidade_id, nome, categoria, comodo, armario, caixa, validade, validade_date, quantidade
      from items
      where validade_date < current_date
      order by validade_date asc
      limit 20
    ) row_data
  ),
  urgent_expiry_items as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.validade_date), '[]'::jsonb) as data
    from (
      select id, unidade_id, nome, categoria, comodo, armario, caixa, validade, validade_date, quantidade
      from items
      where validade_date >= current_date
        and validade_date <= current_date + 7
      order by validade_date asc
      limit 20
    ) row_data
  ),
  expiring_soon_items as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.validade_date), '[]'::jsonb) as data
    from (
      select id, unidade_id, nome, categoria, comodo, armario, caixa, validade, validade_date, quantidade
      from items
      where validade_date > current_date + 7
        and validade_date <= current_date + 30
      order by validade_date asc
      limit 20
    ) row_data
  ),
  critical_stock_items as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.quantidade asc, row_data.nome asc), '[]'::jsonb) as data
    from (
      select id, unidade_id, nome, categoria, comodo, armario, caixa, validade, validade_date, quantidade
      from items
      where quantidade <= 1
        and lower(trim(coalesce(categoria, ''))) not in (
          'ferramentas',
          'ferramenta',
          'utensilios',
          'utensílios',
          'eletrodomesticos',
          'eletrodomésticos',
          'moveis',
          'móveis',
          'eletronicos',
          'eletrônicos',
          'construcao',
          'construção'
        )
      order by quantidade asc, nome asc
      limit 8
    ) row_data
  ),
  recent_movements as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.data desc), '[]'::jsonb) as data
    from (
      select
        m.item_nome as item,
        coalesce(m.categoria, '') as categoria,
        coalesce(m.comodo, '') as comodo,
        coalesce(m.quantidade, 0)::double precision as quantidade,
        m.tipo,
        m.criado_em as data
      from public.movimentacoes_inventario m
      where m.unidade_id = p_unidade_id
      order by m.criado_em desc
      limit 30
    ) row_data
  )
  select jsonb_build_object(
    'total_skus', s.total_skus,
    'total_quantity', s.total_quantity,
    'critical_stock_count', s.critical_stock_count,
    'expired_count', s.expired_count,
    'urgent_expiry_count', s.urgent_expiry_count,
    'expiring_soon_count', s.expiring_soon_count,
    'today_activity_count', ms.today_activity_count,
    'room_chart', rc.data,
    'category_chart', cc.data,
    'expired_items', ei.data,
    'urgent_expiry_items', ui.data,
    'expiring_soon_items', si.data,
    'critical_stock_items', ci.data,
    'recent_movements', rm.data
  )
  into v_result
  from item_stats s
  cross join movement_stats ms
  cross join room_chart rc
  cross join category_chart cc
  cross join expired_items ei
  cross join urgent_expiry_items ui
  cross join expiring_soon_items si
  cross join critical_stock_items ci
  cross join recent_movements rm;

  return v_result;
end;
$$;

revoke execute on function public.get_dashboard_metrics(uuid) from public;
revoke execute on function public.get_dashboard_metrics(uuid) from anon;
grant execute on function public.get_dashboard_metrics(uuid) to authenticated;
