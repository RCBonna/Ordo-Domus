-- Ordo Domus - Hash de cupom para detectar importacao duplicada pendente.
-- Bloco 1: guarda hash calculado no frontend e data/hora da importacao para informar duplicidade ao usuario.

alter table public.importacoes_pendentes
  add column if not exists cupom_hash text;

alter table public.importacoes_pendentes
  add column if not exists cupom_importado_em timestamp with time zone default timezone('utc'::text, now()) not null;

create index if not exists idx_importacoes_pendentes_unidade_cupom_hash_importado
  on public.importacoes_pendentes(unidade_id, cupom_hash, cupom_importado_em desc)
  where cupom_hash is not null;
