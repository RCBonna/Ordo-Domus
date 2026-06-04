# Relatório de Brainstorming Multi-Agente: Importação de Cupom Fiscal

Este documento registra a simulação de um processo de revisão estruturada (Multi-Agent Brainstorming) para a funcionalidade de "Importação de Cupom Fiscal via Imagem".

---

## 🛠️ Fase 1: Design Inicial (Primary Designer)

**Entendimento do Problema (Understanding Lock):**
O usuário quer adicionar itens ao inventário de forma massiva após uma compra. Em vez de registrar um a um (texto ou voz), ele deseja fotografar ou importar a imagem de um cupom fiscal. O sistema deve extrair os itens, quantidades e valores, colocar em uma área de "revisão" (tabela temporária), permitindo que ele descarte itens indesejados e direcione os válidos para seus devidos locais (ex: Despensa, Geladeira).

**Proposta de Arquitetura Inicial:**
1. **Captura (UI):** Botão na tela "Entrada" ativando a câmera do celular ou galeria (`<input type="file" accept="image/*" capture="environment" />`).
2. **Processamento (OCR/IA):** Enviar a imagem para a API do Gemini (já integrada ao projeto) com um prompt estruturado pedindo a devolução de um JSON no formato `[{nome_original, quantidade, valor_unitario}]`.
3. **Armazenamento Temporário:** Criar uma tabela `importacoes_pendentes` no Supabase. O backend insere os itens brutos lá.
4. **Interface de Triagem:** Uma tela onde o usuário vê os itens extraídos. Ele pode alterar o nome, escolher a categoria, local, ou excluir o item da lista.
5. **Efetivação:** Ao finalizar, os itens aprovados vão para `itens_inventario` e `movimentacoes_inventario`, e os temporários são deletados.

---

## 🧐 Fase 2: Ciclo de Revisões Estruturadas

### 1. Skeptic / Challenger Agent (O Crítico)
*Premissa: "Isso vai dar errado na produção. Por quê?"*

*   **Objeção 1 (Qualidade dos Dados):** Cupons fiscais são notórios por descrições horríveis e abreviadas (ex: `BISC RECH CHOC 130G`, `LT COND MOCA`). A extração da IA vai trazer lixo. Se o usuário tiver que reescrever o nome de 50 itens manualmente, será mais lento do que usar a entrada por voz. A funcionalidade será abandonada.
*   **Objeção 2 (Lixo no Banco):** Usuários vão iniciar a importação, ver 40 itens não processados, desistir e fechar o app. A tabela temporária `importacoes_pendentes` vai virar um cemitério de lixo digital.

### 2. Constraint Guardian Agent (O Guardião de Regras)
*Premissa: "Isso viola restrições de performance, custo ou privacidade?"*

*   **Objeção 3 (Custo de Tokens e Latência):** Enviar imagens em alta resolução para a API do Gemini para cada nota pode ser demorado (latência de 5 a 15 segundos) e consumir muitos tokens. A imagem precisa ser comprimida localmente (no browser) antes do upload.
*   **Objeção 4 (Privacidade):** Notas fiscais muitas vezes contêm o CPF do comprador, endereço ou os últimos 4 dígitos do cartão. A política de envio deve garantir que não armazenemos a imagem da nota no nosso banco (apenas os dados extraídos) para evitar vazamento de PII (Personal Identifiable Information).

### 3. User Advocate Agent (O Defensor do Usuário)
*Premissa: "Onde o usuário vai se frustrar ou ficar confuso?"*

*   **Objeção 5 (Fadiga de Decisão):** Uma lista de 50 itens na tela do celular é exaustiva. Obrigar o usuário a abrir um modal para cada item, selecionar "Categoria" e "Local" vai causar fadiga. É preciso permitir ações em massa (ex: "Selecionar todos os congelados -> Enviar para Freezer").
*   **Objeção 6 (Duplicidade):** Como lidamos com itens que o usuário já tem no estoque? Se o recibo diz "LEITE INT", e no estoque ele já cadastrou "Leite Integral", o sistema precisa fazer "match" automático para não criar cadastros duplicados.

---

## ⚖️ Fase 3: Integração & Arbitragem (Arbiter Agent)

**Decisões do Árbitro:**

*   **Resolução O1 (Qualidade) & O6 (Duplicidade): ACEITA.**
    *   *Ação:* O sistema precisará de um mecanismo de **"Memória de Mapeamento"** (Smart Match). Se o usuário disser que `LT COND MOCA` significa "Leite Condensado", o sistema salvará isso em uma tabela `dicionario_produtos`. Na próxima importação, o backend já substitui o nome feio pelo nome correto automaticamente.
