# Analise de Banco de Dados

## Indice

1. [Resumo](#resumo)
2. [Entidades](#entidades)
3. [Dicionario de Dados](#dicionario-de-dados)
4. [Relacionamentos](#relacionamentos)
5. [Indices](#indices)
6. [Constraints](#constraints)
7. [RLS](#rls)
8. [MER Textual](#mer-textual)
9. [Performance](#performance)
10. [Sugestoes](#sugestoes)

## Resumo

O banco e PostgreSQL via Supabase. O schema consolidado esta principalmente em `CriarSQL.sql`. Ha scripts auxiliares em `sql/` para RLS, upsert, soft delete e performance.

## Entidades

| Entidade | Tabela |
| --- | --- |
| Unidade | `unidades` |
| Membro de unidade | `membros_unidades` |
| Item de inventario | `itens_inventario` |
| Movimentacao | `movimentacoes_inventario` |
| Importacao pendente | `importacoes_pendentes` |
| Dicionario de produto | `dicionario_produtos` |
| Administrador global | `system_admins` |

## Dicionario de Dados

### `unidades`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid PK | Default `gen_random_uuid()`. |
| `nome` | text not null | Nome da unidade. |
| `codigo_convite` | text unique | Codigo de convite, embora UI atual copie `unidadeId`. |
| `criado_em` | timestamptz | Data de criacao. |

### `membros_unidades`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `unidade_id` | uuid PK/FK | FK para `unidades`. |
| `user_id` | uuid PK/FK | FK para `auth.users`. |
| `papel` | text | `admin` ou `convidado`. |
| `status` | text | `pendente` ou `aprovado`. |
| `adicionado_em` | timestamptz | Data da solicitacao/adicao. |

### `itens_inventario`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid PK | Identificador do item. |
| `unidade_id` | uuid FK | Multi-tenancy. |
| `nome` | text not null | Nome oficial. |
| `categoria` | text | Classificacao. |
| `comodo` | text not null | Ambiente. |
| `armario` | text | Local principal. |
| `caixa` | text | Subdivisao. |
| `validade` | text | Data em formato textual brasileiro. |
| `quantidade` | numeric | Default 1. |
| `criado_em` | timestamptz | Criacao. |
| `deletado_em` | timestamptz | Soft delete. |
| `deletado_por` | uuid FK | Usuario que removeu. |

### `movimentacoes_inventario`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid PK | Identificador. |
| `unidade_id` | uuid FK | Unidade. |
| `item_id` | uuid | Opcional. |
| `item_nome` | text not null | Snapshot do nome. |
| `categoria` | text | Snapshot. |
| `comodo` | text | Snapshot. |
| `quantidade` | numeric | Quantidade movimentada. |
| `tipo` | text | `entrada`, `consumo`, `ajuste`, `exclusao`. |
| `user_id` | uuid FK | Usuario autenticado responsavel pela movimentacao. |
| `criado_em` | timestamptz | Data. |

### `importacoes_pendentes`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid PK | Identificador. |
| `unidade_id` | uuid FK | Unidade. |
| `nome_bruto` | text not null | Nome extraido do cupom. |
| `quantidade` | numeric | Default 1. |
| `valor_unitario` | numeric | Valor extraido. |
| `match_id` | uuid FK | Possivel item relacionado. |
| `processado` | boolean | Default false. |
| `criado_em` | timestamptz | Criacao. |
| `expires_at` | timestamptz | Expira em 24h. |

### `dicionario_produtos`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid PK | Identificador. |
| `unidade_id` | uuid FK | Unidade. |
| `nome_bruto_cupom` | text not null | Chave bruta. |
| `nome_oficial_inventario` | text not null | Nome corrigido. |
| `categoria` | text | Categoria sugerida. |
| `comodo` | text | Comodo sugerido. |
| `criado_em` | timestamptz | Criacao. |

### `system_admins`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `user_id` | uuid PK/FK | Usuario super-admin. |
| `adicionado_em` | timestamptz | Data de concessao. |

## Relacionamentos

| Origem | Destino | Cardinalidade |
| --- | --- | --- |
| `unidades` | `membros_unidades` | 1:N |
| `auth.users` | `membros_unidades` | 1:N |
| `unidades` | `itens_inventario` | 1:N |
| `unidades` | `movimentacoes_inventario` | 1:N |
| `unidades` | `importacoes_pendentes` | 1:N |
| `unidades` | `dicionario_produtos` | 1:N |
| `itens_inventario` | `importacoes_pendentes.match_id` | 1:N opcional |

## Indices

Indices detectados:

- `idx_membros_unidades_user_id`
- `idx_membros_unidades_unidade_id`
- `idx_membros_unidades_status`
- `idx_itens_unidade_id`
- `idx_itens_categoria`
- `idx_movimentacoes_unidade_id`
- `idx_movimentacoes_criado_em`
- `idx_itens_unidade_nome_lower`
- `idx_itens_unidade_comodo_lower`
- `idx_itens_unidade_armario_lower`
- `idx_itens_unidade_caixa_lower`
- `idx_itens_upsert_lookup`
- `idx_itens_validade`
- `idx_importacoes_pendentes_unidade_id`
- `idx_importacoes_pendentes_expires_at`
- `idx_dicionario_unidade_nome`

## Constraints

| Constraint | Objetivo |
| --- | --- |
| PK composta `membros_unidades(unidade_id, user_id)` | Evitar duplicidade de membro na unidade. |
| Unique `unidades.codigo_convite` | Codigo unico. |
| Unique `itens_inventario(unidade_id, nome, comodo, armario, caixa, validade)` | Evitar duplicatas exatas. |
| Unique `dicionario_produtos(unidade_id, nome_bruto_cupom)` | Um mapeamento por nome bruto/unidade. |

## RLS

Tabelas com RLS:

- `unidades`
- `membros_unidades`
- `itens_inventario`
- `movimentacoes_inventario`
- `importacoes_pendentes`
- `dicionario_produtos`
- `system_admins`

A regra predominante e: usuario precisa ser membro aprovado da unidade.

## MER Textual

```text
auth.users 1---N membros_unidades N---1 unidades
unidades 1---N itens_inventario
unidades 1---N movimentacoes_inventario
unidades 1---N importacoes_pendentes
unidades 1---N dicionario_produtos
itens_inventario 1---N importacoes_pendentes (match opcional)
auth.users 1---0..1 system_admins
```

## Performance

Pontos positivos:

- indice composto para upsert;
- indices funcionais para busca normalizada;
- indice parcial por validade;
- limit de 50 no historico recente.

Pontos de atencao:

- busca frontend carrega inventario completo e filtra em memoria;
- validade como texto prejudica ordenacao por data no banco;
- graficos calculam tudo no cliente;
- `lower(trim(...))` exige indices exatamente compativeis.

## Sugestoes

1. Converter ou duplicar `validade` em campo `date`.
2. Adicionar `criado_por`/`atualizado_por` em itens e `user_id` em movimentacoes.
3. Adicionar checks para `papel`, `status` e `tipo`.
4. Criar migration unica consolidada e arquivar scripts antigos divergentes.
5. Criar views/RPCs agregadas para dashboard quando volume crescer.
