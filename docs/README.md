# Ordo Domus - Indice Mestre de Documentacao

## Visao Geral

Esta pasta consolida a documentacao tecnica do projeto Ordo Domus, gerada a partir da analise do codigo-fonte, scripts SQL, configuracoes de build e documentos de brainstorming existentes no repositorio.

O Ordo Domus e um sistema web de inventario domestico multiunidade, com autenticacao Supabase, controle de membros por unidade, inventario com historico de movimentacoes, entrada por texto/voz usando Gemini, importacao de cupom fiscal por imagem e dashboard operacional.

## Documentos Principais

| Documento | Descricao |
| --- | --- |
| [README_EXECUTIVO.md](README_EXECUTIVO.md) | Resumo executivo, objetivo, funcionalidades, stack e visao macro. |
| [ARQUITETURA_COMPLETA.md](ARQUITETURA_COMPLETA.md) | Arquitetura, camadas, responsabilidades, dependencias e padroes. |
| [REGRAS_NEGOCIO.md](REGRAS_NEGOCIO.md) | Regras de negocio, validacoes, processos e comportamentos criticos. |
| [FRONTEND_ANALISE.md](FRONTEND_ANALISE.md) | Estrutura React, componentes, hooks, estado, rotas logicas e UI. |
| [BACKEND_ANALISE.md](BACKEND_ANALISE.md) | Backend efetivo via Supabase, RPCs, RLS, autenticacao e erros. |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Contratos de API Supabase/PostgREST/RPC em formato inspirado em OpenAPI. |
| [DATABASE_ANALISE.md](DATABASE_ANALISE.md) | Entidades, tabelas, relacionamentos, indices, dicionario de dados e MER textual. |
| [SECURITY_ANALISE.md](SECURITY_ANALISE.md) | Avaliacao de autenticacao, autorizacao, secrets, LGPD, OWASP e riscos. |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Variaveis de ambiente, build, publicacao, rollback e operacao. |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md) | Testes existentes, lacunas, recomendacoes unitarias/integracao/E2E. |
| [testing/E2E_AUTHENTICATED.md](testing/E2E_AUTHENTICATED.md) | Configuracao local/CI dos testes Playwright autenticados com seed controlado. |
| [REQUIREMENTS_SPECIFICATION.md](REQUIREMENTS_SPECIFICATION.md) | Requisitos funcionais, nao funcionais, tecnicos, premissas e restricoes. |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Integracoes externas: Supabase, Gemini, browser APIs e hospedagem. |

## Analises Complementares

| Documento | Descricao |
| --- | --- |
| [ROADMAP_TECNICO.md](ROADMAP_TECNICO.md) | Roadmap tecnico priorizado para evolucao do produto. |
| [TECH_DEBT.md](TECH_DEBT.md) | Debitos tecnicos, riscos e acoes de saneamento. |
| [PERFORMANCE_ANALISE.md](PERFORMANCE_ANALISE.md) | Gargalos, indices, bundle, consultas e recomendacoes. |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Logs, metricas, tracing, auditoria e alertas recomendados. |
| [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) | Playbooks de incidentes e procedimentos operacionais. |
| [AUDITORIA_MULTIDISCIPLINAR_COMPLETA.md](AUDITORIA_MULTIDISCIPLINAR_COMPLETA.md) | Revisao multidisciplinar profunda com riscos, vulnerabilidades, roadmaps e recomendacoes. |

## Areas

