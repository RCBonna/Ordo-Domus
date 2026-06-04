-- Ordo Domus - Historico generico de fontes importadas por hash.
-- Bloco 1: persiste hashes de Inventario por Foto para avisar reimportacao
-- mesmo apos a triagem ser efetivada, descartada ou expirada.

create table if not exists public.importacoes_fontes (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  origem text not null,
  source_hash text not null,
  primeiro_importado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  ultimo_importado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_por uuid default auth.uid(),
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb not null,
  constraint importacoes_fontes_origem_check check (origem in ('snapshot', 'barcode', 'video')),
  constraint importacoes_fontes_unidade_origem_hash_unique unique (unidade_id, origem, source_hash)
);

create index if not exists idx_importacoes_fontes_unidade_origem_hash_ultimo
  on public.importacoes_fontes(unidade_id, origem, source_hash, ultimo_importado_em desc);

alter table public.importacoes_fontes enable row level security;

drop policy if exists "Admins gerenciam historico de fontes importadas" on public.importacoes_fontes;

create policy "Admins gerenciam historico de fontes importadas"
  on public.importacoes_fontes for all
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_fontes.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_fontes.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );

comment on table public.importacoes_fontes
  is 'Historico de fontes ja importadas por hash para avisar reimportacao de Inventario por Foto e evolucoes futuras.';
