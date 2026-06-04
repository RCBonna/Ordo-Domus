# Revisao v1 - Perfil de Usuario e Exibicao de Nome/E-mail

Criado em: 2026-06-03 20:52:15 -03:00
Modificado em: 2026-06-03 21:13:29 -03:00
Escopo: revisao do plano inicial `plans/implementation_plan_name.md`, avaliacao da issue GitHub #24 e consolidacao tecnica sem implementacao.

## Estado das issues no GitHub

Consulta realizada com:

```powershell
gh issue list --limit 100 --state open --json number,title,state,labels,createdAt,updatedAt,assignees,url
gh issue list --limit 100 --state all --json number,title,state,labels,createdAt,updatedAt,closedAt,url
gh issue view 24 --json number,title,state,body,comments,labels,createdAt,updatedAt,url
```

Resultado em 2026-06-03:

- Issues abertas: 1.
- Issue aberta atual: #24, "Melhoria - Exibir nome e e-mail dos membros da unidade".
- Issues #1 a #23 constam fechadas.
- As issues #15 a #20, criadas como backlog tecnico recente, tambem constam fechadas.

## Arquivos avaliados

- `plans/implementation_plan_name.md`
- `plans/implementation_plan_name-v1.md`
- `src/components/AdminPanel.tsx`
- `src/components/Onboarding.tsx`
- `src/hooks/useAuth.ts`
- `src/types/domain.ts`
- `supabase/migrations/20260519150000_harden_rls_roles.sql`
- `supabase/migrations/20260523143000_saas_admin_dashboard_details.sql`
- `docs/supabase/SQL_MUDANCAS.md`

## Issue #24 - diagnostico

Problema:

- O modal `Acesso a Unidade`, renderizado por `src/components/AdminPanel.tsx`, mostra membros e solicitacoes usando `user_id` truncado.
- Isso impede o administrador de identificar pessoas por informacoes humanas.

Estado atual observado no codigo:

- `AdminPanel` define `UnitMember` apenas com `unidade_id`, `user_id`, `papel`, `status` e `adicionado_em`.
- `AdminPanel` chama `listar_membros` e usa `listar_pendentes` como fallback.
- As RPCs `listar_membros` e `listar_pendentes`, em `supabase/migrations/20260519150000_harden_rls_roles.sql`, retornam apenas dados da tabela `membros_unidades`.
- O onboarding atual solicita nome da unidade, mas nao solicita nome do usuario.
- Ja existe uso de `auth.users.email` em `get_saas_admin_snapshot`, mas isso e restrito ao super-admin e nao resolve o fluxo de admin de unidade.

## Avaliacao do plano inicial

O plano inicial esta tecnicamente bem direcionado. Ele acerta ao propor uma tabela publica de perfil, trigger ligada ao Supabase Auth, atualizacao das RPCs e mudanca do `AdminPanel` para priorizar nome/e-mail.

Pontos a preservar:

- Usar migration nova em `supabase/migrations/`.
- Registrar tudo em `docs/supabase/SQL_MUDANCAS.md`.
- Criar `public.perfis` como fonte canonica de dados humanos do usuario.
- Manter `nome` inicialmente nullable para compatibilidade com usuarios existentes.
- Atualizar `listar_membros` e `listar_pendentes` com `JOIN` em `public.perfis`.
- Cobrir o fluxo com teste E2E ou teste equivalente.

Pontos a corrigir antes de executar:

- A nomenclatura deve ser fechada como `public.perfis`, nao deixar a decisao aberta entre `public.usuarios` e `public.perfis`.
- Nao recomendo leitura global autenticada de todos os perfis. Para um app multiunidade, o melhor padrao e leitura restrita por proprio usuario, unidade em comum ou RPC autorizada.
- A coleta de nome no `Onboarding` pode funcionar, mas nao deve bloquear indevidamente usuarios legados. Recomendo combinar fallback visual com uma tela/modal de perfil editavel.
- As RPCs devem preservar compatibilidade operacional: retorno com campos novos (`nome`, `email`) e mesmo filtro de admin aprovado.
- A estrategia de testes deve considerar que o projeto ja tem Playwright, Vitest e E2E autenticado configurados.

## Plano recomendado

### Fase 1 - Perfil canonico

Criar a fonte canonica de perfil de usuario.

Recomendacao:

- Criar `public.perfis`.
- Usar `id uuid primary key references auth.users(id)`.
- Guardar `nome text`, `email text`, `criado_em timestamptz`, `atualizado_em timestamptz`.
- Criar trigger em `auth.users` para preencher `public.perfis` no cadastro.
- Usar `security definer` com `search_path` explicito.
- Manter `email` como snapshot operacional, pois `auth.users` nao deve ser exposto diretamente para consultas comuns de produto.
- Criar rotina idempotente de backfill para usuarios existentes a partir de `auth.users`, executada dentro da migration com cuidado de permissao.

