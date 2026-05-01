-- ==========================================
-- CORREÇÃO: ADICIONAR COLUNAS DE SOFT DELETE E ATUALIZAR UPSERT
-- Executar no SQL Editor do Supabase
-- ==========================================

-- 1. Garantir que as colunas de soft delete existem na tabela
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS deletado_em timestamptz;
ALTER TABLE itens_inventario ADD COLUMN IF NOT EXISTS deletado_por uuid references auth.users;

-- 2. Recriar a função de upsert (agora com a garantia de que as colunas existem)
CREATE OR REPLACE FUNCTION upsert_inventario(
  p_unidade_id UUID,
  p_nome TEXT,
  p_categoria TEXT,
  p_comodo TEXT,
  p_armario TEXT DEFAULT '',
  p_caixa TEXT DEFAULT '',
  p_quantidade NUMERIC DEFAULT 1,
  p_validade TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n_nome TEXT := lower(trim(COALESCE(p_nome, '')));
  n_comodo TEXT := lower(trim(COALESCE(p_comodo, '')));
  n_armario TEXT := lower(trim(COALESCE(p_armario, '')));
  n_caixa TEXT := lower(trim(COALESCE(p_caixa, '')));
  n_validade TEXT := trim(COALESCE(p_validade, ''));
  v_quantidade NUMERIC := COALESCE(p_quantidade, 1);
  v_existing_id UUID;
  v_existing_qty NUMERIC;
  v_result RECORD;
  v_acao TEXT := 'ADD';
BEGIN
  -- Segurança: verifica se o usuário é membro aprovado da unidade
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidade
    WHERE unidade_id = p_unidade_id
    AND user_id = auth.uid()
    AND status = 'aprovado'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não é membro aprovado desta unidade.';
  END IF;

  -- Busca item existente (ignora os deletados)
  SELECT id, quantidade INTO v_existing_id, v_existing_qty
  FROM itens_inventario
  WHERE unidade_id = p_unidade_id
    AND lower(trim(COALESCE(nome, ''))) = n_nome
    AND lower(trim(COALESCE(comodo, ''))) = n_comodo
    AND lower(trim(COALESCE(armario, ''))) = n_armario
    AND lower(trim(COALESCE(caixa, ''))) = n_caixa
    AND COALESCE(validade, '') = n_validade
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- MERGE: soma as quantidades
    UPDATE itens_inventario
    SET quantidade = v_existing_qty + v_quantidade
    WHERE id = v_existing_id
    RETURNING * INTO v_result;
    v_acao := 'MERGE';
  ELSE
    -- ADD: insere novo item
    INSERT INTO itens_inventario (unidade_id, nome, categoria, comodo, armario, caixa, quantidade, validade)
    VALUES (
      p_unidade_id,
      trim(COALESCE(p_nome, '')),
      trim(COALESCE(p_categoria, '')),
      trim(COALESCE(p_comodo, '')),
      trim(COALESCE(p_armario, '')),
      trim(COALESCE(p_caixa, '')),
      v_quantidade,
      NULLIF(trim(COALESCE(p_validade, '')), '')
    )
    RETURNING * INTO v_result;
    v_acao := 'ADD';
  END IF;

  RETURN json_build_object(
    'acao', v_acao,
    'id', v_result.id,
    'nome', v_result.nome,
    'categoria', v_result.categoria,
    'comodo', v_result.comodo,
    'armario', v_result.armario,
    'caixa', v_result.caixa,
    'validade', COALESCE(v_result.validade, ''),
    'quantidade', v_result.quantidade
  );
END;
$$;
