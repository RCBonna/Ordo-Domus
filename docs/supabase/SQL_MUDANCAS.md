# Mudancas SQL

## Perfis de Usuario para Membros da Unidade

Data/hora de criacao: 2026-06-06 10:30:00 -03:00

Data/hora de modificacao: 2026-06-06 10:30:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260606103000_user_profiles_for_unit_members.sql
```

Necessidade:

- Atender a issue GitHub #24 exibindo nome e e-mail de membros aprovados e solicitantes pendentes no painel administrativo da unidade.
- Evitar que o frontend consulte `auth.users` diretamente.
- Manter `listar_membros` e `listar_pendentes` como fronteiras de autorizacao para admins aprovados da unidade.
- Preservar `user_id` como fallback tecnico quando perfil estiver incompleto.

Blocos de comandos documentados:

```sql
create table if not exists public.perfis (...);
create or replace function public.set_updated_at_perfis() ...;
create trigger set_updated_at_perfis ...;
create or replace function public.sync_auth_user_profile() ...;
create trigger on_auth_user_profile_sync ...;
insert into public.perfis (...) select ... from auth.users ...;
alter table public.perfis enable row level security;
create policy "Usuario le proprio perfil" ...;
create policy "Usuario atualiza proprio perfil" ...;
create policy "Usuario cria proprio perfil" ...;
drop function if exists public.listar_pendentes(uuid);
create function public.listar_pendentes(p_unidade_id uuid) returns table (..., nome text, email text) ...;
drop function if exists public.listar_membros(uuid);
create function public.listar_membros(p_unidade_id uuid) returns table (..., nome text, email text) ...;
```

Implementacao relacionada:

- `src/components/AdminPanel.tsx`: membros e solicitantes passam a priorizar nome/e-mail e usar `user_id` truncado como fallback.
- `src/components/Onboarding.tsx`: novo usuario informa nome de exibicao antes de criar unidade ou solicitar acesso.
- `scripts/e2e/seed.ts`: seed autenticado passa a garantir perfil E2E quando a tabela existir.
- `tests/e2e/authenticated-workflows.spec.ts`: fluxo admin valida exibicao de nome/e-mail do membro seed.

Status:

- Criado no repositorio em 2026-06-06.
- Validado antes da aplicacao com `npm run supabase:migrations:dry-run`: apenas `20260606103000_user_profiles_for_unit_members.sql` seria enviada.
- Aplicado no Supabase em 2026-06-06 com `npm run supabase:migrations:push`.
- Validacao pos-aplicacao com `npm run supabase:migrations:dry-run`: `Remote database is up to date`.

## Historico de Fontes Importadas - Inventario por Foto

Data/hora de criacao: 2026-06-04 12:05:00 -03:00

Data/hora de modificacao: 2026-06-04 12:12:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260604120500_create_import_source_history.sql
```

Necessidade:

- Corrigir o bug em que o Inventario por Foto so avisava duplicidade enquanto a foto ainda estava pendente em `importacoes_pendentes`.
- Preservar memoria historica de hashes de fotos ja lidas, seguindo o mesmo principio usado em `importacoes_cupons`.
- Avisar o usuario quando a mesma foto for importada novamente, mesmo apos a triagem anterior ter sido efetivada, descartada ou expirada.

Blocos de comandos documentados:

```sql
create table if not exists public.importacoes_fontes (...);
create index if not exists idx_importacoes_fontes_unidade_origem_hash_ultimo ...;
alter table public.importacoes_fontes enable row level security;
create policy "Admins gerenciam historico de fontes importadas" ...;
comment on table public.importacoes_fontes ...;
```

Implementacao relacionada:

- Issue GitHub #31 criada para o bug.
- `src/hooks/useSnapshotImport.ts`: consulta `importacoes_fontes` antes da IA; se o hash ja existir, mostra aviso com acao `Importar novamente`.
- `src/hooks/useSnapshotImport.ts`: registra o hash em `importacoes_fontes` apos salvar itens de foto na triagem.

Status:

- Criado no repositorio em 2026-06-04.
- Validado antes da aplicacao com `npm run supabase:migrations:dry-run`: apenas `20260604120500_create_import_source_history.sql` seria enviada.
- Aplicado no Supabase em 2026-06-04 com `npm run supabase:migrations:push`.
- Validacao pos-aplicacao com `npm run supabase:migrations:dry-run`: `Remote database is up to date`.

