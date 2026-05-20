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