| Pasta | Conteudo |
| --- | --- |
| [architecture](architecture/README.md) | Resumo arquitetural e links relacionados. |
| [backend](backend/README.md) | Backend Supabase, RPCs e responsabilidades server-side. |
| [frontend](frontend/README.md) | UI React, componentes e hooks. |
| [api](api/README.md) | Superficie de API e contratos. |
| [database](database/README.md) | Modelo relacional e governanca de dados. |
| [security](security/README.md) | Seguranca, RLS, LGPD e OWASP. |
| [deploy](deploy/README.md) | Build, deploy e configuracao de ambiente. |
| [business-rules](business-rules/README.md) | Regras funcionais e operacionais. |
| [flows](flows/README.md) | Fluxos de autenticacao, entrada, consumo e triagem. |
| [diagrams](diagrams/README.md) | Diagramas Mermaid. |
| [testing](testing/README.md) | Estrategia de testes. |
| [requirements](requirements/README.md) | Requisitos e escopo. |
| [integrations](integrations/README.md) | Servicos externos e contratos de integracao. |
| [supabase](supabase/README.md) | Setup seguro do Supabase CLI e fluxo de migrations versionadas. |
| [supabase/P0_HARDENING_IMPLEMENTATION.md](supabase/P0_HARDENING_IMPLEMENTATION.md) | Status da implementacao P0: Edge Function Gemini e RLS por papel. |
| [supabase/P1_RELIABILITY_IMPLEMENTATION.md](supabase/P1_RELIABILITY_IMPLEMENTATION.md) | Status da implementacao P1: auditabilidade, CI, testes e supply chain. |
| [supabase/P1_AI_RATE_LIMIT_IMPLEMENTATION.md](supabase/P1_AI_RATE_LIMIT_IMPLEMENTATION.md) | Status da implementacao P1: rate limit e validacao de payload da Edge Function de IA. |
| [supabase/P2_TYPES_PERFORMANCE_IMPLEMENTATION.md](supabase/P2_TYPES_PERFORMANCE_IMPLEMENTATION.md) | Status da implementacao P2: tipagem, memoizacao e validade normalizada. |
| [supabase/P2_1_DASHBOARD_RPC_IMPLEMENTATION.md](supabase/P2_1_DASHBOARD_RPC_IMPLEMENTATION.md) | Status da implementacao P2.1: RPCs server-side para dashboard. |
| [supabase/P2_2_INVENTORY_SERVER_SIDE_PAGINATION.md](supabase/P2_2_INVENTORY_SERVER_SIDE_PAGINATION.md) | Status da implementacao P2.2: paginacao e filtros server-side no inventario. |
| [supabase/P2_3_REPOSITORY_SERVICE_LAYER.md](supabase/P2_3_REPOSITORY_SERVICE_LAYER.md) | Status da implementacao P2.3: camada inicial de repository/service. |
| [supabase/P2_4_SAFE_LOGGING.md](supabase/P2_4_SAFE_LOGGING.md) | Status da implementacao P2.4: remocao de logs sensiveis. |
| [security/AI_PRIVACY_CONSENT.md](security/AI_PRIVACY_CONSENT.md) | Consentimento local e retencao dos fluxos de IA por texto, audio e cupom. |

## Diagramas Mermaid

- [Arquitetura](diagrams/architecture.mmd)
- [Fluxo de Autenticacao](diagrams/auth-flow.mmd)
- [Fluxo Principal](diagrams/main-flow.mmd)
- [Banco de Dados](diagrams/database-er.mmd)
- [Integracoes](diagrams/integrations.mmd)
- [Sequencia de Chamadas](diagrams/sequence-calls.mmd)

## Observacoes de Consistencia

- O backend nao e um servidor Express proprio; a dependencia `express` existe no `package.json`, mas nao ha entrypoint de backend Node no codigo analisado.
- O backend efetivo e Supabase: Auth, PostgREST, RLS e funcoes RPC em PL/pgSQL.
- Existem scripts SQL historicos que usam `membros_unidade` no singular, enquanto o schema consolidado e o frontend usam `membros_unidades` no plural. Este e um debito tecnico documentado.
- P0 Gemini foi mitigado no repositorio: o frontend chama a Edge Function `extract-inventory`. A remocao operacional de `VITE_GEMINI_API_KEY` depende do deploy da function e configuracao do secret `GEMINI_API_KEY` no Supabase.
- P2 iniciou a normalizacao de `validade`: o campo textual foi mantido para compatibilidade, e a migration nova adiciona `validade_date` para consultas e indices.
- P2.1 adicionou RPC server-side para dashboard com fallback local no frontend. A migration foi aplicada manualmente no Supabase.
- P2.2 adicionou paginacao e filtros server-side no inventario. A migration de indices foi aplicada manualmente no Supabase.
- P2.3 iniciou a camada de repository/service no dominio de inventario, separando hooks, persistencia e regras com auditoria.
- P2.4 removeu logs sensiveis de hooks/componentes e centralizou logs dev-only em `src/lib/logger.ts`.
- P2 de privacidade adicionou consentimento local antes de chamadas de IA por texto, audio ou cupom.
