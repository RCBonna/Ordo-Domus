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

Nao foram encontrados testes automatizados no repositorio. O script `lint` executa apenas TypeScript:

```json
"lint": "tsc --noEmit"
```

Nao ha Jest, Vitest, Testing Library, Playwright ou Cypress configurados.

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

Ferramenta recomendada: Playwright.

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

1. Instalar Vitest e Testing Library.
2. Testar `src/lib/utils.ts`.
3. Mockar `supabaseClient` e testar hooks.
4. Adicionar Playwright com fixtures de auth.
5. Criar Supabase local/migrations versionadas.
6. Colocar `npm run test`, `npm run test:e2e` no CI.

