# E2E Autenticado com Seed

Status: configurado e validado em ambiente local com Supabase real. Sem credenciais E2E, `npm run test:e2e` continua executando os testes publicos e marcando os testes autenticados como skip explicito.

## Variaveis Locais

Crie `.env.e2e.local` na raiz do projeto. Nao versionar esse arquivo.

```text
E2E_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
E2E_SUPABASE_SERVICE_ROLE_KEY=service_role_key_legacy_jwt_apenas_local_ou_ci
E2E_USER_EMAIL=ordo.e2e@example.com
E2E_USER_PASSWORD=senha-forte-do-usuario-e2e
E2E_UNIT_NAME=Ordo E2E
E2E_UNIT_CODE=ORDO-E2E
```

`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam em `.env.local`.

Use a chave legacy `service_role` da aba `Legacy anon, service_role API keys` do Supabase. A chave `sb_secret_...` da aba nova de Secret keys nao atende o endpoint Auth Admin usado pelo seed atual.

## Fluxo Local

1. Instalar dependencias:

```powershell
npm ci
```

2. Criar/atualizar usuario, unidade e dados seed:

```powershell
npm run test:e2e:seed
```

3. Rodar Playwright:

```powershell
npm run test:e2e
```

## Cobertura Autenticada

Quando `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` estao presentes, os testes autenticados deixam de ser skipados e cobrem:

- login do usuario seed;
- Entrada com IA mockada e gravacao no inventario;
- Inventario listando item seed;
- Cupom com IA mockada e criacao de triagem pendente;
- Triagem abrindo itens pendentes seed;
- Lista de Compras com item manual seed e alerta automatico;
- insercao manual na Lista de Compras.

## Dados Seed

O script `scripts/e2e/seed.ts` garante:

- usuario Auth confirmado;
- unidade `Ordo E2E` com codigo `ORDO-E2E` quando `unidades.codigo_convite` existe;
- fallback por nome/id da unidade quando o schema real nao possui `unidades.codigo_convite`;
- membro admin aprovado;
- inventario com itens `E2E Cafe`, `E2E Arroz` e `E2E Sabao`;
- dicionario e pendencias de triagem `E2E ...`;
- lista de compras com `E2E Pilha AA`.

Antes de reinserir dados, o seed limpa registros `E2E %` controlados pelo teste para reduzir flakiness. No inventario, a limpeza remove fisicamente esses itens seed para nao colidir com a constraint unica de nome/local/validade.

No Windows, o script npm chama Node com `--use-system-ca` para usar a store de certificados do sistema e evitar `UNABLE_TO_VERIFY_LEAF_SIGNATURE` durante chamadas ao Supabase.

## Validacao Local

Validado em 2026-05-23:

```powershell
npm run test:e2e:seed
npm run test:e2e
```

Resultado:

```text
10 passed
```

## CI

O workflow `.github/workflows/ci.yml` instala Chromium e roda E2E quando as variaveis publicas Supabase estao presentes. O seed autenticado roda somente quando tambem existirem:

- `secrets.E2E_SUPABASE_SERVICE_ROLE_KEY`;
- `secrets.E2E_USER_PASSWORD`.

Secrets/vars esperados:

```text
secrets.E2E_SUPABASE_URL
secrets.E2E_SUPABASE_ANON_KEY
secrets.E2E_SUPABASE_SERVICE_ROLE_KEY
secrets.E2E_USER_PASSWORD
vars.E2E_USER_EMAIL
vars.E2E_UNIT_NAME
vars.E2E_UNIT_CODE
```

`vars.*` tem fallback para `ordo.e2e@example.com`, `Ordo E2E` e `ORDO-E2E`.