## Inventario por Foto - Fase 1: Snapshot e Metadados de Triagem

Data/hora de criacao: 2026-06-03 21:30:00 -03:00

Data/hora de modificacao: 2026-06-03 21:36:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260603213000_snapshot_import_metadata.sql
```

Necessidade:

- Preparar o fluxo "Inventario por Foto" para usar a mesma superficie de triagem ja usada por cupom/NFC-e.
- Permitir que a Edge Function `extract-inventory` registre rate limit/auditoria do novo modo `snapshot`.
- Diferenciar itens pendentes por origem sem quebrar o fluxo existente de cupom.
- Guardar metadados nao sensiveis de contexto, confianca e local sugerido pela IA, sem persistir imagem bruta.

Decisoes aplicadas:

- Nome funcional: Inventario por Foto.
- MVP: foto com audio opcional, nao obrigatorio.
- Limite de imagem planejado: 1400 x 1600 px.
- Snapshot restrito a admin aprovado da unidade.

Blocos de comandos documentados:

```sql
alter table public.ai_extraction_events
  drop constraint if exists ai_extraction_events_mode_check;

alter table public.ai_extraction_events
  add constraint ai_extraction_events_mode_check
  check (mode in ('text', 'audio', 'receipt', 'snapshot'));

alter table public.importacoes_pendentes
  add column if not exists origem text default 'receipt' not null;

alter table public.importacoes_pendentes
  add constraint importacoes_pendentes_origem_check
  check (origem in ('receipt', 'snapshot', 'barcode', 'video'));

alter table public.importacoes_pendentes
  add column if not exists source_hash text;

alter table public.importacoes_pendentes
  add column if not exists source_importado_em timestamp with time zone;

alter table public.importacoes_pendentes
  add column if not exists source_metadata jsonb default '{}'::jsonb not null;

alter table public.importacoes_pendentes
  add column if not exists confianca numeric;

alter table public.importacoes_pendentes
  add column if not exists validade_sugerida text;

alter table public.importacoes_pendentes
  add column if not exists comodo_sugerido text;

alter table public.importacoes_pendentes
  add column if not exists armario_sugerido text;

alter table public.importacoes_pendentes
  add column if not exists caixa_sugerida text;

create index if not exists idx_importacoes_pendentes_unidade_origem_criado ...;
create index if not exists idx_importacoes_pendentes_unidade_source_hash ...;
comment on column public.importacoes_pendentes.origem ...;
comment on column public.importacoes_pendentes.source_metadata ...;
comment on column public.importacoes_pendentes.confianca ...;
```

Implementacao relacionada:

- Issue GitHub #25 criada para a Fase 1.
- `plans/Implementation_plan_images-v1.md`: plano tecnico de execucao.

Status:

- Criado no repositorio em 2026-06-03.
- Validado antes da aplicacao com `npm run supabase:migrations:dry-run`: apenas `20260603213000_snapshot_import_metadata.sql` seria enviada.
- Aplicado no Supabase em 2026-06-03 com `npm run supabase:migrations:push`.
- Validacao pos-aplicacao com `npm run supabase:migrations:dry-run`: `Remote database is up to date`.

## Correcao de Loading no Modal da Unidade - Issue #23

Data/hora de criacao: 2026-05-23 17:50:15 -03:00

Data/hora de modificacao: 2026-05-23 18:07:46 -03:00

Arquivo SQL:

```text
Nao houve migration SQL.
```

Necessidade:

- Corrigir comportamento reportado em que o modal de configuracoes da unidade ficava carregando indefinidamente na area de acessos/membros.
- Garantir que chamadas para RPCs de governanca (`listar_membros`, fallback `listar_pendentes`) liberem a UI em sucesso, erro ou timeout.
- Garantir que a RPC de salvamento (`atualizar_configuracao_unidade`) nao deixe o botao `Salvar` preso em estado de processamento se houver falha inesperada.

Blocos de comandos documentados:

```sql
-- Nenhum comando SQL necessario.
-- RPCs existentes mantidas: public.listar_membros, public.listar_pendentes e public.atualizar_configuracao_unidade.
```

Implementacao relacionada:

- `src/components/AdminPanel.tsx`: adicionados timeout externo de 6s com `Promise.race`, `AbortController`, `try/catch/finally`, estado de erro e acao de tentar novamente no carregamento de acessos.
- `src/components/UnitSettingsPanel.tsx`: adicionados timeout externo de 10s com `Promise.race`, `AbortController` e `try/catch/finally` no salvamento do nome da unidade.
- `src/components/AdminAccessModal.tsx`: modal passa a limitar altura a `100dvh` e expor scroll vertical interno para o conteudo de configuracoes/acessos.
- `tests/e2e/authenticated-workflows.spec.ts`: fluxo autenticado passa a validar que o painel de acessos carrega, que o botao `Salvar` volta ao estado correto e que uma RPC de membros pendurada nao deixa spinner infinito.

Status:

- Issue GitHub #23 criada para documentar o bug; reaberta em 2026-05-23 18:00 -03:00 apos novo relato de spinner ainda indefinido.
- Sem alteracao de schema, policies, RPCs ou dados no Supabase.

## Configuracoes da Unidade - Issue #19

Data/hora de criacao: 2026-05-23 14:48:44 -03:00

Data/hora de modificacao: 2026-05-23 14:48:44 -03:00

Arquivo SQL:

```text
supabase/migrations/20260523150000_unit_settings.sql
```

Necessidade:

- Permitir que admins da unidade editem o nome da unidade dentro do app.
- Evitar update direto em `unidades` pelo frontend.
- Garantir que apenas admins aprovados possam alterar configuracoes basicas.
- Atualizar a UI local sem recarregar a aplicacao.

Blocos de comandos documentados:

```sql
create or replace function public.atualizar_configuracao_unidade(
  p_unidade_id uuid,
  p_nome text
) returns table (id uuid, nome text) ...;