### Fase 2 - RLS e superficie SQL

Recomendacao:

- Ativar RLS em `public.perfis`.
- Permitir que o usuario leia e atualize o proprio perfil.
- Permitir que admin aprovado de uma unidade leia perfil de usuarios vinculados a mesma unidade, incluindo pendentes daquela unidade.
- Atualizar `listar_membros` e `listar_pendentes` para retornar `nome` e `email`.
- Evitar consulta direta a `auth.users` fora de RPCs administrativas.
- Garantir que `listar_pendentes` continue retornando somente pendentes e `listar_membros` continue retornando todos os membros da unidade.
- Preferir que o `AdminPanel` consuma apenas as RPCs; evitar consulta direta do frontend em `public.perfis` para listas administrativas.
- Registrar comandos e decisoes em `docs/supabase/SQL_MUDANCAS.md`.
- Aplicar migration no Supabase depois de revisada, conforme instrucao local do projeto.

### Fase 3 - Frontend

Recomendacao:

- Atualizar o tipo de membro para incluir `nome?: string | null` e `email?: string | null`.
- Mover o tipo de membro administrativo para `src/types/domain.ts` ou para um modulo de dominio/repository, evitando contrato local solto no componente.
- Criar helper de apresentacao, por exemplo:
  - nome principal: `nome`, quando existir;
  - apoio: `email`, quando existir;
  - fallback final: UUID truncado.
- Atualizar pendentes e aprovados no `AdminPanel` com o mesmo padrao visual.
- Pedir o nome do usuario em ponto apropriado:
  - preferencia: tela/perfil simples de usuario;
  - alternativa inicial: onboarding antes de criar unidade ou solicitar acesso.
- Se `useAuth` passar a expor perfil, manter contrato pequeno: `currentUserProfile` e `refreshProfile`, sem acoplar todos os componentes a tabela `perfis`.
- Reavaliar o fallback para `listar_pendentes`: se `listar_membros` esta consolidada e testada, o fallback pode mascarar erros de contrato e deve ser removido ou limitado a ambientes legados.

### Fase 4 - Testes

Recomendacao:

- Teste E2E autenticado validando que admin visualiza nome/e-mail de membro pendente ou aprovado.
- Teste de fallback quando `nome` esta ausente.
- Teste SQL/RPC, se a suite Supabase local estiver ativa, para garantir que convidado nao lista perfis indevidos.
- Teste unitario simples para helper de apresentacao de membro, cobrindo nome, email e UUID.
- Rodar pelo menos:

```powershell
npm run lint
npm test
npm run build
npm run test:e2e
```

## Melhorias arquiteturais associadas

- Extrair um tipo de dominio para membros de unidade em `src/types/domain.ts`, em vez de manter o contrato apenas dentro do `AdminPanel`.
- Considerar um pequeno repositorio/servico para administracao de membros, seguindo o padrao ja usado no inventario.
- Manter as RPCs como fronteira de autorizacao para dados sensiveis de membros.
- Evitar que componentes de UI conhecam detalhes de fallback SQL.

## Melhorias de UX e design

- Em cards de membro, exibir:
  - linha principal: nome ou "Usuario sem nome";
  - linha secundaria: e-mail ou ID reduzido;
  - badge de papel/status.
- Para solicitacoes pendentes, trocar o rotulo "ID do Solicitante" por "Solicitante" quando houver nome/e-mail.
- Para pendentes, manter a acao primaria "Aprovar" visualmente clara.
- Em mobile, garantir que e-mail longo use truncate e tooltip/title, sem quebrar botoes de acao.
- Usar icones ja existentes de `lucide-react`, sem criar SVG manual.

## Decisoes recomendadas

- Nome da tabela: `public.perfis`.
- Leitura de perfil: restrita por proprio usuario/unidade em comum/RPC autorizada, nao global autenticada.
- Email: snapshot em `public.perfis.email`, sincronizado no cadastro e preservado como dado operacional.
- Nome: editavel pelo proprio usuario; nullable para legado, mas UX deve incentivar preenchimento.
- Admin de unidade: deve identificar pendentes e aprovados via RPC, sem acesso amplo a usuarios fora da unidade.

## Ordem de execucao proposta

1. Migration `public.perfis` + RLS + trigger.
2. Atualizacao das RPCs `listar_membros` e `listar_pendentes`.
3. Atualizacao de tipos e renderizacao do `AdminPanel`.
4. Entrada/edicao de nome de usuario.
5. Testes automatizados.
6. Atualizacao da issue #24 com evidencia e fechamento apos validacao.

## Observacoes

- Nao foi feita implementacao neste diagnostico.
- Nao foi aplicada migration.
- Nao foi atualizada issue no GitHub.
- O arquivo inicial foi localizado em `plans/implementation_plan_name.md`.
- Esta v1 passa a ser a revisao consolidada recomendada para orientar a execucao da issue #24.
