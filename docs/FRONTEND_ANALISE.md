# Analise Frontend

## Indice

1. [Framework e Build](#framework-e-build)
2. [Estrutura](#estrutura)
3. [Componente Raiz](#componente-raiz)
4. [Componentes](#componentes)
5. [Hooks](#hooks)
6. [Estado e Navegacao](#estado-e-navegacao)
7. [Comunicacao com Backend](#comunicacao-com-backend)
8. [Bibliotecas UI](#bibliotecas-ui)
9. [Fluxos de Interface](#fluxos-de-interface)
10. [Riscos e Melhorias](#riscos-e-melhorias)

## Framework e Build

O frontend usa React 19 com Vite 6 e TypeScript.

Scripts:

| Script | Comando | Uso |
| --- | --- | --- |
| `dev` | `vite --port=3000 --host=0.0.0.0` | Desenvolvimento local. |
| `build` | `vite build` | Build de producao. |
| `preview` | `vite preview` | Servir build localmente. |
| `lint` | `tsc --noEmit` | Typecheck. |

## Estrutura

```text
src/
  main.tsx
  OrdoDomus.tsx
  index.css
  hooks/
  services/
  components/
  lib/
components/ui/
  componentes shadcn gerados/localizados
```

## Componente Raiz

`OrdoDomus.tsx` e o orquestrador da aplicacao. Ele decide:

- se mostra login;
- se mostra onboarding;
- se mostra aguardando aprovacao;
- se mostra `GuestView`;
- se mostra abas administrativas;
- quando carregar inventario;
- quando abrir modais.

Abas:

```ts
'entrada' | 'inventário' | 'consumo' | 'dashboard' | 'saas-admin'
```

Observacao: o tipo inclui `consumo`, mas o fluxo real usa `activeTab === 'inventário'` com `isConsumoMode=true` para consumo.

## Componentes

| Componente | Responsabilidade |
| --- | --- |
| `Auth` | Login/cadastro por email/senha, mensagens traduzidas. |
| `Onboarding` | Criar unidade ou solicitar entrada por codigo. |
| `MainHeader` | Logo, unidade ativa, tabs, admin panel, logout e SaaS Admin. |
| `EntrySection` | Entrada por texto, voz, cupom, preview e historico recente. |
| `InventoryList` | Busca, agrupamento por comodo e grid de cards. |
| `InventoryCard` | Visualizacao, edicao, exclusao, consumo e validade. |
| `InventoryDashboard` | KPIs, graficos, alertas e linha do tempo. |
| `GuestView` | Inventario em leitura para convidados. |
| `AdminPanel` | Convite, pendentes, aprovados, aprovar/remover. |
| `TriageModal` | Lista de itens pendentes de cupom e smart match. |
| `ConfirmModal` | Confirmacao generica para exclusao. |
| `SaasAdminDashboard` | Metricas globais da plataforma. |

## Hooks

| Hook | Estado principal | Efeitos |
| --- | --- | --- |
| `useAuth` | usuario, unidade ativa, unidades, system admin, pendentes | `getSession`, `onAuthStateChange`, polling de pendentes. |
| `useInventory` | inventario, edicao, busca | CRUD Supabase e auditoria. |
| `useExtraction` | texto, audio, resultado, historico | Gemini, MediaRecorder, RPC upsert, historico. |
| `useReceiptImport` | importacao e input file | compressao imagem, Gemini OCR, insert pendentes. |
| `useTriage` | pendentes e loading | busca pendentes e dicionario. |

## Estado e Navegacao

Nao ha React Router. A navegacao e por estado local:

- `activeTab`
- `isConsumoMode`
- `unidadeAtiva`
- flags de modal

Persistencia local:

```ts
localStorage.setItem('ordo_domus_unidade_ativa', JSON.stringify(u));
```

Risco: a unidade ativa salva pode ficar stale se o acesso for removido. O `useAuth` recarrega unidades, mas nao valida explicitamente se a unidade salva ainda pertence a lista carregada.

## Comunicacao com Backend

O frontend chama Supabase diretamente:

```ts
supabase.from('itens_inventario').select('*')
supabase.rpc('upsert_inventario', {...})
supabase.auth.signInWithPassword({...})
```

Antes do hardening P0, o frontend chamava Gemini diretamente. No estado atual do repositorio, o frontend chama uma Edge Function Supabase:

```ts
supabase.functions.invoke('extract-inventory', { body: { mode, unidadeId, ...payload } });
```

## Bibliotecas UI

| Biblioteca | Uso |
| --- | --- |
| Tailwind CSS 4 | Layout e estilo. |
| shadcn/ui | Button, Input, Card, Table, Badge, ScrollArea etc. |
| lucide-react | Icones. |
| motion | Animacoes e transicoes. |
| sonner | Toasts. |
| Recharts | Graficos do dashboard. |

## Fluxos de Interface

### Login

1. Usuario alterna entre "Entrar" e "Criar Conta".
2. Envia email/senha.
3. Supabase Auth altera estado.
4. `useAuth` processa sessao e carrega unidades.

### Entrada de item

1. Usuario digita ou grava.
2. Resultado aparece em card editavel.
3. Usuario confirma.
4. Toast/historico refletem entrada.

### Inventario

1. Busca filtra por nome/categoria/comodo.
2. Itens sao agrupados por comodo.
3. Card permite editar/excluir ou consumir conforme modo.

### Dashboard

1. Calcula KPIs em memoria sobre `fullInventory` e `history`.
2. Permite clicar em alertas para navegar ao item na lista.

## Riscos e Melhorias

| Risco | Recomendacao |
| --- | --- |
| Sem roteamento URL | Adicionar React Router se houver deep links, telas independentes ou compartilhamento. |
| Muitos `any` | Criar tipos de dominio e tipos Supabase. |
| IA no cliente | Mover para Edge Function. |
| `OrdoDomus` grande | Separar em `AppShell`, `AuthenticatedApp`, `UnitGate`, `TabsContent`. |
| Falta de tratamento global de erro | Adicionar Error Boundary e logging remoto. |
