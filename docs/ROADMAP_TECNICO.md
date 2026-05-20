# Roadmap Tecnico

## Indice

1. [Prioridades](#prioridades)
2. [Fase 1 - Seguranca e Fundacao](#fase-1---seguranca-e-fundacao)
3. [Fase 2 - Qualidade e Testes](#fase-2---qualidade-e-testes)
4. [Fase 3 - Produto e Escala](#fase-3---produto-e-escala)
5. [Fase 4 - SaaS Premium](#fase-4---saas-premium)

## Prioridades

| Prioridade | Tema | Motivo |
| --- | --- | --- |
| P0 | Proteger Gemini | Evitar vazamento/abuso de chave. |
| P0 | Consolidar migrations | Evitar divergencia de schema. |
| P1 | RLS por papel | Garantir regra real para convidados. |
| P1 | Testes criticos | Reduzir regressao. |
| P2 | Tipagem de dominio | Melhorar manutencao. |
| P2 | Observabilidade | Diagnostico em producao. |

## Fase 1 - Seguranca e Fundacao

1. Criar Supabase Edge Function para Gemini.
2. Remover `VITE_GEMINI_API_KEY` do frontend. Status: implementado no repositorio, pendente limpeza do ambiente depois do deploy da Edge Function.
3. Consolidar `CriarSQL.sql` em migrations Supabase.
4. Corrigir referencias antigas `membros_unidade`.
5. Revisar policies por papel.
6. Adicionar `user_id` em movimentacoes.

## Fase 2 - Qualidade e Testes

1. Configurar Vitest.
2. Testar utilitarios e hooks.
3. Configurar Playwright.
4. Criar testes RLS/RPC em Supabase local.
5. Adicionar CI com typecheck, build e testes.

## Fase 3 - Produto e Escala

1. Melhorar triagem com acoes em massa.
2. Adicionar filtros por categoria, validade e estoque.
3. Criar notificacoes de validade.
4. Migrar `validade` para `date`.
5. Criar agregacoes server-side para dashboard.

## Fase 4 - SaaS Premium

1. Billing/planos.
2. Convites por link com expiracao.
3. Auditoria avancada por usuario.
4. Exportacao CSV/PDF.
5. Painel global com metricas historicas.
6. Backup/restore por unidade.