revoke execute on function public.atualizar_configuracao_unidade(uuid, text) from public, anon;
grant execute on function public.atualizar_configuracao_unidade(uuid, text) to authenticated;
```

Comandos operacionais executados:

```powershell
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
npm run supabase:migrations:list
```

Implementacao relacionada:

- `src/components/UnitSettingsPanel.tsx`: formulario de nome, dados de governanca e espaco para preferencias futuras.
- `src/components/AdminAccessModal.tsx`: passa a agrupar configuracoes da unidade e governanca de acessos.
- `src/OrdoDomus.tsx`: atualiza `unidadeAtiva`, lista de unidades e `localStorage` apos mudanca.
- `tests/e2e/authenticated-workflows.spec.ts`: cobre edicao e restauracao do nome da unidade sem recarregar.

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-23 via `npm run supabase:migrations:push`.
- `npm run supabase:migrations:list` mostrou `20260523150000` alinhada em Local e Remote.
- Observacao: apos aplicacao, `npm run supabase:migrations:dry-run` falhou por autenticacao do CLI `cli_login_postgres` e pediu `SUPABASE_DB_PASSWORD`; a listagem confirmou a migration remota.

## Dashboard SaaS Administrativo - Issue #21

Data/hora de criacao: 2026-05-23 14:34:26 -03:00

Data/hora de modificacao: 2026-05-23 14:34:26 -03:00

Arquivo SQL:

```text
supabase/migrations/20260523143000_saas_admin_dashboard_details.sql
```

Necessidade:

- Permitir drill-down global no Dashboard SaaS sem expor tabelas administrativas diretamente ao cliente.
- Listar unidades com administradores e usuarios normais.
- Listar usuarios ativos e permitir torna-los inativos no app.
- Listar usuarios inativos e permitir reativacao.
- Listar itens de inventario por unidade/categoria.
- Listar convites pendentes e permitir aprovacao por system-admin.

Blocos de comandos documentados:

```sql
create or replace function public.get_saas_admin_snapshot() returns jsonb ...;
create or replace function public.set_saas_user_active(p_user_id uuid, p_active boolean) returns void ...;
create or replace function public.aprovar_convite_saas(p_unidade_id uuid, p_user_id uuid) returns void ...;

revoke execute on function public.get_saas_admin_snapshot() from public, anon;
revoke execute on function public.set_saas_user_active(uuid, boolean) from public, anon;
revoke execute on function public.aprovar_convite_saas(uuid, uuid) from public, anon;

