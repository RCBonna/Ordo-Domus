# Estrategia de Testes

## Indice

1. [Estado Atual](#estado-atual)
2. [Riscos Sem Teste](#riscos-sem-teste)
3. [Testes Unitarios](#testes-unitarios)
4. [Testes de Integracao](#testes-de-integracao)
5. [Testes E2E](#testes-e2e)
6. [Testes de Banco/RLS](#testes-de-bancorls)
7. [Cobertura Recomendada](#cobertura-recomendada)
8. [Plano de Implantacao](#plano-de-implantacao)

## Estado Atual

O repositorio possui uma base inicial de testes automatizados:

```json
"lint": "tsc --noEmit",
"test": "vitest run",
"test:e2e": "playwright test"
```

- Vitest cobre helpers de dominio em `src/lib`.
- Playwright cobre smoke publico da tela de login e possui fluxo autenticado opcional por variaveis de ambiente.
- `npm run test:e2e` inicia/reusa o Vite em `http://127.0.0.1:3000`.
- Fluxos autenticados devem ser executados com `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`.
- Seed autenticado pode ser preparado com `npm run test:e2e:seed`, usando `.env.e2e.local` baseado em `.env.e2e.example`.

## Riscos Sem Teste

| Area | Risco |
| --- | --- |
| RLS | Vazamento ou bloqueio indevido entre unidades. |
| Upsert | Duplicidade de itens ou soma incorreta. |
| Consumo | Quantidade negativa ou historico inconsistente. |
| Triagem | Perda de item pendente ou dicionario incorreto. |
| Auth | Sessao travada, unidade stale, logout incompleto. |
| Gemini | JSON invalido ou schema inesperado. |

## Testes Unitarios

Ferramenta recomendada: Vitest + React Testing Library.

Casos prioritarios:

| Modulo | Testes |
| --- | --- |
| `formatarTexto` | null, numero, vazio, string com espacos, capitalizacao. |
| `formatarData` | DD/MM, DD/MM/AA, datas invalidas, ano passado, bissexto. |
| `isConsumivel` | categorias duraveis, categoria vazia, case-insensitive. |
| `compressImage` | mock de canvas para validar retorno DataURL. |
| `InventoryCard` | estados vencido, a vencer, edicao, consumo. |

## Testes de Integracao

Usar Supabase local ou projeto de teste.

Casos:

1. Criar unidade e membro admin.
2. Solicitar entrada como convidado.
3. Aprovar membro.
4. Inserir item via RPC.
5. Fazer merge de item igual.
6. Consumir item e registrar movimentacao.
7. Soft delete e invisibilidade na listagem.
8. Importar pendente e aplicar dicionario.

## Testes E2E

Ferramenta configurada: Playwright.

Fluxos criticos:

| Fluxo | Validacao |
| --- | --- |
| Login | Usuario entra e ve onboarding/unidade. |
| Onboarding | Criar unidade gera acesso admin. |
| Entrada texto | Texto vira preview e confirmacao salva item. |
| Inventario | Busca encontra item e edicao persiste. |
| Consumo | Botao reduz quantidade e desfazer restaura. |
| Admin | Solicitation pendente e aprovada por admin. |
| Dashboard | KPIs aparecem apos carregar inventario. |

Gemini deve ser mockado em E2E para reduzir custo e flakiness.

Cobertura inicial implementada:

| Spec | Status | Observacao |
| --- | --- | --- |
| `tests/e2e/auth-public.spec.ts` | Implementado | Login publico, alternancia cadastro/login e visibilidade de senha. |
| `tests/e2e/authenticated-entry.spec.ts` | Implementado opcional | Roda somente com `E2E_USER_EMAIL` e `E2E_USER_PASSWORD`; valida entrada operacional, Entrada com IA mockada, Inventario e Triagem seed. |
| `tests/e2e/authenticated-workflows.spec.ts` | Implementado opcional | Roda com usuario seed; valida Cupom com IA mockada, Triagem criada, Lista de Compras e insercao manual. |

### Seed E2E autenticado

Arquivo de referencia:

```text
.env.e2e.example
```

Variaveis:

| Variavel | Obrigatoria | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` ou `E2E_SUPABASE_URL` | Sim | Projeto Supabase alvo. |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Sim | Criar/atualizar usuario Auth e dados seed. Usar legacy `service_role` JWT; nunca versionar. |
| `E2E_USER_EMAIL` | Sim | Usuario de teste para Playwright. |
| `E2E_USER_PASSWORD` | Sim | Senha do usuario de teste. Nunca versionar. |
| `E2E_UNIT_NAME` | Nao | Nome da unidade seed. |
| `E2E_UNIT_CODE` | Nao | Codigo de convite deterministico da unidade seed quando `unidades.codigo_convite` existe. |

Comandos:

```bash
npm run test:e2e:seed
npm run test:e2e
```

O script `test:e2e:seed` usa `node --use-system-ca --import tsx` para evitar falhas TLS em Windows com certificados raiz instalados na store do sistema. Em schemas sem `unidades.codigo_convite`, o seed usa fallback por nome/id da unidade `Ordo E2E`.

O seed cria/atualiza:

- usuario Auth confirmado;
- unidade `Ordo E2E`;
- membro admin aprovado;
- itens de inventario `E2E Cafe`, `E2E Arroz`, `E2E Sabao`;
- dicionario e pendencias de triagem `E2E CAFE TORRADO 500G` e `E2E DETERGENTE NEUTRO`;
- item manual de lista de compras `E2E Pilha AA`.

Documentacao operacional completa:

```text
docs/testing/E2E_AUTHENTICATED.md
```

## Testes de Banco/RLS

Criar testes SQL ou scripts com usuarios distintos:

- usuario A admin unidade 1;
- usuario B convidado pendente unidade 1;
- usuario C admin unidade 2.

Validar:

- A nao ve dados da unidade 2;
- B pendente nao acessa inventario;
- convidado aprovado tem apenas permissoes desejadas;
- RPC admin falha para nao-admin;
- `get_saas_metrics` falha para nao system-admin.

## Cobertura Recomendada

| Tipo | Meta inicial |
| --- | --- |
| Unitarios utilitarios | 90% |
| Hooks de dominio | 70% com mocks Supabase |
| Componentes criticos | 60% |
| E2E fluxos principais | 6 a 8 cenarios |
| RLS/RPC | 100% das policies/RPCs criticas |

## Plano de Implantacao

1. ✅ Instalar Vitest.
2. ✅ Testar `src/lib/utils.ts`.
3. ✅ Adicionar Playwright com smoke publico e fluxo autenticado opcional.
4. ✅ Adicionar seed de auth/unidade/dados para Playwright.
5. Mockar `supabaseClient` e testar hooks.
6. Criar Supabase local/migrations versionadas.
7. ✅ Colocar `npm run test` e `npm run test:e2e` no CI, com E2E autenticado condicionado a secrets.
