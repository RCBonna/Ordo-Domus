-- Ordo Domus - Historico de cupons importados por hash.
-- Bloco 1: persiste hashes ja importados para avisar reimportacao mesmo apos a triagem ser efetivada.

create table if not exists public.importacoes_cupons (
  id uuid primary key default gen_random_uuid(),
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  cupom_hash text not null,
  primeiro_importado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  ultimo_importado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  criado_por uuid default auth.uid(),
  atualizado_em timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint importacoes_cupons_unidade_hash_unique unique (unidade_id, cupom_hash)
);

create index if not exists idx_importacoes_cupons_unidade_hash_ultimo
  on public.importacoes_cupons(unidade_id, cupom_hash, ultimo_importado_em desc);

alter table public.importacoes_cupons enable row level security;

drop policy if exists "Admins gerenciam historico de cupons" on public.importacoes_cupons;

create policy "Admins gerenciam historico de cupons"
  on public.importacoes_cupons for all
  using (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_cupons.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.membros_unidades m
      where m.unidade_id = importacoes_cupons.unidade_id
        and m.user_id = auth.uid()
        and m.status = 'aprovado'
        and m.papel = 'admin'
    )
  );