grant execute on function public.get_saas_admin_snapshot() to authenticated;
grant execute on function public.set_saas_user_active(uuid, boolean) to authenticated;
grant execute on function public.aprovar_convite_saas(uuid, uuid) to authenticated;
```

Comandos operacionais executados:

```powershell
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
npm run supabase:migrations:dry-run
npm run supabase:migrations:list
```

Implementacao relacionada:

- `src/components/SaasAdminDashboard.tsx`: cards clicaveis para unidades, usuarios ativos, usuarios inativos, itens e convites; modais com listas, filtros e acoes.
- `public.get_saas_admin_snapshot()`: snapshot global restrito a `system_admins`.
- `public.set_saas_user_active(uuid, boolean)`: alterna acessos aprovados/inativos no app.
- `public.aprovar_convite_saas(uuid, uuid)`: aprova solicitacao pendente de unidade.

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-23 via `npm run supabase:migrations:push`.
- `npm run supabase:migrations:dry-run` retornou `Remote database is up to date`.
- `npm run supabase:migrations:list` mostrou `20260523143000` alinhada em Local e Remote.

## Compatibilidade do Seed E2E Autenticado - Issues #17/#22

Data/hora de criacao: 2026-05-23 14:17:10 -03:00

Data/hora de modificacao: 2026-05-23 14:17:10 -03:00

Arquivos relacionados:

```text
scripts/e2e/seed.ts
package.json
tests/e2e/authenticated-entry.spec.ts
tests/e2e/authenticated-workflows.spec.ts
docs/testing/E2E_AUTHENTICATED.md
docs/TESTING_STRATEGY.md
```

Necessidade:

- Validar o E2E autenticado real contra Supabase com `.env.e2e.local`.
- Corrigir falha local de certificado TLS no Windows/Node durante chamadas Auth Admin.
- Corrigir incompatibilidade entre o seed e ambientes cujo schema remoto nao possui `unidades.codigo_convite`.
- Tornar o seed idempotente diante da constraint `unique_item_location` em `itens_inventario`.
- Evitar flakiness por cupom e item manual repetidos em execucoes sucessivas do Playwright.

Blocos de comandos documentados:

```powershell
npm run test:e2e:seed
npm run test:e2e
```

Mudancas aplicadas:

- `package.json`: `test:e2e:seed` passa a executar `node --use-system-ca --import tsx scripts/e2e/seed.ts`.
- `scripts/e2e/seed.ts`: tenta usar `unidades.codigo_convite`; quando o PostgREST retorna `42703`, usa fallback por nome/id da unidade seed.
- `scripts/e2e/seed.ts`: remove fisicamente itens de inventario `E2E %` controlados pelo teste antes de reinserir, evitando colisao com `unique_item_location`.
- `tests/e2e/authenticated-workflows.spec.ts`: cupom mockado usa imagem SVG unica por execucao para nao colidir com historico de hash de cupom.
- `tests/e2e/authenticated-workflows.spec.ts`: item manual criado pelo teste recebe nome unico por execucao.
- `tests/e2e/authenticated-entry.spec.ts`: seletor do campo de produto acompanha o valor normalizado exibido pela UI.

Status:

- Nao houve nova migration SQL nesta etapa.
- `npm run test:e2e:seed` passou em ambiente local autenticado.
- `npm run test:e2e` passou em ambiente local autenticado com 10 testes.

## Rate Limit da Edge Function de IA - Issue #16

Data/hora de criacao: 2026-05-23 07:12:24 -03:00

Data/hora de modificacao: 2026-05-23 07:12:24 -03:00

Arquivo SQL:

```text
supabase/migrations/20260523100000_ai_extraction_rate_limits.sql
```

Necessidade:

- Proteger custo e disponibilidade da Edge Function `extract-inventory` antes de chamar Gemini.
- Registrar tentativas aceitas e bloqueadas por usuario/unidade/modo.
- Permitir contagem de uso por janela para texto, audio e cupom.
- Reter auditoria operacional de limite sem expor dados brutos de entrada.

Blocos de comandos documentados:

```sql
create table if not exists public.ai_extraction_events (...);

create index if not exists idx_ai_extraction_events_rate_window
  on public.ai_extraction_events(unidade_id, user_id, mode, created_at desc);

alter table public.ai_extraction_events enable row level security;

create policy "Admins registram tentativas de IA" ...;
create policy "Admins leem suas tentativas de IA" ...;

