# Analise Backend

## Indice

1. [Modelo Backend](#modelo-backend)
2. [APIs e Superficie de Acesso](#apis-e-superficie-de-acesso)
3. [Controllers, Services e Repositories](#controllers-services-e-repositories)
4. [RPCs](#rpcs)
5. [Middlewares e Autorizacao](#middlewares-e-autorizacao)
6. [Autenticacao](#autenticacao)
7. [Validacoes](#validacoes)
8. [Logs e Erros](#logs-e-erros)
9. [Riscos](#riscos)
10. [Melhorias](#melhorias)

## Modelo Backend

Nao existe backend tradicional com controllers Express, services Node ou repositories server-side. O backend real e Supabase:

- Auth gerenciado.
- CRUD via PostgREST.
- Regras de autorizacao em RLS.
- Operacoes privilegiadas e atomicas em RPC PL/pgSQL.

A dependencia `express` esta instalada, mas nao ha arquivo usando `import express` ou criando servidor HTTP.

## APIs e Superficie de Acesso

| Tipo | Exemplos |
| --- | --- |
| Auth | `signInWithPassword`, `signUp`, `signOut`, `getSession`, `getUser`, `onAuthStateChange`. |
| Tabelas | `unidades`, `membros_unidades`, `itens_inventario`, `movimentacoes_inventario`, `importacoes_pendentes`, `dicionario_produtos`. |
| RPC | `upsert_inventario`, `listar_membros`, `aprovar_membro`, `get_saas_metrics`. |

## Controllers, Services e Repositories

Mapeamento conceitual:

| Conceito tradicional | Implementacao atual |
| --- | --- |
| Controller Auth | Componente `Auth` + Supabase Auth. |
| Controller Inventory | `useInventory`, `useExtraction`. |
| Service AI | `geminiService.ts`. |
| Repository | Chamadas `supabase.from(...).select/insert/update/delete`. |
| Service Admin | `AdminPanel` + RPCs PL/pgSQL. |
| Middleware Auth | Supabase Auth + JWT automaticamente enviado pelo SDK. |
| Middleware Authorization | RLS e guards dentro de RPCs. |

## RPCs

| RPC | Responsabilidade | Segurança |
| --- | --- | --- |
| `upsert_inventario` | Soma quantidade em item equivalente ou cria novo registro. | Verifica membro aprovado. |
| `listar_pendentes` | Lista membros pendentes da unidade. | Exige admin da unidade. |
| `listar_membros` | Lista todos os membros da unidade. | Exige admin da unidade. |
| `aprovar_membro` | Muda status para `aprovado`. | Exige admin da unidade. |
| `rejeitar_membro` | Remove membro/solicitacao. | Exige admin da unidade. |
| `is_system_admin` | Indica se usuario atual e super-admin. | Consulta `system_admins`. |
| `get_saas_metrics` | Agrega metricas globais. | Exige super-admin. |

## Middlewares e Autorizacao

No Supabase, a autorizacao e aplicada por:

1. JWT do usuario autenticado.
2. `auth.uid()` dentro de policies e funcoes.
3. RLS habilitado nas tabelas.

Exemplo de policy consolidada:

```sql
create policy "Leitura para membros aprovados"
  on itens_inventario for select
  using (
    deletado_em is null AND
    unidade_id in (
      select unidade_id
      from membros_unidades
      where user_id = auth.uid()
      and status = 'aprovado'
    )
  );
```

## Autenticacao

Fluxo:

1. Frontend chama `supabase.auth.signInWithPassword`.
2. Supabase retorna sessao.
3. SDK persiste sessao e renova token automaticamente.
4. `useAuth` escuta `onAuthStateChange`.
5. Queries subsequentes levam JWT.

Config relevante:

```ts
auth: {
  persistSession: true,
  autoRefreshToken: true,
  lock: async (_name, _acquireTimeout, fn) => fn(),
}
```

O lock customizado desabilita `navigator.locks` para evitar timeout em StrictMode/multiplas abas.

## Validacoes

| Local | Validacoes |
| --- | --- |
| Frontend | Campos obrigatorios em formularios, data, quantidade minima, audio vazio. |
| Gemini schema | Resposta JSON estruturada para texto/audio/cupom. |
| RPC | Membro aprovado/admin, merge deterministico. |
| Banco | PKs, FKs, unique de dicionario, unique de item/local. |

## Logs e Erros

O projeto usa `console.log`, `console.warn`, `console.error` e `toast`:

- logs detalhados em Auth, Gemini, receipt import e extraction;
- mensagens traduzidas em `Auth`;
- sem observabilidade remota;
- sem correlation id;
- sem tabela de erros.

## Riscos

| Risco | Impacto |
| --- | --- |
| Chave Gemini no frontend | Abuso de API e custo. |
| `SECURITY DEFINER` sem `search_path` fixo | Risco de hardening em PostgreSQL. |
| RPC historica com tabela singular | Pode quebrar se aplicada fora de ordem. |
| RLS permite todo aprovado gerenciar itens | Pode contradizer regra de convidado leitura. |
| Sem rate limit | Abuso de importacao/IA e writes. |

## Melhorias

1. Edge Functions para IA, rate limit e secret server-side.
2. Definir `set search_path` nas funcoes `SECURITY DEFINER`.
3. Revisar RLS para separar admin/convidado.
4. Criar migrations versionadas e idempotentes.
5. Inserir `user_id` nas movimentacoes.
6. Adicionar logs estruturados e rastreio de falhas de RPC.

