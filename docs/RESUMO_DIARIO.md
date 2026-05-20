# Resumo Diario

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