create or replace function public.cleanup_ai_extraction_events(
  p_reference_time timestamptz default now(),
  p_retention_days integer default 30,
  p_batch_size integer default 5000
) returns integer ...;

revoke execute on function public.cleanup_ai_extraction_events(timestamptz, integer, integer) from public, anon, authenticated;
grant execute on function public.cleanup_ai_extraction_events(timestamptz, integer, integer) to service_role;

select cron.schedule(
  'cleanup-ai-extraction-events',
  '43 3 * * *',
  'select public.cleanup_ai_extraction_events();'
);
```

Implementacao relacionada:

- `supabase/functions/extract-inventory/index.ts`: valida limite por modo antes do Gemini, registra eventos aceitos/bloqueados e retorna mensagens especificas.
- `supabase/functions/extract-inventory/limits.ts`: regras puras de tamanho, MIME e payload.
- `supabase/functions/extract-inventory/limits.test.ts`: cobertura de caminho feliz e bloqueios.
- `src/services/geminiService.ts`: preserva mensagens de erro retornadas pela Edge Function.
- `src/hooks/useExtraction.ts`: exibe mensagens especificas de limite/formato/tamanho nos fluxos texto/audio.
- `.env.example`: documenta variaveis opcionais da Edge Function.
- `docs/supabase/P1_AI_RATE_LIMIT_IMPLEMENTATION.md`: documentacao operacional da issue #16.

Comandos operacionais executados:

```powershell
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
supabase functions deploy extract-inventory
npm run lint
npm test
```

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-23 via `npm run supabase:migrations:push`.
- Edge Function `extract-inventory` redeployada no Supabase apos a mudanca.
- `npm run supabase:migrations:list` mostrou `20260523100000` alinhada em Local e Remote.
- Testes automatizados cobrem bloqueio de MIME invalido, bloqueio de texto acima do limite e caminho feliz de cupom.

## Consolidacao do Historico de Migrations Supabase - Issue #15

Data/hora de criacao: 2026-05-23 07:01:04 -03:00

Data/hora de modificacao: 2026-05-23 07:08:00 -03:00

Arquivo SQL:

```text
supabase/migrations/20260501000000_initial_schema_baseline.sql
```

Necessidade:

- Tornar um ambiente Supabase novo reproduzivel somente a partir de `supabase/migrations/`.
- Remover a dependencia operacional de `CriarSQL.sql` como bootstrap manual do schema.
- Reconciliar o historico remoto com uma migration inicial anterior as migrations de hardening e features ja aplicadas.
- Preservar o hardening atual: a baseline nao recria policies antigas que permitiam escrita ampla por qualquer membro aprovado em inventario, movimentacoes, importacoes pendentes ou dicionario.

Blocos de comandos documentados:

```sql
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.unidades (...);
create table if not exists public.membros_unidades (...);
create table if not exists public.itens_inventario (...);
create table if not exists public.movimentacoes_inventario (...);
create table if not exists public.importacoes_pendentes (...);
create table if not exists public.dicionario_produtos (...);
create table if not exists public.system_admins (...);

create or replace view public.membros_unidades_view as ...;

create index if not exists idx_membros_unidades_user_id ...;
create index if not exists idx_itens_upsert_lookup ...;
create index if not exists idx_importacoes_pendentes_unidade_id ...;
create index if not exists idx_dicionario_unidade_nome ...;

alter table public.unidades enable row level security;
alter table public.membros_unidades enable row level security;
alter table public.itens_inventario enable row level security;
alter table public.movimentacoes_inventario enable row level security;
alter table public.importacoes_pendentes enable row level security;
alter table public.dicionario_produtos enable row level security;
alter table public.system_admins enable row level security;

