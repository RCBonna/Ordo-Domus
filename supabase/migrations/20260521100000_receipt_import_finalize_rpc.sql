-- Ordo Domus - Efetivacao transacional de item triado de cupom fiscal.
-- Bloco 1: RPC para consolidar uma importacao pendente em inventario, movimento e dicionario.

create or replace function public.efetivar_importacao_cupom(
  p_importacao_id uuid,
  p_nome text,
  p_categoria text,
  p_comodo text,
  p_armario text default '',
  p_caixa text default '',
  p_validade text default '',
  p_quantidade numeric default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_importacao public.importacoes_pendentes%rowtype;
  v_quantidade numeric;
  v_upsert_result json;
  v_item_id uuid;
begin
  select *
    into v_importacao
  from public.importacoes_pendentes
  where id = p_importacao_id
    and processado = false
  for update;

  if not found then
    raise exception 'Importacao pendente nao encontrada ou ja processada.';
  end if;

  if not exists (
    select 1
    from public.membros_unidades m
    where m.unidade_id = v_importacao.unidade_id
      and m.user_id = auth.uid()
      and m.status = 'aprovado'
      and m.papel = 'admin'
  ) then
    raise exception 'Acesso negado: somente administradores aprovados podem efetivar importacoes.';
  end if;

  v_quantidade := greatest(1, coalesce(p_quantidade, v_importacao.quantidade, 1));

  v_upsert_result := public.upsert_inventario(
    v_importacao.unidade_id,
    trim(coalesce(p_nome, v_importacao.nome_bruto)),
    trim(coalesce(p_categoria, '')),
    trim(coalesce(p_comodo, '')),
    trim(coalesce(p_armario, '')),
    trim(coalesce(p_caixa, '')),
    v_quantidade,
    trim(coalesce(p_validade, ''))
  );

  v_item_id := nullif(v_upsert_result->>'id', '')::uuid;

  insert into public.movimentacoes_inventario (
    unidade_id,
    item_id,
    item_nome,
    categoria,
    comodo,
    quantidade,
    tipo,
    user_id
  )
  values (
    v_importacao.unidade_id,
    v_item_id,
    coalesce(v_upsert_result->>'nome', trim(coalesce(p_nome, v_importacao.nome_bruto))),
    coalesce(v_upsert_result->>'categoria', trim(coalesce(p_categoria, ''))),
    coalesce(v_upsert_result->>'comodo', trim(coalesce(p_comodo, ''))),
    v_quantidade,
    'entrada',
    auth.uid()
  );

  insert into public.dicionario_produtos (
    unidade_id,
    nome_bruto_cupom,
    nome_oficial_inventario,
    categoria,
    comodo
  )
  values (
    v_importacao.unidade_id,
    v_importacao.nome_bruto,
    coalesce(v_upsert_result->>'nome', trim(coalesce(p_nome, v_importacao.nome_bruto))),
    coalesce(v_upsert_result->>'categoria', trim(coalesce(p_categoria, ''))),
    coalesce(v_upsert_result->>'comodo', trim(coalesce(p_comodo, '')))
  )
  on conflict (unidade_id, nome_bruto_cupom)
  do update set
    nome_oficial_inventario = excluded.nome_oficial_inventario,
    categoria = excluded.categoria,
    comodo = excluded.comodo;

  delete from public.importacoes_pendentes
  where id = p_importacao_id;

  return jsonb_set(v_upsert_result::jsonb, '{quantidade}', to_jsonb(v_quantidade))::json;
end;
$$;
