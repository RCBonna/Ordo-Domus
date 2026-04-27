-- ============================================================
-- Fix_RLS_Membros_Select.sql
-- Executar no SQL Editor do Supabase (supabase.com > SQL Editor)
-- 
-- PROBLEMA: A política "Ver membros" só permitia ver os próprios 
-- registros. O admin não conseguia ver os convidados pendentes.
-- ============================================================

-- 1. Remover a política antiga
DROP POLICY IF EXISTS "Ver membros" ON membros_unidade;

-- 2. Criar a nova política expandida
CREATE POLICY "Ver membros"
  ON membros_unidade FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    unidade_id IN (
      SELECT unidade_id FROM membros_unidade 
      WHERE user_id = auth.uid() AND papel = 'admin'
    )
  );
