# Regras de Negocio

## Indice

1. [Contexto de Dominio](#contexto-de-dominio)
2. [Unidades e Membros](#unidades-e-membros)
3. [Permissoes](#permissoes)
4. [Inventario](#inventario)
5. [Entrada Inteligente](#entrada-inteligente)
6. [Consumo e Auditoria](#consumo-e-auditoria)
7. [Validade e Reposicao](#validade-e-reposicao)
8. [Cupom Fiscal e Triagem](#cupom-fiscal-e-triagem)
9. [SaaS Admin](#saas-admin)
10. [Validacoes e Pontos Criticos](#validacoes-e-pontos-criticos)

## Contexto de Dominio

O sistema organiza itens fisicos por unidade. Uma unidade representa uma casa, apartamento, deposito ou outro espaco. Cada item possui localizacao logica:

- `comodo`: ambiente principal.
- `armario`: movel/eletrodomestico principal.
- `caixa`: subdivisao interna.

Exemplo de regra extraida do prompt Gemini:

```ts
"na prateleira 2 do freezer" -> armario: "freezer", caixa: "prateleira 2"
```

## Unidades e Membros

| Regra | Implementacao |
| --- | --- |
| Usuario autenticado pode criar unidade. | `Onboarding.handleCriarUnidade` insere em `unidades`. |
| Criador vira admin aprovado. | Insere em `membros_unidades` com `papel='admin'` e `status='aprovado'`. |
| Usuario pode solicitar acesso por codigo de unidade. | `Onboarding.handleEntrarUnidade` insere membro `convidado`/`pendente`. |
| Admin aprova ou rejeita solicitacoes. | RPCs `aprovar_membro` e `rejeitar_membro`. |
| Unidade ativa e persistida no browser. | `localStorage` chave `ordo_domus_unidade_ativa`. |

## Permissoes

| Perfil | Pode fazer |
| --- | --- |
| Nao autenticado | Ver modal de login/cadastro. |
| Autenticado sem unidade | Criar unidade ou solicitar entrada. |
| Membro pendente | Ver tela "Aguardando Aprovacao". |
| Convidado aprovado | Ver inventario em modo leitura via `GuestView`. |
| Admin aprovado | Gerenciar entrada, inventario, consumo, dashboard e membros. |
| System admin | Acessar dashboard global SaaS. |

Observacao: pelo codigo atual, RLS permite membros aprovados gerenciarem itens; a UI restringe convidados a leitura. Para seguranca real, se convidados nao devem escrever, a RLS deve diferenciar `papel`.

## Inventario

Campos funcionais:

| Campo | Regra |
| --- | --- |
| `nome` | Obrigatorio no banco; normalizado no frontend com capitalizacao simples. |
| `categoria` | Opcional; usada para agrupamentos e regra de consumivel. |
| `comodo` | Obrigatorio no banco; fallback "Nao informado" em extracao. |
| `armario`, `caixa` | Opcionais; detalham localizacao. |
| `validade` | Texto validado no frontend no formato brasileiro. |
| `quantidade` | Numerica; default 1; consumo nao permite reduzir abaixo de zero. |
| `deletado_em` | Soft delete; listagens devem filtrar `null`. |

## Entrada Inteligente

### Texto

1. Usuario digita frase livre.
2. `extractInventoryData` envia texto ao Gemini com data atual.
3. Gemini deve responder JSON conforme schema.
4. Frontend normaliza campos.
5. Usuario confirma ou edita.
6. `upsert_inventario` decide `ADD` ou `MERGE`.

### Audio

1. Browser solicita microfone com `navigator.mediaDevices.getUserMedia`.
2. `MediaRecorder` grava em `audio/webm;codecs=opus`, `audio/ogg;codecs=opus` ou `audio/webm`.
3. Audio vira Base64.
4. Gemini extrai item e transcricao.
5. Fluxo segue confirmacao humana.

### Regras de normalizacao

| Funcao | Regra |
| --- | --- |
| `formatarTexto` | Trim, primeira letra maiuscula, restante minusculo. |
| `formatarData` | Aceita `DD/MM`, `DD/MM/AAAA`, hifen, ano curto; rejeita mes invalido e anos fora de 2020-2099. |
| `formatarData` | Se ano passado for menor que ano atual, substitui pelo ano atual. |
| `isConsumivel` | Categorias duraveis nao entram em reposicao critica. |

## Consumo e Auditoria

| Operacao | Regra |
| --- | --- |
| Consumo | Subtrai exatamente 1 unidade. |
| Quantidade zero | Bloqueia consumo com toast de erro. |
| Desfazer consumo | Restaura quantidade original e registra movimento de `entrada`. |
| Edicao com mudanca de quantidade | Registra `entrada` se aumento, `consumo` se reducao. |
| Edicao sem mudanca de quantidade | Registra `ajuste` com quantidade 0. |
| Exclusao | Registra `exclusao` antes do soft delete. |

## Validade e Reposicao

| Regra | Implementacao |
| --- | --- |
| Vencido | `diffDays < 0`, card com alerta vermelho. |
| Vence muito em breve | `0 <= diffDays <= 7`, alerta critico. |
| Vence em breve | `7 < diffDays <= 30`, alerta amarelo. |
| Estoque critico | `quantidade <= 1` e categoria consumivel. |
| Duraveis fora da reposicao | `ferramentas`, `utensilios`, `eletrodomesticos`, `moveis`, `eletronicos`, `construcao`. |

## Cupom Fiscal e Triagem

1. Usuario escolhe imagem.
2. Imagem e comprimida no browser para WebP com largura maxima de 800px.
3. Gemini extrai lista de `{ item, quantidade, valor }`.
4. Sistema insere linhas em `importacoes_pendentes`.
5. `useTriage` carrega pendentes e consulta `dicionario_produtos`.
6. Nomes brutos sao comparados por `trim().toLowerCase()`.
7. Ao revisar item, o sistema preenche resultado com match quando houver.
8. Ao salvar item com `triage_id`, a linha pendente e removida.
9. Se existir `transcricao`, o dicionario e atualizado por `upsert`.

## SaaS Admin

| Regra | Implementacao |
| --- | --- |
| Apenas super-admin acessa metricas globais. | `is_system_admin` consulta `system_admins`. |
| UI so mostra botao se `isSystemAdmin=true`. | `MainHeader`. |
| Metricas globais agregam base inteira. | RPC `get_saas_metrics`. |

## Validacoes e Pontos Criticos

| Area | Risco |
| --- | --- |
| Papel convidado | UI restringe, mas RLS consolidada permite membros aprovados gerenciarem itens. |
| Quantidade | Campo numerico aceita `numeric`, mas frontend usa conversoes parciais e `any`. |
| Data de validade | Texto dificulta validacao centralizada no banco. |
| Dicionario | `nome_bruto_cupom` unico por unidade, bom para memoria; sem similaridade fuzzy. |
| Auditoria | Nao grava `user_id` em `movimentacoes_inventario`; rastreabilidade individual fica incompleta. |

