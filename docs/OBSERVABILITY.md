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

- `src/lib/observability.ts` para telemetria remota opcional via Sentry;
- `src/lib/logger.ts` para logs client-side em desenvolvimento e envio remoto de `warn`/`error` quando habilitado;
- Error Boundary global no bootstrap React;
- breadcrumbs e spans nos fluxos de extracao por IA, inventario, efetivacao de cupom e dashboard;
- toasts para usuario;
- tabela `movimentacoes_inventario` para eventos de inventario.

A telemetria remota fica desligada por padrao. Ela so e ativada quando `VITE_SENTRY_DSN` estiver preenchida e `VITE_OBSERVABILITY_ENABLED` nao for `false`.

## Logs

Logs sensiveis de autenticacao, cupom, IA e inventario foram removidos ou sanitizados em P2.4.

O envio remoto passa por scrubber antes do Sentry receber o evento:

- emails sao substituidos por `[email]`;
- UUIDs sao substituidos por `[uuid]`;
- sequencias numericas longas sao substituidas por `[number]`;
- chaves sensiveis como `authorization`, `cookie`, `password`, `token`, `imageBase64`, `audioBase64`, `text` e `transcricao` sao substituidas por `[redacted]`;
- usuario do Sentry recebe apenas `id`, sem email.

## Metricas

Metricas instrumentadas no frontend:

| Metrica | Fonte |
| --- | --- |
| Tempo de extracao Gemini | Span `extract-inventory` em `src/services/geminiService.ts`. |
| Taxa de erro Gemini | Excecoes capturadas pelo Error Boundary, logger e falhas da chamada Edge Function. |
| Tempo de `upsert_inventario` | Span RPC em `src/repositories/inventoryRepository.ts`. |
| Tempo de `efetivar_importacao_cupom` | Span RPC em `src/repositories/inventoryRepository.ts`. |
| Tempo de `get_inventory_page` | Span RPC com filtros booleanos e paginacao sem termos sensiveis. |
| Tempo de `get_dashboard_metrics` | Span RPC em `src/repositories/dashboardRepository.ts`. |
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

- aumento de erros na Edge Function `extract-inventory`;
- RPC `upsert_inventario` acima de 2s p95;
- RPC `efetivar_importacao_cupom` acima de 2s p95;
- falhas RLS inesperadas;
- falha ou queda para zero inesperada no job `cleanup-expired-pending-imports`;
- crescimento de `importacoes_pendentes` expiradas mesmo apos o cron;
- falhas de login acima do normal;
- custo Gemini por dia.

## Plano Recomendado

1. Configurar projeto Sentry por ambiente e preencher `VITE_SENTRY_DSN`.
2. Criar Edge Function Gemini com logs estruturados.
3. Adicionar tabela `audit_events`.
4. Adicionar `user_id` em movimentacoes.
5. Criar dashboards Supabase para metricas SQL.
6. Definir playbooks em [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md).

## Configuracao

Variaveis:

```env
VITE_SENTRY_DSN=
VITE_OBSERVABILITY_ENABLED=false
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_APP_VERSION=local
```

Regras:

- sem `VITE_SENTRY_DSN`, nao ha envio remoto;
- `VITE_OBSERVABILITY_ENABLED=false` forca desligamento;
- `VITE_SENTRY_TRACES_SAMPLE_RATE` controla amostragem de spans;
- `VITE_APP_VERSION` deve receber tag, SHA ou versao de release no deploy.
