# Mudancas SQL

## Lista de Compras Manual

Data/hora de criacao: 2026-05-20 21:15:00 -03:00

Data/hora de modificacao: 2026-05-20 21:16:00 -03:00

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
- Pendente de aplicacao manual no Supabase antes de usar a insercao manual no ambiente remoto.
