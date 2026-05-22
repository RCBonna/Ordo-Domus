# Mudancas SQL

## Observabilidade Remota

Data/hora de criacao: 2026-05-22 20:26:18 -03:00

Data/hora de modificacao: 2026-05-22 20:26:18 -03:00

Arquivo SQL:

```text
Nao houve migration SQL.
```

Necessidade:

- Registrar que a etapa de observabilidade real nao altera schema, policies, RPCs ou dados no Supabase.
- Manter o controle operacional em arquivo unico de mudancas SQL/DB, conforme padrao do projeto.

Blocos de comandos documentados:

```sql
-- Nenhum comando SQL necessario.
```

Implementacao frontend relacionada:

- `src/lib/observability.ts`: inicializacao opcional do Sentry, scrubber de PII, Error Boundary, breadcrumbs, mensagens, excecoes e spans.
- `src/lib/logger.ts`: envio remoto apenas de `warn`/`error` quando observabilidade estiver habilitada.
- `src/services/geminiService.ts`: span da Edge Function `extract-inventory`.
- `src/repositories/inventoryRepository.ts`: spans das RPCs `get_inventory_page`, `upsert_inventario` e `efetivar_importacao_cupom`.
- `src/repositories/dashboardRepository.ts`: span da RPC `get_dashboard_metrics`.

Status:

- Sem aplicacao no Supabase.
- Ativacao depende das variaveis `VITE_SENTRY_DSN`, `VITE_OBSERVABILITY_ENABLED`, `VITE_SENTRY_TRACES_SAMPLE_RATE` e `VITE_APP_VERSION`.

## Historico de Cupons Importados

Data/hora de criacao: 2026-05-22 11:30:00 -03:00

Data/hora de modificacao: 2026-05-22 19:20:49 -03:00

Arquivo SQL:

```text
supabase/migrations/20260522113000_create_receipt_import_history.sql
```

Necessidade:

- Detectar reimportacao de cupom mesmo depois que a triagem foi efetivada e as linhas de `importacoes_pendentes` foram removidas.
- Informar ao usuario a data/hora da primeira importacao conhecida daquele hash.
- Permitir reimportacao consciente por acao explicita na UI quando o usuario realmente quiser importar novamente.

Blocos de comandos documentados:

```sql
create table if not exists public.importacoes_cupons (...);

create index if not exists idx_importacoes_cupons_unidade_hash_ultimo
  on public.importacoes_cupons(unidade_id, cupom_hash, ultimo_importado_em desc);

alter table public.importacoes_cupons enable row level security;

create policy "Admins gerenciam historico de cupons"
  on public.importacoes_cupons for all
  using (... papel = 'admin' and status = 'aprovado' ...)
  with check (... papel = 'admin' and status = 'aprovado' ...);
```

Implementacao frontend relacionada:

- `src/hooks/useReceiptImport.ts`: consulta `importacoes_cupons` antes do OCR; se o hash ja existir, mostra aviso com acao `Importar novamente`.
- `src/hooks/useReceiptImport.ts`: registra o hash em `importacoes_cupons` apos salvar os itens pendentes, preservando a primeira importacao e atualizando a ultima importacao em reimportacoes conscientes.

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-22 19:20:49 -03:00.
- Validacao pos-aplicacao: `npx supabase migration list` mostra `20260522113000` em Local e Remote; `npx supabase db push --dry-run` retornou `Remote database is up to date`.

## Hash de Cupom para Duplicidade

Data/hora de criacao: 2026-05-21 11:00:00 -03:00

Data/hora de modificacao: 2026-05-21 18:49:21 -03:00

Arquivo SQL:

```text
supabase/migrations/20260521110000_add_receipt_import_hash.sql
```

Necessidade:

- Detectar que o mesmo arquivo de cupom ja foi importado enquanto ainda existe triagem pendente.
- Guardar a data/hora da importacao anterior para informar o usuario com precisao.
- Melhorar a UX de erro operacional, evitando duplicidade acidental antes de criar mais linhas em `importacoes_pendentes`.

Blocos de comandos documentados:

```sql
alter table public.importacoes_pendentes
  add column if not exists cupom_hash text;

alter table public.importacoes_pendentes
  add column if not exists cupom_importado_em timestamp with time zone default timezone('utc'::text, now()) not null;

create index if not exists idx_importacoes_pendentes_unidade_cupom_hash_importado
  on public.importacoes_pendentes(unidade_id, cupom_hash, cupom_importado_em desc)
  where cupom_hash is not null;
```

