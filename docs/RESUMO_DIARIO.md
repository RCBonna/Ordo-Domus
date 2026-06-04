# Resumo Diario

## 2026-06-04

- Criada a issue GitHub #32 para ajustes de UX: orientar organizacao manual de arquivos importados e trocar o icone principal de administracao da unidade para configuracoes.
- Os toasts de sucesso de cupom e Inventario por Foto passaram a orientar o usuario a mover o arquivo original para a pasta de importados apos a leitura.
- O botao admin da tela principal passou de icone de compartilhamento para icone de configuracoes, mantendo o acesso ao mesmo modal da unidade.
- Criada e atualizada a issue GitHub #33 para avaliar tema claro/escuro: auditadas cores fixas por componente, registrado risco por superficie e proposta uma implementacao faseada sem ativar dark mode ainda.
- Iniciada a Fase 0 da issue #33: criado `useThemePreference` com suporte a `light`, `dark` e `system`, persistencia local por usuario, deteccao de `prefers-color-scheme` e aplicacao controlada da classe `.dark`, mantendo `light` como padrao seguro enquanto a UI nao foi convertida.
- Implementada a Fase 1 da issue #33: adicionado seletor de tema `Automatico`, `Claro` e `Escuro` no painel de configuracoes da unidade, reaproveitando a persistencia local da Fase 0 e validando persistencia por reload no E2E.
- Implementada a Fase 2 da issue #33: convertidos shell global, header, login, onboarding, estados iniciais, entrada, historico recente e configuracoes minimas do modal para suporte visual a tema escuro.
- Implementada a Fase 3 da issue #33: convertidos cards/lista de inventario, filtros, paginacao, lista de compras, locais zerados, grupos de reposicao e dashboard operacional para suporte visual a tema escuro.
- Implementada a Fase 4 da issue #33: convertidos triagem de importacoes, modais criticos, consentimento de IA, painel administrativo da unidade e dashboard SaaS para suporte visual a tema escuro.
- Implementada a Fase 5 da issue #33: refinado `aria-label` do fechamento do modal administrativo, ajustado fallback lazy para tema escuro, ampliado E2E para validar `Automatico` com sistema escuro e geradas capturas desktop/mobile de validacao visual em `test-results/theme-phase5`.
- Criada a issue GitHub #31 para o bug em que o Inventario por Foto nao avisava quando a mesma imagem ja havia sido lida anteriormente.
- Criada e aplicada a migration `20260604120500_create_import_source_history.sql`, adicionando a tabela `importacoes_fontes` para historico persistente por unidade, origem e hash da fonte.
- O fluxo de Inventario por Foto passou a consultar esse historico antes de chamar a IA, exibindo o aviso `Esta foto ja foi lida em...` com acao `Importar novamente`, espelhando a protecao ja existente no fluxo de cupom.
- Mantida a protecao de duplicata ainda pendente em `importacoes_pendentes`, avisando separadamente quando a mesma foto continua aberta na triagem.
- Atualizado o E2E autenticado de Inventario por Foto para validar imagem unica por execucao, descarte da triagem e reimportacao do mesmo arquivo com alerta historico.
- Validacoes: `npm run supabase:migrations:dry-run`, `npm run supabase:migrations:push`, `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram; Playwright executou 13 testes com sucesso.

## 2026-06-03

- Corrigido bug reportado nos inputs de local do Inventario por Foto: o autocomplete nativo do navegador foi desativado para `Cômodo da foto`, `Armário/local` e `Prateleira/caixa`, evitando sugestoes antigas/irrelevantes como nomes de produtos.
- Adicionadas sugestoes internas por `datalist` a partir dos locais ja usados no inventario da unidade, com filtro de armarios por comodo e de caixas/prateleiras por comodo + armario.
- A aba Entrada passou a carregar inventario tambem para alimentar as sugestoes de local do Inventario por Foto.
- Criada e fechada a issue GitHub #30 (`Bug - Autocomplete estranho nos locais do Inventario por Foto`) apos validacao.
- Validacoes da correcao dos inputs de local: `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram; Playwright executou 13 testes com sucesso.
- Revisado o plano inicial `plans/implementation_plan_name.md` da issue GitHub #24 (`Melhoria - Exibir nome e e-mail dos membros da unidade`).
- Atualizado `plans/implementation_plan_name-v1.md` como revisao consolidada, comparando o plano inicial com o estado atual de `AdminPanel`, `Onboarding`, `useAuth`, tipos de dominio e RPCs `listar_membros`/`listar_pendentes`.
- Recomendado fechar a decisao de nomenclatura em `public.perfis`, restringir leitura de perfis por proprio usuario/unidade em comum/RPC autorizada e evitar leitura global autenticada de todos os perfis.
- Mantido o trabalho em modo diagnostico: sem implementacao de frontend, sem migration aplicada e sem atualizacao de issue no GitHub.
- Criado `plans/Implementation_plan_images-v1.md` com plano tecnico para inventario por foto de local, reaproveitando triagem de NFC-e/cupom, adicionando modo `snapshot`, confianca por item, validade oportunista, rate limit, consentimento e alternativas futuras como video, foto+audio e codigo de barras.
- Avaliada a versao inicial `plans/Implementation_plan_images.md`, preservando o brainstorming e recomendando a v1 como plano de execucao por separar MVP de evolucoes e detalhar banco, backend, frontend, triagem e testes.
- Criadas as issues GitHub #25 a #29 para as fases do Inventario por Foto.
- Criado checkpoint Git `6048a3e` antes de iniciar as fases planejadas.
- Implementada a Fase 1 do Inventario por Foto: migration `20260603213000_snapshot_import_metadata.sql` adicionou `snapshot` ao rate limit de IA e metadados de origem/confianca/local sugerido em `importacoes_pendentes`.
- Migration da Fase 1 aplicada no Supabase e validada com `npm run supabase:migrations:dry-run`, retornando `Remote database is up to date`.
- Implementada a Fase 2 do Inventario por Foto: Edge Function `extract-inventory` passou a aceitar `mode=snapshot`, com schema JSON estruturado, prompt especifico para foto de local, limite proprio e testes de payload.
- Validacoes da Fase 2: `npm test -- --run supabase/functions/extract-inventory/limits.test.ts` passou com 7 testes e `npm run lint` passou.
- Edge Function `extract-inventory` redeployada no Supabase para disponibilizar o modo `snapshot`.
- Implementada a Fase 3 do Inventario por Foto: adicionado consentimento `snapshot`, service `extractInventoryDataFromSnapshot`, hook `useSnapshotImport`, compressao de imagem com limite 1400 x 1600 px e botao "Inventario por Foto" na tela de entrada.
- A captura de Inventario por Foto grava candidatos em `importacoes_pendentes` com origem `snapshot`, hash/metadados de origem, confianca, validade sugerida e local sugerido.
- Validacao da Fase 3: `npm run lint` passou.
- Implementada a Fase 4 do Inventario por Foto: a triagem passou a exibir origem do item, confianca, observacao da IA, marca/codigo quando disponiveis, validade sugerida e local sugerido.
- O modal foi renomeado para `Triagem de Importações`, preservando o fluxo de cupom e adicionando leitura visual clara para itens de foto.
- Validacao da Fase 4: `npm run lint` passou.
- Implementada a Fase 5 do Inventario por Foto: E2E autenticado passou a cobrir o fluxo mockado de `snapshot`, com criacao de triagem pendente, origem Foto, confianca e validade sugerida.
- Ajustados testes antigos para o novo titulo `Triagem de Importações` e para evitar ambiguidade entre a aba Inventario e o botao `Inventario por Foto`.
- Validacoes finais da Fase 5: `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram; Playwright executou 13 testes com sucesso.

## 2026-05-23

- Continuada a issue GitHub #15 (`P0 - Consolidar migrations Supabase`).
- Criada a migration inicial idempotente `20260501000000_initial_schema_baseline.sql` para substituir `CriarSQL.sql` como bootstrap manual de ambientes novos.
- A baseline cria tabelas, view, indices, constraint base, RLS e policies minimas sem recriar as policies legadas de escrita ampla que foram endurecidas em `20260519150000_harden_rls_roles.sql`.
- Validadas as migrations Supabase: antes da aplicacao, `migration list` mostrava `20260501000000` apenas em Local e `db push --dry-run` bloqueava por migration local anterior a ultima remota.
- Aplicada a baseline no Supabase com `supabase db push --include-all`; a execucao foi idempotente e reportou objetos existentes como `skipping`.
- Apos aplicacao, `npm run supabase:migrations:list` mostrou `20260501000000` e todas as migrations posteriores alinhadas em Local e Remote.
- Validacao final pos-reconciliacao: `npm run supabase:migrations:dry-run` retornou `Remote database is up to date`.
- Atualizadas as docs operacionais de Supabase e o arquivo unico `docs/supabase/SQL_MUDANCAS.md` com comandos, estado e observacoes da consolidacao.
- Iniciada a issue GitHub #16 (`P1 - Adicionar rate limit na Edge Function de IA`).
- Criada migration `20260523100000_ai_extraction_rate_limits.sql` com tabela `ai_extraction_events`, RLS para admins aprovados, indices de janela e limpeza operacional de eventos antigos.
- Edge Function `extract-inventory` passou a validar tamanho, MIME e limite por usuario/unidade/modo antes de chamar Gemini; limites padrao: texto 20/10min e 4000 caracteres, audio 8/h e 7.5 MB, cupom 12/h e 6 MB.
- Frontend ajustado para preservar mensagens especificas de limite, formato e payload retornadas pela Edge Function.
- Adicionados testes unitarios para caminho feliz de cupom, bloqueio de MIME de audio invalido, bloqueio de texto acima do limite, normalizacao de MIME e tamanho base64.
- Migration de rate limit aplicada no Supabase, Edge Function redeployada e `npm run supabase:migrations:list` confirmou `20260523100000` alinhada em Local e Remote.
- Iniciada a issue GitHub #17 (`P1 - Ativar E2E autenticado com seed no ambiente local/CI`).
- Playwright passou a carregar `.env.local` e `.env.e2e.local`, mantendo testes autenticados skipados explicitamente quando `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` nao existem.
- Seed E2E ampliado para Lista de Compras, incluindo item manual `E2E Pilha AA` alem dos dados de inventario, dicionario e triagem.
- Criado helper de login autenticado e nova spec `authenticated-workflows.spec.ts`, cobrindo Cupom com IA mockada, Triagem criada, Lista de Compras e insercao manual.
- CI passou a instalar Chromium e rodar Playwright quando variaveis publicas Supabase estiverem presentes; seed autenticado roda apenas com `E2E_SUPABASE_SERVICE_ROLE_KEY` e `E2E_USER_PASSWORD`.
- Documentado o fluxo local/CI em `docs/testing/E2E_AUTHENTICATED.md`, com variaveis, comandos, dados seed e comportamento de skip.
- Validacao sem credenciais autenticadas: `npm run test:e2e` passou com 3 testes publicos e 7 skips autenticados explicitos.
- Corrigida a validacao autenticada local da issue #17: `npm run test:e2e:seed` agora usa `node --use-system-ca`, aceita schema sem `unidades.codigo_convite` via fallback por nome/id e remove fisicamente itens seed `E2E %` do inventario para evitar colisao com `unique_item_location`.
- Ajustados testes E2E autenticados para seletores menos frageis, arquivo de cupom com imagem unica por execucao e item manual unico por execucao.
- Validacao autenticada real executada com `.env.e2e.local`: `npm run test:e2e:seed` passou e `npm run test:e2e` passou com 10 testes.
- Iniciada a issue GitHub #20 (`P2 - Implementar consentimento e privacidade para IA`).
- Adicionado consentimento local antes de enviar texto, audio ou imagem de cupom para a Edge Function de IA, com aceite persistido por usuario no `localStorage`.
- Documentada a retencao dos fluxos de IA em `docs/security/AI_PRIVACY_CONSENT.md` e atualizadas as analises de seguranca/requisitos.
- Iniciada a issue GitHub #21 (`No Dashboard SAAS`).
- Criada e aplicada a migration `20260523143000_saas_admin_dashboard_details.sql` com RPCs globais restritas a `system_admins` para snapshot SaaS, ativacao/inativacao de usuarios e aprovacao de convites.
- Dashboard SaaS passou a ter cards clicaveis e modais para unidades/membros, usuarios ativos, usuarios inativos, inventario global com filtros e convites pendentes com acao de aceite.
- Validado estado remoto das migrations: `npm run supabase:migrations:dry-run` retornou `Remote database is up to date` e `migration list` mostrou `20260523143000` em Local/Remote.
- Iniciada a issue GitHub #19 (`P2 - Criar tela de configurações da unidade`).
- Criada e aplicada a migration `20260523150000_unit_settings.sql` com RPC `atualizar_configuracao_unidade`, restrita a admins aprovados da unidade.
- Modal de administracao passou a incluir configuracoes basicas da unidade, edicao de nome, dados de governanca e espaco para preferencias futuras.
- Edicao de nome atualiza `unidadeAtiva`, lista de unidades e persistencia local sem recarregar o app.
- Iniciada a issue GitHub #18 (`P2 - Aplicar lazy load em telas pesadas`).
- Aplicado `React.lazy`/`Suspense` para `InventoryDashboard`, `SaasAdminDashboard`, `TriageModal` e `AdminAccessModal`.
- Build passou a separar chunks para dashboard operacional, dashboard SaaS e modais administrativos, reduzindo o JS inicial carregado.
- Criada a issue GitHub #23 para o bug em que o modal de configuracoes da unidade podia ficar preso em carregamento na area de acessos/membros.
- Corrigidos `AdminPanel` e `UnitSettingsPanel` com timeout, `try/catch/finally` e retorno visual acionavel, evitando spinner infinito e botao `Salvar` preso em processamento.
- Atualizado o E2E autenticado da configuracao da unidade para validar carregamento do painel de acessos e retorno do botao `Salvar` ao estado habilitado.
- Reaberta a issue #23 apos novo relato de spinner persistente; o timeout foi reforcado com `Promise.race` independente da propagacao de abort do Supabase.
- Adicionado E2E autenticado simulando `listar_membros` pendurado, validando que o spinner some e aparece a acao `Tentar novamente`.
- Ajustado o modal de administracao/configuracoes da unidade para ter scroll vertical real limitado a `100dvh`, evitando que o conteudo inferior fique fora da viewport em telas menores.
- Criada a issue GitHub #24 para melhoria funcional: capturar/gerenciar nome de usuario e exibir nome/e-mail dos membros e solicitantes no modal de acesso da unidade.

## 2026-05-22

- Corrigida normalizacao de validade antes da persistencia: entradas como `31/12` agora sao gravadas como data brasileira completa com o ano atual nos fluxos de entrada manual, triagem de cupom e RPCs de inventario.
- Adicionado teste unitario cobrindo o caso `31/12` sem ano informado.
- Usuario validou importacao de cupom, edicao inline, soma de itens iguais, aceite em massa de Smart Matches, bloqueio de duplicidade pendente e ajuste de datas.
- Criada migration `importacoes_cupons` para manter historico de hashes ja importados mesmo apos a triagem ser efetivada; frontend passa a avisar quando um cupom ja triado for importado novamente e oferece acao explicita para reimportar.
- Migration `20260522113000_create_receipt_import_history.sql` aplicada no Supabase; `npx supabase migration list` sincronizado e `npx supabase db push --dry-run` retornou `Remote database is up to date`.
- Usuario validou o fluxo de reimportacao de cupom ja triado: o app informa data/hora da importacao anterior e questiona se deve importar novamente.
- Iniciada issue #2 de captura de audio nativa: fluxo `MediaRecorder` ganhou deteccao de suporte do navegador, timer visivel, limite automatico de 60s, limpeza de tracks/timers e tratamento explicito de erro de gravacao/leitura.
- Usuario validou funcionalmente a captura de audio nativa: gravacao, processamento e fluxo de confirmacao funcionaram bem no app.
- Criada base E2E com Playwright: scripts `test:e2e`, `test:e2e:headed` e `test:e2e:ui`, smoke publico de autenticacao e fluxo autenticado opcional por `E2E_USER_EMAIL`/`E2E_USER_PASSWORD`.
- Validacoes locais da base E2E: `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram; E2E autenticado ficou skipado sem credenciais de teste.
- Criado seed E2E parametrizado por env: `npm run test:e2e:seed` cria/atualiza usuario Auth, unidade admin, itens de inventario, dicionario e pendencias de triagem; credenciais e `service_role` ficam fora do repositorio em `.env.e2e.local`.
- Testes autenticados de Playwright ampliados para usar seed: validam login operacional, Entrada com IA mockada, Inventario e Triagem quando `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` estiverem definidos.
- Iniciada observabilidade real: Sentry opcional via `@sentry/react`, Error Boundary global, scrubber de PII, usuario sem email, logger remoto para `warn`/`error` e spans em extracao por IA, inventario, efetivacao de cupom e dashboard.
- Validacoes da observabilidade: `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram; app local verificado em `http://127.0.0.1:3001/` sem erros de console; nao havia issue aberta no GitHub para atualizar.
- Refatorado `OrdoDomus.tsx`: estados de auth/unidade, modal administrativo e render das abas foram extraidos para componentes dedicados, mantendo o arquivo principal como composition root dos hooks e handlers globais.
- Consolidado `supabaseClient`: removida a copia legada `src/supabaseClient.ts`, mantendo `src/lib/supabaseClient.ts` como unica origem ativa com configuracao de auth/lock.
- Validacoes da consolidacao do `supabaseClient`: busca de imports legados sem ocorrencias ativas; `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passaram.
- Implementada retencao de pendencias expiradas: migration com `pg_cron`, funcao `cleanup_expired_pending_imports`, indice parcial para expiradas nao processadas e filtros frontend para nao exibir nem bloquear duplicidade com linhas vencidas.
- Migration `20260522205000_cleanup_expired_pending_imports.sql` aplicada no Supabase; `npx supabase db push --dry-run` confirmou `Remote database is up to date`.

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
- Ajustado layout dos botoes de entrada para evitar corte quando ha triagem pendente; triagem ganhou filtros dinamicos por match forte/possivel/fraco; criada e aplicada manualmente a migration de `cupom_hash` e `cupom_importado_em` para detectar reimportacao do mesmo cupom enquanto pendente e informar data/hora anterior ao usuario.
- Reconciliado historico de migrations Supabase via CLI; `npx supabase migration list` passou a mostrar as mesmas versoes em Local e Remote, e `npx supabase db push --dry-run` retornou `Remote database is up to date`. Adicionados scripts npm para listar, simular e aplicar migrations.
- Edge Function `extract-inventory` redeployada no Supabase; triagem passou a carregar pendencias, dicionario e inventario em paralelo com timeout explicito, mantendo dados atuais visiveis durante refresh. Edicao de item no inventario agora bloqueia campos enquanto salva, atualiza o card localmente ao concluir a gravacao e deixa o recarregamento remoto em segundo plano.

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
