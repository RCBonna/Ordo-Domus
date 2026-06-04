# P0 Hardening - Implementacao Inicial

## Status

Implementado no repositorio e aplicado no Supabase.

## Entregas

| Item P0 | Status | Arquivos |
| --- | --- | --- |
| Remover Gemini do cliente | Implementado | `src/services/geminiService.ts`, `vite.config.ts`, `package.json` |
| Criar Edge Function Gemini | Implementado | `supabase/functions/extract-inventory/index.ts` |
| RLS por papel | Aplicado manualmente no SQL Editor | `supabase/migrations/20260519150000_harden_rls_roles.sql` |
| Consolidar fluxo de migrations | Estrutura criada | `supabase/migrations/` |

## Mudanca de Arquitetura

Antes:

```text
Browser -> @google/genai -> Gemini API
```

Depois:

```text
Browser -> Supabase Edge Function extract-inventory -> Gemini REST API
```

## Edge Function

Function:

```text
supabase/functions/extract-inventory/index.ts
```

Nome esperado no Supabase:

```text
extract-inventory
```

Secret obrigatorio:

```text
GEMINI_API_KEY
```

Configurar:

```powershell
supabase secrets set GEMINI_API_KEY=SEU_VALOR
```

Deploy:

```powershell
supabase functions deploy extract-inventory
```

## Migration RLS

Arquivo:

```text
supabase/migrations/20260519150000_harden_rls_roles.sql
```

Aplicacao planejada via CLI:

```powershell
supabase db push
```

Status real atualizado: aplicado no Supabase e reconciliado no historico de migrations. Em 2026-05-23, `supabase migration list` mostrou a baseline `20260501000000` e esta migration `20260519150000` alinhadas em Local e Remote.

Efeito principal:

- membros aprovados podem ler;
- apenas `papel = 'admin'` e `status = 'aprovado'` podem escrever em inventario, movimentacoes, importacoes pendentes e dicionario;
- RPCs administrativas passam a exigir admin aprovado;
- funcoes `SECURITY DEFINER` passam a definir `search_path = public`.

## Validacoes Locais Executadas

```powershell
npm run lint
npm run build
$env:NODE_OPTIONS='--use-system-ca'; npm audit --json
```

Resultado:

| Verificacao | Resultado |
| --- | --- |
| Typecheck | Passou |
| Build Vite | Passou |
| Audit apos remover `@google/genai` | 7 vulnerabilidades transitivas: 1 high, 6 moderate |

## Observacoes Operacionais

- A chave antiga `VITE_GEMINI_API_KEY` deve ser removida dos ambientes de frontend depois do deploy da Edge Function.
- O frontend agora invoca `supabase.functions.invoke('extract-inventory')`.
- A Edge Function valida sessao Supabase e exige que o usuario seja admin aprovado da unidade.
- A migration foi aplicada manualmente ao banco remoto pelo Supabase SQL Editor.
- O historico remoto/local foi reconciliado em 2026-05-23. Se o CLI retornar erro de autenticacao em `db push` ou `db push --dry-run`, configurar `SUPABASE_DB_PASSWORD` na sessao antes de repetir a validacao.

## Status de Producao

| Item | Status |
| --- | --- |
| Edge Function `extract-inventory` | Deployada no Supabase |
| Secret `GEMINI_API_KEY` | Configurado |
| Validacao funcional no app local | Concluida |
| SQL RLS P0 | Aplicado manualmente no SQL Editor |
