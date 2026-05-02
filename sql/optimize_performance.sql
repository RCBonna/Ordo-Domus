-- 🚀 Otimização de Performance para Ordo Domus
-- Este script adiciona índices funcionais para acelerar as buscas do RPC upsert_inventario
-- e corrige potenciais gargalos em tabelas com muitos itens.

-- 1. Índices funcionais para busca case-insensitive (usados no RPC)
-- Isso evita o Full Table Scan que o lower(trim(COALESCE(...))) causava.
CREATE INDEX IF NOT EXISTS idx_itens_unidade_nome_lower ON itens_inventario (unidade_id, lower(trim(nome)));
CREATE INDEX IF NOT EXISTS idx_itens_unidade_comodo_lower ON itens_inventario (unidade_id, lower(trim(comodo)));
CREATE INDEX IF NOT EXISTS idx_itens_unidade_armario_lower ON itens_inventario (unidade_id, lower(trim(armario)));
CREATE INDEX IF NOT EXISTS idx_itens_unidade_caixa_lower ON itens_inventario (unidade_id, lower(trim(caixa)));

-- 2. Índice composto para a busca exata no RPC (Acelera a verificação de duplicatas)
CREATE INDEX IF NOT EXISTS idx_itens_upsert_lookup ON itens_inventario (
  unidade_id, 
  lower(trim(nome)), 
  lower(trim(comodo)), 
  lower(trim(armario)), 
  lower(trim(caixa)), 
  validade
) WHERE deletado_em IS NULL;

-- 3. Otimização de busca por validade (usada no Dashboard)
CREATE INDEX IF NOT EXISTS idx_itens_validade ON itens_inventario (unidade_id, validade) WHERE validade IS NOT NULL;

-- 4. Sugestão: Estatísticas do Postgres
-- Rodar ANALYZE ajuda o otimizador a escolher os novos índices.
ANALYZE itens_inventario;
ANALYZE membros_unidade;