create policy "Permitir inserção de unidades para usuários autenticados" ...;
create policy "Permitir leitura de unidades que o usuário é membro" ...;
create policy "Ver membros da unidade" ...;
create policy "Inserir membros" ...;
create policy "System admins can read their own status" ...;
```

Comandos operacionais executados:

```powershell
npm run supabase:migrations:list
npm run supabase:migrations:dry-run
supabase db push --dry-run --include-all
supabase db push --include-all
npm run supabase:migrations:list
npm run supabase:migrations:dry-run
```

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-23 07:01 -03:00 via `supabase db push --include-all`.
- Antes da aplicacao, `npm run supabase:migrations:list` mostrava `20260501000000` apenas em Local; o `db push --dry-run` normal bloqueava com `Found local migration files to be inserted before the last migration on remote database`.
- `supabase db push --dry-run --include-all` confirmou que somente `20260501000000_initial_schema_baseline.sql` seria enviada.
- A aplicacao remota foi idempotente: o Supabase reportou objetos ja existentes como `skipping`, sem recriar schema destrutivamente.
- Apos aplicacao, `npm run supabase:migrations:list` mostrou `20260501000000` e todas as migrations posteriores alinhadas em Local e Remote.
- Validacao final: `npm run supabase:migrations:dry-run` retornou `Remote database is up to date`.
- Observacao operacional: se o CLI retornar erro de autenticacao para `cli_login_postgres` em outra sessao, exportar `SUPABASE_DB_PASSWORD` com a senha atual do banco antes de repetir `db push`, `db push --dry-run` ou comandos equivalentes.

## Retencao de Importacoes Pendentes Expiradas

Data/hora de criacao: 2026-05-22 20:49:15 -03:00

Data/hora de modificacao: 2026-05-22 20:50:49 -03:00

Arquivo SQL:

```text
supabase/migrations/20260522205000_cleanup_expired_pending_imports.sql
```

Necessidade:

- Remover automaticamente linhas expiradas de `importacoes_pendentes`.
- Reduzir acumulo de dados operacionais temporarios da triagem de cupom.
- Evitar que pendencias expiradas aparecam na triagem ou bloqueiem nova importacao do mesmo cupom como duplicidade pendente.

Blocos de comandos documentados:

```sql
create extension if not exists pg_cron with schema extensions;

create index if not exists idx_importacoes_pendentes_expired_unprocessed
  on public.importacoes_pendentes(expires_at)
  where processado = false;

create or replace function public.cleanup_expired_pending_imports(
  p_reference_time timestamptz default now(),
  p_batch_size integer default 5000
) returns integer ...;

