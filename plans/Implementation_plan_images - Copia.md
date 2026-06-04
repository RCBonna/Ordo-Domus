# Plano de Implementação: Inventário por Foto de Local (Snapshot)

## Contexto e Objetivo
Implementar a funcionalidade de "Inventário Visual", permitindo que o usuário tire fotos de locais (geladeira, armários, despensas) para identificar, separar e contar os produtos automaticamente. O fluxo reaproveitará a experiência de usuário já existente para as Notas Fiscais Eletrônicas (NFC-e), onde os itens identificados são retornados pela IA e revisados em uma tabela antes de serem salvos no banco. 

## User Review Required

> [!IMPORTANT]  
> **Custos e Resolução das Imagens**  
> Diferente das Notas Fiscais que são fotos em PB/alto contraste, fotos de despensas e geladeiras são densas em detalhes e cores. Para que o modelo de IA consiga ler rótulos e separar itens no fundo, precisaremos enviar imagens em uma resolução maior (ex: 1080p). Isso aumenta levemente o custo de payload e tempo de processamento. Devemos manter o limite de compressão local alto ou você aprova aumentar a resolução/tamanho base64 do envio dessa modalidade?

> [!IMPORTANT]  
> **Modo Multimodal (Foto + Áudio)**  
> (Veja as ideias abaixo) Gostaria de incluir a gravação de áudio junto com a foto no MVP desta funcionalidade, ou começamos apenas com a foto e um botão de conferência?

## Ferramentas e Tecnologias Necessárias
1. **Modelos de IA**:
   - Recomendo fortemente **Gemini 2.5 Flash** (já utilizado em `extract-inventory`), pois tem excelente compressão visual espacial e velocidade absurda de inferência para "spatial understanding" e contagem de múltiplos objetos.
2. **Backend**:
   - **Supabase Edge Functions** (`extract-inventory/index.ts`): Será necessário adicionar um novo `mode` chamado `snapshot` (ou `location`), que aceitará a string base64 da foto e usará um prompt de visão computacional diferente do recibo.
3. **Frontend**:
   - API Nativa do Navegador / PWA (`<input type="file" accept="image/*" capture="environment">`) ou Capacitor Camera plugin.
   - Componentes de Compressor Local (ex: `browser-image-compression`) para otimizar o payload e proteger a privacidade (sem armazenar fotos brutas no DB).
   - Componente de Validação (O mesmo usado hoje para a NFC-e).

## Proposed Changes

### 1. Banco de Dados / Supabase (Backend)
#### [MODIFY] `supabase/functions/extract-inventory/index.ts`
- Adicionar no validador do payload o modo `snapshot`.
- Configurar políticas de limites na função `getRateLimitPolicy` para o `snapshot` (peso similar ao `receipt`).
- Adicionar o esquema de resposta e o prompt do Gemini para `snapshot`:
  ```json
  // Exemplo de Schema
  {
    "type": "ARRAY",
    "items": {
      "type": "OBJECT",
      "properties": {
        "item": { "type": "STRING", "description": "Nome da marca ou tipo do produto identificado" },
        "categoria": { "type": "STRING" },
        "quantidade": { "type": "NUMBER" },
        "validade": { "type": "STRING", "description": "Data de validade impressa na embalagem, caso esteja visível, formato MM/YYYY ou DD/MM/YYYY" }
      },
      "required": ["item", "categoria", "quantidade"]
    }
  }
  ```
- **Prompt da IA**: Instruir o Gemini a escanear a imagem, agrupar embalagens idênticas, inferir nomes de marcas se estiverem legíveis, inferir categorias domésticas básicas, e, de forma atenta, varrer a imagem em busca de carimbos de tinta no formato DD/MM/AA ou MM/AA que indiquem data de validade de um lote.

### 2. Frontend
#### [MODIFY] `src/components/...` (Interface de Captura e Entrada)
- Adicionar um novo botão "Foto da Despensa/Geladeira" perto da funcionalidade de Escanear NFC-e.
- Implementar a captura de imagem.
- Realizar a compressão da imagem em memória, com qualidade otimizada para legibilidade de texto.
- Disparar o endpoint REST `POST /functions/v1/extract-inventory` enviando `{"mode": "snapshot", "imageBase64": "...", "unidadeId": "..."}`.
- Conectar o retorno da requisição diretamente à tela/tabela que já existe e é utilizada para validar e revisar compras de NFC-e.

---

## 💡 Ideias e Propostas Complementares para o Fluxo

A captação visual em larga escala (tirar foto de uma despensa inteira) apresenta limitações físicas: a data de validade muitas vezes está escrita no fundo de uma lata, na tampa de um pote de iogurte ou nas dobras de um pacote, o que a torna "invisível" numa foto ampla de prateleira. Pensando nisso, seguem outras ideias que podemos integrar:

### Ideia 1: Leitura via Vídeo (Varredura Panorâmica)
- Em vez de uma foto que sofre de oclusão (um pote na frente do outro), o usuário poderia "gravar um vídeo de 5 a 10 segundos" e ir movendo o celular devagar e mostrando os itens e datas de cima.
- A API do Gemini processa nativamente vídeos de até dezenas de minutos. Mandaríamos o vídeo curto, e a IA usaria múltiplos quadros do vídeo para "ver atrás" dos potes que a câmera revelou.

### Ideia 2: Modo Foto + Áudio (O Fluxo Misto)
- O usuário tira a foto e, antes de enviar, segura um botão de áudio e fala:
  > *"Adicione esses itens. Aquele leite ninho vence mês que vem e as três latas de atum vencem em 2028."*
- O Gemini junta o áudio transcrito + a foto. Essa técnica é a que menos exige do usuário na hora de encontrar uma data que a câmera não pegou, sem a necessidade de digitar na tela pequena.

### Ideia 3: O Fluxo de 2 Passos (Censo Geral + Lote Específico)
1. **Passo 1:** Foto geral. A IA lista tudo (ex: 5 Caixas de Leite).
2. **Passo 2:** Na tela de revisão (como a tela da NFC-e), ao invés de digitar a data manualmente, você tem um pequeno botão de 📷 de "Scan Rápido de Data" do lado do campo validade daquele item. Ao clicar, abre a câmera com um quadradinho menor, e você só posiciona o carimbo do leite. A IA / OCR local converte o texto rápido apenas em data.

### Ideia 4: Integração Rápida de Código de Barras
- Um modo adicional que usa um scanner rápido via câmera (que é instantâneo e offline via API como `html5-qrcode`). Cada código de barras adiciona instantaneamente um produto em uma lista e depois puxamos apenas as informações da internet/OpenFoodFacts. Excelente para repor a despensa no dia a dia.

## Verification Plan

### Verificação de Backend
- Fazer uma requisição via cURL com uma foto real de uma geladeira cheia convertida para base64. Verificar se a IA consegue mapear uma lista correta de itens em um Array JSON, contendo nomes, contagem (ex: "3 latas de coca") e, ocasionalmente, capturar datas de validade quando forçadas a ficar legíveis na foto.

### Verificação de Interface
- Testar a inclusão da foto via upload de arquivo no computador e diretamente na câmera pelo celular.
- Certificar-se de que a listagem aproveita a tabela legada de NFC-e com perfeição, permitindo edições no item ou preenchimento manual da data de validade, caso a IA não tenha lido.
