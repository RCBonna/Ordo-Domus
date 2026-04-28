-- ============================================================
-- Fix: Recursão infinita na política de SELECT da membros_unidade
-- Executar no SQL Editor do Supabase (supabase.com > SQL Editor)
--
-- PROBLEMA: As políticas de SELECT/UPDATE/DELETE da membros_unidade
-- faziam sub-query na própria tabela, causando recursão infinita.
--
-- SOLUÇÃO:
-- 1. Simplificar política SELECT: user só vê seus próprios registros
-- 2. Remover políticas UPDATE/DELETE recursivas
-- 3. Criar funções SECURITY DEFINER para operações de admin
-- ============================================================

-- Passo 1: Remover políticas problemáticas
DROP POLICY IF EXISTS "Ver membros da unidade" ON membros_unidade;
DROP POLICY IF EXISTS "Ver membros" ON membros_unidade;
DROP POLICY IF EXISTS "Admin atualiza membros" ON membros_unidade;
DROP POLICY IF EXISTS "Admin deleta membros" ON membros_unidade;

-- Passo 2: Criar política simples (sem sub-query recursiva)
CREATE POLICY "Ver membros da unidade"
  ON membros_unidade FOR SELECT
  USING (user_id = auth.uid());

-- Passo 3: Função para admin listar pendentes
CREATE OR REPLACE FUNCTION listar_pendentes(p_unidade_id UUID)
RETURNS TABLE (
  unidade_id UUID,
  user_id UUID,
  papel TEXT,
  status TEXT,
  adicionado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidade m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: somente administradores podem listar pendentes.';
  END IF;

  RETURN QUERY
    SELECT m.unidade_id, m.user_id, m.papel, m.status, m.adicionado_em
    FROM membros_unidade m
    WHERE m.unidade_id = p_unidade_id
    AND m.status = 'pendente';
END;
$$;

-- Passo 4: Função para admin aprovar membro
CREATE OR REPLACE FUNCTION aprovar_membro(p_unidade_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidade m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE membros_unidade
  SET status = 'aprovado'
  WHERE unidade_id = p_unidade_id
  AND user_id = p_user_id;
END;
$$;

-- Passo 5: Função para admin rejeitar membro
CREATE OR REPLACE FUNCTION rejeitar_membro(p_unidade_id UUID, p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membros_unidade m
    WHERE m.unidade_id = p_unidade_id
    AND m.user_id = auth.uid()
    AND m.papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  DELETE FROM membros_unidade
  WHERE unidade_id = p_unidade_id
  AND user_id = p_user_id;
END;
$$;
