# Supabase - Setup Seguro de Migrations

## Objetivo

Criar uma estrutura oficial de migrations no projeto, autenticar o Supabase CLI na maquina local e aplicar alteracoes no banco de forma versionada, rastreavel e revisavel.

## 1. Instalar Supabase CLI

No PowerShell:

```powershell
npm install -g supabase
```

Validar:

```powershell
supabase --version
```

Se o comando nao aparecer, feche e abra o PowerShell.

## 2. Fazer Login no Supabase

No PowerShell:

```powershell
supabase login
```

O comando pode abrir o navegador ou pedir um token.

Se pedir token:

1. Acesse: https://supabase.com/dashboard/account/tokens
2. Crie um token novo.
3. Cole o token no terminal.

Nao cole esse token em chats, issues, commits ou documentacao versionada.

## 3. Descobrir o Project Ref

No dashboard do Supabase:

1. Abra o projeto.
2. Va em `Project Settings`.
3. Va em `General`.
4. Copie o `Reference ID`.

Exemplo de formato:

```text
abcdefghijklmnopqrst
```

## 4. Linkar o Projeto Local ao Supabase

Na raiz do projeto:

```powershell
cd C:\Users\rcbon\OneDrive\Apps\Ordo-Domus
supabase link --project-ref SEU_PROJECT_REF
```

Substitua `SEU_PROJECT_REF` pelo valor real.

Esse comando cria uma pasta local `.supabase/` com metadados do link.

## 5. Preparar Migrations Versionadas

As migrations devem ficar em:

```text
supabase/migrations/
```

Exemplos:

```text
supabase/migrations/20260519123000_fix_rls_roles.sql
supabase/migrations/20260519124500_add_audit_user_id.sql
supabase/migrations/20260519130000_create_gemini_edge_function_support.sql
```

Cada arquivo deve ser revisado antes de aplicar no banco remoto.

## 6. Verificar Diferencas Antes de Aplicar

Quando aplicavel:

```powershell
supabase db diff
```

Tambem e recomendado revisar diretamente os arquivos SQL criados em `supabase/migrations/`.

## 7. Aplicar Migrations no Supabase

Para aplicar no projeto remoto linkado:

```powershell
supabase db push
```

Esse comando aplica as migrations pendentes no banco remoto.

## 8. Validar Aplicacao

Depois do push:

```powershell
supabase migration list
```

Tambem valide pelo dashboard:

1. Supabase Dashboard
2. SQL Editor
3. Table Editor
4. Database Functions
5. Authentication / Policies

## 9. Fluxo Recomendado

```text
1. Criar migration SQL
2. Revisar arquivo
3. Rodar supabase db push
4. Validar no app
5. Commitar migration e codigo relacionado
```

## 10. O Que Evitar

Evite:

- Rodar SQL solto no dashboard sem salvar no repositorio.
- Colar `service_role key` em chats, issues ou commits.
- Editar policies manualmente sem migration.
- Aplicar scripts antigos que usam `membros_unidade` se o schema atual usa `membros_unidades`.
- Misturar correcoes manuais no dashboard com migrations locais sem reconciliar o estado.

## Checklist Minimo

Antes de aplicar correcoes via CLI, estes comandos devem funcionar:

```powershell
supabase --version
supabase login
supabase link --project-ref SEU_PROJECT_REF
```

Depois disso, as correcoes podem ser preparadas como migrations versionadas e aplicadas com:

```powershell
supabase db push
```

## 11. Fluxo Automatizado no Projeto

Depois da reconciliacao do historico remoto em 2026-05-21, os comandos de rotina devem ser executados pela raiz do repositorio:

```powershell
npm run supabase:migrations:list
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
```

Uso recomendado:

1. `npm run supabase:migrations:list`: confirma se as migrations locais e remotas estao alinhadas.
2. `npm run supabase:migrations:dry-run`: mostra o que seria aplicado sem alterar o banco remoto.
3. `npm run supabase:migrations:push`: aplica as migrations pendentes no projeto Supabase linkado.

Estado validado em 2026-05-23:

```text
20260501000000 | 20260501000000
20260519150000 | 20260519150000
20260519162000 | 20260519162000
20260519173000 | 20260519173000
20260519183000 | 20260519183000
20260519190000 | 20260519190000
20260520200000 | 20260520200000
20260520211500 | 20260520211500
20260521100000 | 20260521100000
20260521103000 | 20260521103000
20260521110000 | 20260521110000
20260522113000 | 20260522113000
20260522205000 | 20260522205000
```

Isso significa que as migrations locais em `supabase/migrations/` estavam reconciliadas com o historico remoto no momento da validacao.

## 12. Baseline Inicial e Ambientes Novos

A migration `supabase/migrations/20260501000000_initial_schema_baseline.sql` e a primeira migration oficial do projeto. Ela substitui o uso de `CriarSQL.sql` como bootstrap manual e cria os objetos base exigidos pelas migrations posteriores:

- tabelas `unidades`, `membros_unidades`, `itens_inventario`, `movimentacoes_inventario`, `importacoes_pendentes`, `dicionario_produtos` e `system_admins`;
- view `membros_unidades_view`;
- indices base e constraint `unique_item_location`;
- RLS habilitado nas tabelas base;
- policies minimas para `unidades`, `membros_unidades` e `system_admins`.

Essa baseline nao recria as policies legadas de escrita ampla em inventario, movimentacoes, importacoes pendentes ou dicionario. O hardening por papel continua centralizado em `20260519150000_harden_rls_roles.sql`.

Para um ambiente Supabase novo, o fluxo esperado e:

```powershell
npm run supabase:migrations:list
npm run supabase:migrations:dry-run
npm run supabase:migrations:push
```

Se uma migration anterior a ultima remota precisar ser reconciliada em um banco ja existente, use primeiro:

```powershell
supabase db push --dry-run --include-all
supabase db push --include-all
```

Use `--include-all` apenas quando o `migration list` mostrar uma migration local antiga ausente no remoto e o SQL tiver sido revisado como idempotente para o banco alvo.

Observacao: se o CLI retornar erro de autenticacao para `cli_login_postgres`, configure `SUPABASE_DB_PASSWORD` na sessao do PowerShell com a senha atual do banco antes de rodar `db push`, `db push --dry-run` ou comandos que conectem diretamente ao Postgres.

## 13. Rate Limit da Edge Function de IA

A Edge Function `extract-inventory` possui protecao de uso por usuario/unidade/modo. A implementacao completa esta em:

```text
docs/supabase/P1_AI_RATE_LIMIT_IMPLEMENTATION.md
supabase/migrations/20260523100000_ai_extraction_rate_limits.sql
```

Limites padrao:

| Modo | Limite |
| --- | --- |
| Texto | 20 requisicoes a cada 600s, ate 4000 caracteres |
| Audio | 8 requisicoes a cada 3600s, ate 7.5 MB decodificados |
| Cupom | 12 requisicoes a cada 3600s, ate 6 MB decodificados |

Variaveis opcionais da function:

```text
AI_TEXT_RATE_LIMIT
AI_TEXT_RATE_WINDOW_SECONDS
AI_TEXT_MAX_CHARS
AI_TEXT_MAX_BYTES
AI_AUDIO_RATE_LIMIT
AI_AUDIO_RATE_WINDOW_SECONDS
AI_AUDIO_MAX_BYTES
AI_RECEIPT_RATE_LIMIT
AI_RECEIPT_RATE_WINDOW_SECONDS
AI_RECEIPT_MAX_BYTES
```

Essas variaveis sao secrets/config da Supabase Edge Function e nao devem ser prefixadas com `VITE_`.
