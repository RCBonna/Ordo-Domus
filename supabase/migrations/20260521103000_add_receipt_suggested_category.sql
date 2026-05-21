-- Ordo Domus - Categoria sugerida por IA na importacao de cupom.
-- Bloco 1: adiciona campo opcional usado pela Triagem UI antes da efetivacao.

alter table public.importacoes_pendentes
  add column if not exists categoria_sugerida text;
