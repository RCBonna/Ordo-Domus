# Resumo Diario

## 2026-05-21

- Ajustado fluxo de `Compra realizada` para itens manuais da Lista de Compras: o formulario nao inicia mais com categoria `Geral` por padrao.
- Ao abrir a compra manual, o app busca item existente no inventario pelo nome normalizado e preenche categoria, comodo, armario, caixa e validade quando houver correspondencia, permitindo merge pela RPC `upsert_inventario` quando nome/local/validade coincidirem.
- Adicionada validacao para impedir conclusao da compra manual sem categoria e comodo preenchidos.
- Criado helper testavel para selecao do melhor item de inventario para compra manual, cobrindo caso como `Caixa de cerveja` reaproveitando categoria `Bebidas`.
- Validacoes locais: `npm run lint`, `npm test` e `npm run build` passaram.
- Blindado carregamento da aba Inventario contra requisicoes concorrentes/travadas: somente a requisicao mais recente atualiza estado, ha timeout de 20s e o estado vazio nao aparece enquanto a lista ainda esta carregando.
- Ajustado seletor de unidade no cabecalho: quando o usuario tem mais de uma unidade, clicar em qualquer ponto do bloco da unidade ativa abre uma lista suspensa para troca; com apenas uma unidade, o bloco permanece estatico.
- Executada validacao final da etapa: `npm run lint`, `npm test` e `npm run build` passaram, removendo a pendencia de build final que estava registrada na issue da Lista de Compras.
- Implementada e aplicada manualmente no Supabase a RPC `efetivar_importacao_cupom` para consolidar item triado de cupom fiscal em inventario, movimentacao, dicionario e limpeza da pendencia de forma transacional.
- RPC `efetivar_importacao_cupom` validada funcionalmente no app apos aplicacao manual do SQL; issue GitHub #11 fechada.
- Fluxos de edicao e exclusao no Inventario validados funcionalmente no app pelo usuario; issue GitHub #1 fechada.
- Iniciada issue #10: modal de triagem passou a permitir correcao inline de nome, categoria, comodo, armario, caixa, validade e quantidade; itens podem ser efetivados diretamente pela RPC e Smart Matches prontos podem ser aceitos em massa.
- Ajustes na triagem: modal recebeu scroll vertical real, OCR de cupom passou a retornar categoria sugerida, e campos alfabeticos sao normalizados com primeira letra maiuscula antes da efetivacao. SQL `categoria_sugerida` aplicado manualmente; redeploy da Edge Function ainda pendente.
- Adicionada acao UX de descarte completo da triagem com confirmacao explicita, mantendo tambem descarte individual por item.
- Smart Match da triagem evoluiu para usar normalizacao acento-insensivel, dicionario e inventario existente; itens agora recebem estado visual forte/possivel/fraco em verde/laranja/cinza e o inventario pode sugerir categoria, comodo, armario, caixa e validade.
- Ajustado Smart Match para nao preencher campos com item do inventario quando o estado e fraco; limite de possivel match ficou mais restritivo e categorias iniciais passaram a ter inferencia por tokens seguros, incluindo singular/plural simples.
- Cabecalho do modal de triagem reorganizado com botao explicito `Fechar`; categorias passaram por normalizacao canonica para evitar divergencias como `Bebida` versus `Bebidas` nos fluxos principais.

## 2026-05-20

- Validacao local parcial dos ajustes de inventario/P2.2 executada.
- Comandos verificados com sucesso: `npm run lint`, `npm test` e `npm run build`.
- App Vite iniciado em `http://127.0.0.1:3000/` e carregado ate a tela de login sem erros de console no navegador integrado.
- Validacao funcional completa de filtros, paginacao, edicao e exclusao ainda depende de sessao autenticada com dados no Supabase remoto.
- Issue GitHub #1 atualizada com o status da validacao parcial.
- Implementada correcao para busca acento-insensivel no inventario: frontend passa a usar RPC `get_inventory_page`, e a migration `20260520200000_inventory_unaccent_search_rpc.sql` cria `unaccent`, normalizacao de texto, indices trigram e filtros paginados server-side.
- Ajustada a migration de busca acento-insensivel para usar delimitadores nomeados (`$normalize_search_text$` e `$get_inventory_page$`), evitando erro de string dollar-quoted nao finalizada no SQL Editor.
- Simplificado o corpo da RPC `get_inventory_page`, removendo bloco `declare` e escapes manuais para evitar truncamento/erro no SQL Editor do Supabase.
- SQL da busca acento-insensivel aplicado manualmente no Supabase. Validacoes locais apos aplicacao informada: `npm run lint`, `npm test` e `npm run build` passaram.
- Ajustado fallback no frontend para carregar inventario pela consulta direta se a RPC `get_inventory_page` retornar erro 400.
- Ajustada a RPC para paginar com `row_number()` em vez de `limit/offset` com valores de CTE, e adicionado `notify pgrst, 'reload schema'`.
- SQL corrigido aplicado manualmente no Supabase. Validacao funcional confirmada no app: inventario voltou a listar dados e busca passou a funcionar independentemente de acentos.
- Iniciado MVP da Lista de Compras/Faltas: nova aba `FALTAS`, sugestoes automaticas para itens com `quantidade <= 1`, separacao visual entre `Faltando` e `Estoque baixo`, e navegacao direta para o item no inventario.
- Corrigida regra da Lista de Compras: sugestoes agora agregam registros pelo nome normalizado do produto, somam a quantidade total antes de marcar falta e consideram apenas categorias reponiveis, evitando falsos positivos como ferramentas/furadeira.
- Adicionada secao `Locais zerados` na aba Faltas para mostrar posicoes especificas com quantidade 0 sem transformar isso em compra falsa; badge de quantidade zero no card do inventario passou a usar cor de alerta.
- Ajustado alerta visual de validade no card do inventario: itens vencidos mostram `Ja venceu` em vermelho, vencimento em ate 7 dias usa alerta laranja e vencimento em ate 30 dias usa alerta amarelo.
- Revisada regra de classificacao de validade: calculo saiu do card para helper testavel `getValidityStatus`, usando data sem horario, aceitando `validade_date` ISO do banco e tratando `MM/AAAA` como ultimo dia do mes.
- Iniciada insercao manual na Lista de Compras: criada migration `lista_compras`, repository dedicado, formulario na aba Faltas, listagem de itens manuais pendentes e acao de remover/cancelar item manual.
- Insercao manual da Lista de Compras validada no app e SQL `20260520211500_create_shopping_list.sql` aplicado manualmente no Supabase.
- Implementado fluxo inicial de `Compra realizada` para itens manuais: formulario por item, upsert no inventario, registro em movimentacoes, status `comprado` na lista e remocao da lista ativa.
