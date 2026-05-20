# P1 Reliability - Implementacao Inicial

## Status

Implementado no repositorio. A migration de banco foi aplicada manualmente no Supabase.

## Entregas

| Item P1 | Status | Arquivos |
| --- | --- | --- |
| Reduzir supply chain risk | Implementado | `package.json`, `package-lock.json`, `src/shadcn-tailwind.css`, `src/index.css` |
| Remover dependencias nao usadas | Implementado | Removidos `shadcn`, `express`, `dotenv`, `@types/express` |
| Auditoria por usuario em movimentacoes | Implementado no codigo, migration aplicada manualmente | `supabase/migrations/20260519162000_add_user_id_to_movements.sql`, `src/hooks/useInventory.ts`, `src/hooks/useExtraction.ts` |
| Testes unitarios minimos | Implementado | `src/lib/utils.test.ts`, script `npm test` |
| CI minimo | Implementado | `.github/workflows/ci.yml` |

## Supply Chain

Antes do P1, apos P0, o audit ainda indicava vulnerabilidades transitivas relacionadas principalmente a dependencias de CLI/tooling.

Mudancas:

- `shadcn` removido como dependencia runtime.
- CSS exportado por `shadcn/tailwind.css` foi copiado para `src/shadcn-tailwind.css`.
- `express`, `dotenv` e `@types/express` removidos por nao terem uso no app atual.

Validacao esperada:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npm audit
```

## Auditoria por Usuario

Migration:

```text
supabase/migrations/20260519162000_add_user_id_to_movements.sql
```

Ela adiciona:

```sql
user_id uuid references auth.users(id)
```

em:

```text
public.movimentacoes_inventario
```

Tambem adiciona indices para consulta por usuario.

## Aplicacao no Supabase

Status: aplicado manualmente pelo SQL Editor.

Como o `db push` ainda esta com historico/conexao a reconciliar, permanecem duas alternativas para proximas migrations:

1. Aplicar a migration pelo SQL Editor.
2. Reconciliar migrations e aplicar via CLI.

SQL a aplicar manualmente:

```sql
alter table public.movimentacoes_inventario
  add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_movimentacoes_user_id
  on public.movimentacoes_inventario(user_id);

create index if not exists idx_movimentacoes_unidade_user_criado
  on public.movimentacoes_inventario(unidade_id, user_id, criado_em desc);
```

## CI

Workflow:

```text
.github/workflows/ci.yml
```

Executa:

```text
npm ci
npm run lint
npm test
npm run build
npm audit --audit-level=high
```