Implementacao frontend relacionada:

- `src/hooks/useReceiptImport.ts`: calcula SHA-256 do cupom comprimido e informa se o mesmo hash ja estiver pendente na unidade, exibindo data/hora da importacao anterior.

Status:

- Criado no repositorio.
- Aplicado manualmente no Supabase em 2026-05-21 18:49:21 -03:00.

## Categoria Sugerida na Importacao de Cupom

Data/hora de criacao: 2026-05-21 10:30:00 -03:00

Data/hora de modificacao: 2026-05-21 10:30:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260521103000_add_receipt_suggested_category.sql
```

Necessidade:

- Permitir que a IA sugira a categoria do item durante a leitura do cupom.
- Exibir a categoria sugerida no modal de triagem antes da efetivacao no inventario.
- Evitar que todos os itens desconhecidos cheguem sem categoria quando nao ha Smart Match no dicionario.

Blocos de comandos documentados:

```sql
alter table public.importacoes_pendentes
  add column if not exists categoria_sugerida text;
```

Implementacao frontend relacionada:

- `supabase/functions/extract-inventory/index.ts`: schema de OCR de cupom passou a exigir `categoria`.
- `src/hooks/useReceiptImport.ts`: persiste `categoria_sugerida` quando a coluna existe, com fallback se ainda nao aplicada.
- `src/hooks/useTriage.ts`: usa `categoria_sugerida` como default quando nao ha Smart Match.

Status:

- Criado no repositorio.
- Aplicado manualmente no Supabase em 2026-05-21.
- Pendente redeploy da Edge Function `extract-inventory`.

## Efetivacao Transacional de Cupom

Data/hora de criacao: 2026-05-21 10:00:00 -03:00

Data/hora de modificacao: 2026-05-21 10:00:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260521100000_receipt_import_finalize_rpc.sql
```

Necessidade:

- Efetivar item triado de cupom fiscal de forma transacional.
- Centralizar no Supabase a consolidacao entre `importacoes_pendentes`, `itens_inventario`, `movimentacoes_inventario` e `dicionario_produtos`.
- Reduzir risco de estado parcial no frontend, onde antes o item podia ser inserido no inventario, mas falhar em movimento, dicionario ou limpeza da pendencia.

Blocos de comandos documentados:

```sql
create or replace function public.efetivar_importacao_cupom (...);
select ... from public.importacoes_pendentes ... for update;
select ... from public.membros_unidades ...;
public.upsert_inventario(...);
insert into public.movimentacoes_inventario (...);
insert into public.dicionario_produtos (...) on conflict (...);
delete from public.importacoes_pendentes ...;
```

Implementacao frontend relacionada:

- `src/repositories/inventoryRepository.ts`: chamada RPC `finalizeReceiptImportItem`.
- `src/hooks/useExtraction.ts`: efetivacao de item com `triage_id` tenta a RPC antes do fallback client-side.

Status:

- Criado no repositorio.
- Aplicado manualmente no Supabase em 2026-05-21.
- Validado funcionalmente no app em 2026-05-21.
- Frontend mantem fallback para o fluxo anterior se a RPC ficar indisponivel.

## Lista de Compras Manual

Data/hora de criacao: 2026-05-20 21:15:00 -03:00

Data/hora de modificacao: 2026-05-20 21:25:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260520211500_create_shopping_list.sql
```

Necessidade:

- Permitir insercao manual de itens na Lista de Compras.
- Persistir itens por unidade para que a lista nao dependa apenas de sugestoes automaticas do inventario.
- Preparar a base para proximas etapas: marcar compra realizada, cancelar item e repor inventario.

Blocos de comandos documentados:

```sql
create table if not exists public.lista_compras (...);
create index if not exists idx_lista_compras_unidade_status ...;
create index if not exists idx_lista_compras_unidade_nome ...;
alter table public.lista_compras enable row level security;
create policy ... for select;
create policy ... for insert;
create policy ... for update;
create policy ... for delete;
```

Implementacao frontend relacionada:

- `src/repositories/shoppingRepository.ts`: leitura, criacao e cancelamento de itens manuais.
- `src/hooks/useShoppingList.ts`: carregamento de itens automaticos e manuais.
- `src/components/ShoppingList.tsx`: formulario de insercao manual e listagem de pendentes.

Status:

- Criado no repositorio.
- Aplicado manualmente no Supabase em 2026-05-20.
- Validado no app em 2026-05-20.
