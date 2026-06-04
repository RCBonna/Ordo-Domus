# Analise de Performance

## Indice

1. [Resumo](#resumo)
2. [Frontend](#frontend)
3. [Banco](#banco)
4. [IA e Imagens](#ia-e-imagens)
5. [Gargalos](#gargalos)
6. [Recomendacoes](#recomendacoes)

## Resumo

Para um inventario domestico ou pequenas unidades, a arquitetura atual tende a performar bem. Os riscos aparecem com inventarios grandes, muitas movimentacoes, imagens frequentes e chamadas Gemini client-side.

## Frontend

Pontos positivos:

- Vite e React modernos.
- Componentizacao razoavel.
- Historico limitado a 50 registros.
- Imagem comprimida antes de Gemini.

Pontos de atencao:

- inventario completo carregado no cliente;
- busca e dashboard calculados em memoria;
- Recharts renderiza datasets derivados no render;
- sem memoizacao evidente para agregacoes pesadas.

## Banco

Indices especificos existem para upsert:

```sql
CREATE INDEX IF NOT EXISTS idx_itens_upsert_lookup ON itens_inventario (
  unidade_id,
  lower(trim(nome)),
  lower(trim(comodo)),
  lower(trim(armario)),
  lower(trim(caixa)),
  validade
) WHERE deletado_em IS NULL;
```

Esse indice e correto para o match deterministico, desde que a expressao da query seja compativel.

## IA e Imagens

Timeouts:

| Fluxo | Timeout |
| --- | --- |
| Texto | 15s por modelo |
| Audio | 15s por modelo |
| Cupom | 20s por modelo |
| Save DB | 10s |

Com multiplos fallbacks, a latencia maxima percebida pode ser alta se modelos falharem em sequencia.

## Gargalos

| Gargalo | Quando aparece |
| --- | --- |
| `select('*')` do inventario inteiro | Unidades com milhares de SKUs. |
| Dashboard client-side | Muitos itens/movimentacoes. |
| Gemini por imagem | Cupom grande ou rede ruim. |
| Sem paginacao | Listagem e guest view. |
| Datas textuais | Ordenacao/filtro de validade no cliente. |

## Recomendacoes

1. Adicionar paginacao ou busca server-side para inventario.
2. Criar views/RPCs para dashboard.
3. Memoizar agregacoes com `useMemo`.
4. Migrar validade para `date`.
5. Reduzir fallbacks Gemini em producao ou observar falhas por modelo.
6. Criar limpeza automatica de pendencias expiradas.
7. Monitorar tempo de RPC `upsert_inventario`.