revoke execute on function public.cleanup_expired_pending_imports(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.cleanup_expired_pending_imports(timestamptz, integer) to service_role;

select cron.schedule(
  'cleanup-expired-pending-imports',
  '17 3 * * *',
  'select public.cleanup_expired_pending_imports();'
);
```

Implementacao frontend relacionada:

- `src/hooks/useTriage.ts`: carrega apenas `importacoes_pendentes` com `expires_at` futuro.
- `src/hooks/useReceiptImport.ts`: a checagem de duplicidade pendente tambem ignora registros expirados.

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-22 20:50:49 -03:00 via `npx supabase db push`.
- Validacao pos-aplicacao: `npx supabase db push --dry-run` retornou `Remote database is up to date`.
- A rotina agendada roda diariamente as 03:17 UTC pelo `pg_cron`.

## Consolidacao do Cliente Supabase

Data/hora de criacao: 2026-05-22 20:45:16 -03:00

Data/hora de modificacao: 2026-05-22 20:45:16 -03:00

Arquivo SQL:

```text
Nao houve migration SQL.
```

Necessidade:

- Registrar que a consolidacao de `supabaseClient` nao altera schema, policies, RPCs ou dados no Supabase.
- Evitar configuracoes divergentes entre clientes frontend.

Blocos de comandos documentados:

```sql
-- Nenhum comando SQL necessario.
```

Implementacao frontend relacionada:

- `src/supabaseClient.ts`: removido por ser copia legada sem configuracao de auth/lock.
- `src/lib/supabaseClient.ts`: mantido como unica origem ativa do cliente Supabase no frontend.

Status:

- Sem aplicacao no Supabase.
- Validado em 2026-05-22: nao restam imports para `src/supabaseClient.ts`; `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram.

## Observabilidade Remota

Data/hora de criacao: 2026-05-22 20:26:18 -03:00

Data/hora de modificacao: 2026-05-22 20:26:18 -03:00

Arquivo SQL:

```text
Nao houve migration SQL.
```

Necessidade:

- Registrar que a etapa de observabilidade real nao altera schema, policies, RPCs ou dados no Supabase.
- Manter o controle operacional em arquivo unico de mudancas SQL/DB, conforme padrao do projeto.

Blocos de comandos documentados:

```sql
-- Nenhum comando SQL necessario.
```

Implementacao frontend relacionada:

- `src/lib/observability.ts`: inicializacao opcional do Sentry, scrubber de PII, Error Boundary, breadcrumbs, mensagens, excecoes e spans.
- `src/lib/logger.ts`: envio remoto apenas de `warn`/`error` quando observabilidade estiver habilitada.
- `src/services/geminiService.ts`: span da Edge Function `extract-inventory`.
- `src/repositories/inventoryRepository.ts`: spans das RPCs `get_inventory_page`, `upsert_inventario` e `efetivar_importacao_cupom`.
- `src/repositories/dashboardRepository.ts`: span da RPC `get_dashboard_metrics`.

Status:

- Sem aplicacao no Supabase.
- Ativacao depende das variaveis `VITE_SENTRY_DSN`, `VITE_OBSERVABILITY_ENABLED`, `VITE_SENTRY_TRACES_SAMPLE_RATE` e `VITE_APP_VERSION`.

## Historico de Cupons Importados

Data/hora de criacao: 2026-05-22 11:30:00 -03:00

Data/hora de modificacao: 2026-05-22 19:20:49 -03:00

Arquivo SQL:

```text
supabase/migrations/20260522113000_create_receipt_import_history.sql
```

Necessidade:

- Detectar reimportacao de cupom mesmo depois que a triagem foi efetivada e as linhas de `importacoes_pendentes` foram removidas.
- Informar ao usuario a data/hora da primeira importacao conhecida daquele hash.
- Permitir reimportacao consciente por acao explicita na UI quando o usuario realmente quiser importar novamente.

Blocos de comandos documentados:

```sql
create table if not exists public.importacoes_cupons (...);

create index if not exists idx_importacoes_cupons_unidade_hash_ultimo
  on public.importacoes_cupons(unidade_id, cupom_hash, ultimo_importado_em desc);

alter table public.importacoes_cupons enable row level security;

create policy "Admins gerenciam historico de cupons"
  on public.importacoes_cupons for all
  using (... papel = 'admin' and status = 'aprovado' ...)
  with check (... papel = 'admin' and status = 'aprovado' ...);
```

Implementacao frontend relacionada:

- `src/hooks/useReceiptImport.ts`: consulta `importacoes_cupons` antes do OCR; se o hash ja existir, mostra aviso com acao `Importar novamente`.
- `src/hooks/useReceiptImport.ts`: registra o hash em `importacoes_cupons` apos salvar os itens pendentes, preservando a primeira importacao e atualizando a ultima importacao em reimportacoes conscientes.

Status:

- Criado no repositorio.
- Aplicado no Supabase em 2026-05-22 19:20:49 -03:00.
- Validacao pos-aplicacao: `npx supabase migration list` mostra `20260522113000` em Local e Remote; `npx supabase db push --dry-run` retornou `Remote database is up to date`.

## Hash de Cupom para Duplicidade

Data/hora de criacao: 2026-05-21 11:00:00 -03:00

Data/hora de modificacao: 2026-05-21 18:49:21 -03:00

Arquivo SQL:

```text
supabase/migrations/20260521110000_add_receipt_import_hash.sql
```

Necessidade:

- Detectar que o mesmo arquivo de cupom ja foi importado enquanto ainda existe triagem pendente.
- Guardar a data/hora da importacao anterior para informar o usuario com precisao.
- Melhorar a UX de erro operacional, evitando duplicidade acidental antes de criar mais linhas em `importacoes_pendentes`.

Blocos de comandos documentados:

```sql
alter table public.importacoes_pendentes
  add column if not exists cupom_hash text;

alter table public.importacoes_pendentes
  add column if not exists cupom_importado_em timestamp with time zone default timezone('utc'::text, now()) not null;

create index if not exists idx_importacoes_pendentes_unidade_cupom_hash_importado
  on public.importacoes_pendentes(unidade_id, cupom_hash, cupom_importado_em desc)
  where cupom_hash is not null;
```

Implementacao frontend relacionada:

- `src/hooks/useReceiptImport.ts`: calcula SHA-256 do cupom comprimido e informa se o mesmo hash ja estiver pendente na unidade, exibindo data/hora da importacao anterior.

Status:

- Criado no repositorio.
- Aplicado manualmente no Supabase em 2026-05-21 18:49:21 -03:00.

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
