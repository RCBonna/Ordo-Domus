# Observabilidade

## Indice

1. [Estado Atual](#estado-atual)
2. [Logs](#logs)
3. [Metricas](#metricas)
4. [Auditoria](#auditoria)
5. [Alertas](#alertas)
6. [Plano Recomendado](#plano-recomendado)

## Estado Atual

Observabilidade atual e baseada em:

- `src/lib/logger.ts` para logs client-side sanitizados apenas em desenvolvimento;
- toasts para usuario;
- tabela `movimentacoes_inventario` para eventos de inventario.

Nao ha Sentry, OpenTelemetry, Logflare configurado explicitamente, dashboards de erros ou alertas.

## Logs

Logs sensiveis de autenticacao, cupom, IA e inventario foram removidos ou sanitizados em P2.4.

Risco residual: ainda falta observabilidade remota com scrubber formal de PII.

## Metricas

Metricas desejadas:

| Metrica | Fonte |
| --- | --- |
| Tempo de extracao Gemini | Edge Function futura ou frontend instrumentation. |
| Taxa de erro Gemini | Service/Edge Function. |
| Tempo de `upsert_inventario` | Postgres/Edge logs. |
| Itens por unidade | SQL agregada. |
| Pendencias expiradas | `importacoes_pendentes`. |
| Eventos por tipo | `movimentacoes_inventario`. |

## Auditoria

Atual:

- movimentos com item, categoria, comodo, quantidade e tipo.

Falta:

- `user_id`;
- IP/device;
- origem (`texto`, `audio`, `cupom`, `manual`);
- payload antes/depois para edicao;
- correlation id.

## Alertas

Alertas recomendados:

- aumento de erros Gemini;
- RPC `upsert_inventario` acima de 2s p95;
- falhas RLS inesperadas;
- crescimento de `importacoes_pendentes` expiradas;
- falhas de login acima do normal;
- custo Gemini por dia.

## Plano Recomendado

1. Adicionar Sentry para erro frontend.
2. Criar Edge Function Gemini com logs estruturados.
3. Adicionar tabela `audit_events`.
4. Adicionar `user_id` em movimentacoes.
5. Criar dashboards Supabase para metricas SQL.
6. Definir playbooks em [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).
