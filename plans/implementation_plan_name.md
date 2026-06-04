# Implementação do Perfil de Usuário e Exibição de Nome/E-mail

Este plano detalha a implementação da issue #24, cujo objetivo é exibir informações humanas (nome e e-mail) ao invés de apenas UUIDs nas listagens de membros e solicitações no modal de "Acesso à Unidade".

## User Review Required

> [!IMPORTANT]
> **Modelo de Dados (Tabela de Perfis)**
> Como não temos acesso público à tabela `auth.users` diretamente nas consultas comuns sem contornar permissões, a abordagem padrão (e recomendada pelo Supabase) é criar uma tabela de perfis na schema `public`. Eu sugiro o nome `public.usuarios` ou `public.perfis`. O plano propõe usar `public.perfis`. Você está de acordo com essa abordagem e com a nomenclatura?

> [!WARNING]
> **Fluxo de Preenchimento do Nome**
> O usuário precisará preencher o nome em algum momento. Atualmente, existe um componente `Onboarding.tsx`. O plano é adicionar uma etapa neste fluxo (ou um modal obrigatório caso o nome esteja vazio após o login) para coletar o nome. Essa abordagem está alinhada com a UX desejada?

## Proposed Changes

### Banco de Dados (Supabase)

A criação da tabela de perfis e a atualização das RPCs devem ser feitas através de uma nova migration na pasta `supabase/migrations/`, seguindo o padrão de nomenclatura (ex: `20260524000000_criar_perfis_usuarios.sql`). Além disso, deve-se registrar a mudança no arquivo `docs/supabase/SQL_MUDANCAS.md`.

#### [NEW] `supabase/migrations/20260524000000_criar_perfis_usuarios.sql`
- **Tabela `public.perfis`**:
  - `id` (uuid, primary key, referenciando `auth.users(id)` em cascade).
  - `nome` (text, nullable no início para compatibilidade com legados).
  - `email` (text, nullable).
  - `criado_em` (timestamptz, default now()).
  - `atualizado_em` (timestamptz, default now()).
- **Trigger em `auth.users`**:
  - Criar função e trigger de segurança (security definer) para inserir automaticamente uma linha na tabela `public.perfis` (com id e email) sempre que um novo usuário for criado no Supabase Auth.
- **Row Level Security (RLS)**:
  - Habilitar RLS em `public.perfis`.
  - Política de leitura: Qualquer usuário autenticado pode ler os perfis (ou, de forma mais restrita, usar uma função que verifique se possuem unidade em comum). Recomenda-se permitir leitura autenticada global para facilitar a exibição em listas de solicitações.
  - Política de atualização: O próprio usuário pode atualizar sua linha.
- **Atualização das RPCs (`listar_membros` e `listar_pendentes`)**:
  - Alterar as funções para fazer um `JOIN` com a tabela `public.perfis`.
  - Retornar as novas colunas `nome` e `email` no conjunto de resultados.

#### [MODIFY] `docs/supabase/SQL_MUDANCAS.md`
- Documentar a criação da tabela `perfis`, o trigger de sincronização com o auth e as modificações nas assinaturas e retornos das RPCs `listar_membros` e `listar_pendentes`.

---

### Frontend

#### [MODIFY] `src/components/AdminPanel.tsx`
- **Interface `UnitMember`**:
  - Adicionar os campos opcionais `nome?: string` e `email?: string`.
- **Renderização (Membros e Pendentes)**:
  - Substituir a exibição exclusiva do `user_id.slice(0, 18)`.
  - Priorizar a exibição do `membro.nome`. Se não existir, exibir o `membro.email`. Se nenhum existir, fazer o fallback para o UUID truncado, conforme requisitos.
  - Adicionar o e-mail como informação secundária de apoio (ex: em um texto menor e mais claro abaixo do nome).

#### [MODIFY] `src/components/Onboarding.tsx` (ou fluxo equivalente)
- **Coleta de Dados**:
  - Modificar o fluxo de onboarding para verificar se o usuário possui um `nome` cadastrado na tabela `public.perfis`.
  - Adicionar uma etapa inicial onde o usuário deve digitar seu "Nome de Exibição" antes de criar ou ingressar em uma unidade.
  - Salvar o nome fazendo um `update` ou `upsert` na tabela `public.perfis`.

#### [MODIFY] `src/hooks/useAuth.ts` (Opcional/Se aplicável)
- Se a aplicação armazena o perfil localmente ou em estado global, buscar o perfil da tabela `public.perfis` e expor o nome para outras telas (ex: menu do usuário, cabeçalho).

## Verification Plan

### Automated Tests
- Nenhuma suite de testes E2E foi listada, mas a issue menciona: "Cobrir com teste E2E ou teste de componente/fluxo equivalente." Se existirem testes com Playwright/Cypress, criaremos um teste garantindo que o AdminPanel exibe os nomes corretos após o mock do backend.

### Manual Verification
1. **Novo Cadastro**: Registrar um novo usuário e confirmar que ele passa pela tela de informar o nome, sendo salvo corretamente em `public.perfis`.
2. **Convite e Listagem**: Usar o código de uma unidade existente, ingressar com o novo usuário.
3. **Painel de Admin**: O criador da unidade abre a tela "Acesso à Unidade".
4. **Visualização**: Verificar que o novo membro aparece como pendente com seu Nome e E-mail, ao invés do UUID truncado.
5. **Fallback**: Remover o nome de um membro via banco e garantir que o UUID truncado ou apenas o e-mail apareça com clareza, sem quebrar o layout.