*   **Resolução O2 (Lixo no Banco): ACEITA.**
    *   *Ação:* A tabela `importacoes_pendentes` existirá, mas os registros terão um `expires_at` de 24 horas. Podemos configurar uma rotina ou simplesmente não carregar no frontend itens velhos, apagando-os quando o usuário fizer uma nova importação.
*   **Resolução O3 (Latência da Imagem): ACEITA.**
    *   *Ação:* Implementar um compressor no frontend (ex: usar Canvas API) para reduzir a imagem para ~800px de largura e compressão WebP antes de bater na API do Gemini.
*   **Resolução O4 (Privacidade): ACEITA.**
    *   *Ação:* A imagem vai apenas "passear" pela memória (Blob) até o Gemini e será descartada. Nenhuma foto de cupom será salva no Supabase Storage.
*   **Resolução O5 (Fadiga de Decisão na UI): ACEITA.**
    *   *Ação:* A tela de triagem não será uma lista chata. Os itens farão auto-match. O que não fizer match ficará em um "Carrossel de Triagem rápida" ou numa lista com "Ações em Massa" (seleciona vários, aplica "Despensa").

---

## 📜 Log de Decisões (Decision Log)

| Decisão | Alternativa Considerada | Objeção / Motivo | Resolução e Racional |
| :--- | :--- | :--- | :--- |
| **API de OCR** | Usar Google Cloud Vision API ou AWS Textract. | Muito complexo e exige infraestrutura externa adicional. Custo extra. | Usar **Gemini 1.5 Flash**, já configurado no projeto. É excelente com imagens e devolve JSON formatado nativamente. |
| **Armazenamento de Estado** | Guardar os itens pendentes apenas no `localStorage` (navegador). | Se o usuário fechar o app, perde o progresso. Limita uso em múltiplos dispositivos. | Usar tabela temporária **`importacoes_pendentes` no Supabase** vinculada à `unidade_id`, com limpeza automática após 24h. |
| **Armazenamento da Foto** | Salvar foto no Supabase Storage para auditoria. | Risco de privacidade (CPF na nota) e custo de armazenamento de blobs desnecessários. | **Não salvar a imagem.** Manter estritamente em memória do navegador até enviar para o Gemini. |
| **Nomenclatura (Match)** | Forçar a IA a adivinhar o nome comercial correto (alucinação). | A IA pode inventar nomes errados ou não saber a marca exata. Causa frustração. | Usar IA apenas para extrair o nome bruto do papel. O sistema faz **Smart Match** baseado nas correções anteriores do usuário. |

---

## 🚀 Plano de Implementação Proposto (Passo a Passo)

Caso você aprove a ideia baseada nesta análise, seguiremos este plano:

**Passo 1: Banco de Dados**
1. Criar tabela `importacoes_pendentes` (id, unidade_id, nome_bruto, quantidade, valor, match_id, processado).
2. Criar tabela `dicionario_produtos` (unidade_id, nome_bruto_cupom, nome_oficial_inventario) para a inteligência de repetição.

**Passo 2: Integração da Câmera / OCR**
1. Adicionar botão "Importar Cupom" na aba Entrada.
2. Criar a lógica de compressão local da imagem usando um Canvas HTML para não gastar dados do usuário.
3. Criar a função em `geminiService.ts` que recebe a imagem em Base64 e pede o JSON.

**Passo 3: Interface de Triagem Rápida (Triage UI)**
1. Desenvolver a tela que lista os itens retornados pela IA.
2. Mostrar visualmente o que "Deu Match" automático (já sabe que é na despensa) e o que é "Item Novo" (precisa de atenção).
3. Criar botões de ação rápida: [Descartar], [Salvar].

**Passo 4: Efetivação**
1. Criar função RPC no Supabase para pegar os itens aprovados da tabela `importacoes_pendentes` e inseri-los em `itens_inventario` e criar os logs em `movimentacoes_inventario`.

---
**Status da Avaliação:** ✅ **APROVADO COM RESSALVAS UX/IA.**
A ideia é fantástica e agrega enorme valor ao Ordo Domus. Contudo, o sucesso dela depende 100% de não frustrar o usuário na correção dos nomes abreviados do supermercado. O "Dicionário de Produtos (Smart Match)" será o diferencial entre uma "ferramenta ok" e uma "ferramenta mágica".
