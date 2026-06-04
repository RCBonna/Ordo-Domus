-- Ordo Domus - Inventario por Foto: origem snapshot e metadados de triagem.
-- Bloco 1: permite rate limit/auditoria para o novo modo de IA `snapshot`.
-- Bloco 2: adiciona campos opcionais para diferenciar itens pendentes por origem sem quebrar o fluxo de cupom.

alter table public.ai_extraction_events
  drop constraint if exists ai_extraction_events_mode_check;

alter table public.ai_extraction_events
  add constraint ai_extraction_events_mode_check
  check (mode in ('text', 'audio', 'receipt', 'snapshot'));

alter table public.importacoes_pendentes
  add column if not exists origem text default 'receipt' not null;

alter table public.importacoes_pendentes
  drop constraint if exists importacoes_pendentes_origem_check;

alter table public.importacoes_pendentes
  add constraint importacoes_pendentes_origem_check
  check (origem in ('receipt', 'snapshot', 'barcode', 'video'));

alter table public.importacoes_pendentes
  add column if not exists source_hash text;

alter table public.importacoes_pendentes
  add column if not exists source_importado_em timestamp with time zone;

alter table public.importacoes_pendentes
  add column if not exists source_metadata jsonb default '{}'::jsonb not null;

alter table public.importacoes_pendentes
  add column if not exists confianca numeric;

alter table public.importacoes_pendentes
  add column if not exists validade_sugerida text;

alter table public.importacoes_pendentes
  add column if not exists comodo_sugerido text;

alter table public.importacoes_pendentes
  add column if not exists armario_sugerido text;

alter table public.importacoes_pendentes
  add column if not exists caixa_sugerida text;

create index if not exists idx_importacoes_pendentes_unidade_origem_criado
  on public.importacoes_pendentes(unidade_id, origem, criado_em desc)
  where processado = false;

create index if not exists idx_importacoes_pendentes_unidade_source_hash
  on public.importacoes_pendentes(unidade_id, source_hash, source_importado_em desc)
  where source_hash is not null;

comment on column public.importacoes_pendentes.origem
  is 'Origem da triagem pendente: receipt para cupom/NFC-e, snapshot para Inventario por Foto, barcode ou video para evolucoes futuras.';

comment on column public.importacoes_pendentes.source_metadata
  is 'Metadados nao sensiveis da origem da importacao, como contexto de local e observacoes da IA. Nao armazenar imagem bruta.';

comment on column public.importacoes_pendentes.confianca
  is 'Confianca informada pela IA para itens de Inventario por Foto, entre 0 e 1 quando disponivel.';
