# Mudancas SQL

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
