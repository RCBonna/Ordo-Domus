# P2.4 - Remocao de Logs Sensiveis

## Indice

1. [Resumo](#resumo)
2. [Escopo Implementado](#escopo-implementado)
3. [Logger Controlado](#logger-controlado)
4. [Logs Removidos ou Sanitizados](#logs-removidos-ou-sanitizados)
5. [Validacoes Executadas](#validacoes-executadas)
6. [Pendencias](#pendencias)

## Resumo

Foi removido o uso direto de `console.*` em hooks e componentes para evitar vazamento de dados sensiveis no navegador. Logs que antes expunham email, user id, itens extraidos por IA, linhas de cupom, respostas completas do Supabase e payloads de inventario foram substituidos por mensagens sanitizadas via logger central.

## Escopo Implementado

| Frente | Status | Resultado |
| --- | --- | --- |
| Logger central | Implementado | `src/lib/logger.ts`. |
| Logs de IA/extracao | Sanitizados | Removidos payloads de inventario e resultados de RPC. |
| Logs de cupom fiscal | Sanitizados | Removidos itens extraidos, linhas inseridas, user id e resposta completa. |
| Logs de autenticacao | Sanitizados | Removido email e detalhes brutos de erro. |
| Logs de inventario | Sanitizados | Hooks registram apenas falha operacional sem payload. |
| Logs diretos | Removidos | `console.*` direto restou apenas no logger central. |

## Logger Controlado

Arquivo:

```text
src/lib/logger.ts
```

Comportamento:

- emite logs apenas em `import.meta.env.DEV`;
- nao aceita objeto/payload arbitrario;
- padroniza mensagens;
- evita vazamento em build de producao.

## Logs Removidos ou Sanitizados

| Area | Risco anterior | Correcao |
| --- | --- | --- |
| `useExtraction` | Payload de item, transcricao, resposta de RPC e erros brutos. | Mensagens genericas via `logger`. |
| `useReceiptImport` | Linhas do cupom, user id, resposta completa e erro bruto. | Mensagens sanitizadas via `logger`. |
| `useAuth` | Email de sessao e eventos detalhados. | Mensagens sem PII. |
| `Auth` | Email submetido e mensagens brutas de auth. | Logs sem email/senha/payload. |
| `useInventory` | Erros brutos em mutacoes de inventario. | Mensagens operacionais sem payload. |
| `useTriage` | Quantidades/matches e erros brutos. | Mensagens genericas. |
| `Onboarding`, `GuestView`, `SaasAdminDashboard` | Erros brutos do Supabase. | Mensagens sanitizadas. |

## Validacoes Executadas

| Comando | Resultado |
| --- | --- |
| `npm run lint` | Passou. |
| `npm test` | Passou: 1 arquivo, 7 testes. |
| `npm run build` | Passou. |
| `npm audit --audit-level=high` | Passou: 0 vulnerabilidades. |
| `rg "console\\.(log\\|warn\\|error\\|debug\\|info)" src -n` | Apenas `src/lib/logger.ts`. |

## Pendencias

1. Integrar Sentry ou ferramenta equivalente para erros client-side com scrubber de PII.
2. Definir taxonomia de eventos observaveis.
3. Criar correlacao de erros Edge Function + frontend sem registrar payload sensivel.
