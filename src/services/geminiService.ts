import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Modelo base - Modelos suportados atualmente na API
const MODEL_NAME = "gemini-2.5-flash";

export interface ExtractedItem {
  item: string;
  categoria: string;
  comodo: string;
  armario: string;
  caixa: string;
  validade: string;
  quantidade: number;
  tipo?: 'entrada' | 'consumo';
  data?: string;
  transcricao?: string;
}

const SYSTEM_INSTRUCTION = "Você é um organizador de inventário profissional. Extraia as informações e retorne JSON. REGRA DE CLASSIFICAÇÃO VITAL: O campo 'armario' deve conter APENAS o Móvel ou Eletrodoméstico principal (ex: Geladeira, Freezer, Armário, Despensa). O campo 'caixa' deve conter as subdivisões internas, como Prateleiras, Gavetas, Caixas organizadoras ou Potes (ex: Prateleira 2, Gaveta de legumes, Pote azul). Exemplo: 'na prateleira 2 do freezer' -> armario: 'freezer', caixa: 'prateleira 2'. Se faltar dado, retorne string vazia ou null. Além disso, no campo 'transcricao', coloque o texto exato ou aproximado que foi dito/escrito. IMPORTANTE: Se o ano não for mencionado, use o ano da data de hoje fornecida.";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING },
    categoria: { type: Type.STRING },
    comodo: { type: Type.STRING },
    armario: { type: Type.STRING },
    caixa: { type: Type.STRING },
    validade: { type: Type.STRING },
    quantidade: { type: Type.NUMBER },
    transcricao: { 
      type: Type.STRING,
      description: "A transcrição literal ou resumida do que foi processado."
    },
  },
  required: ["item", "categoria", "comodo", "armario", "caixa", "validade", "quantidade", "transcricao"],
};


export async function extractInventoryData(text: string): Promise<ExtractedItem> {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  const modelosParaTentar = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-pro-latest"
  ];

  let ultimoErro = null;

  for (const modelo of modelosParaTentar) {
    try {
      console.log(`[Gemini TEXTO] Tentando modelo: ${modelo}`);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout de 15s atingido no modelo ${modelo}.`)), 15000)
      );

      const responsePromise = ai.models.generateContent({
        model: modelo,
        contents: [{ role: 'user', parts: [{ text: `Hoje é dia ${dataAtual}. Extraia os dados de inventário da seguinte frase: "${text}"` }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const response: any = await Promise.race([responsePromise, timeoutPromise]);

      const jsonStr = response.text;
      if (!jsonStr) {
        throw new Error(`Resposta vazia da IA usando o modelo ${modelo}.`);
      }

      console.log(`[Gemini TEXTO] Sucesso com modelo: ${modelo}`);
      return JSON.parse(jsonStr) as ExtractedItem;
    } catch (error: any) {
      console.warn(`[Gemini TEXTO] Falha ao usar o modelo ${modelo}:`, error.message || error);
      ultimoErro = error;
    }
  }

  console.error("[Gemini TEXTO] Todas as tentativas de fallback falharam. Último erro:", ultimoErro);
  throw ultimoErro || new Error("Falha ao extrair texto após tentar múltiplos modelos.");
}

export async function extractInventoryDataFromAudio(audioBase64: string, mimeType: string): Promise<ExtractedItem> {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const cleanMimeType = mimeType.split(';')[0];
  
  const modelosParaTentar = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-pro-latest"
  ];

  let ultimoErro = null;

  for (const modelo of modelosParaTentar) {
    try {
      console.log(`[Gemini AUDIO] Tentando extração com o modelo: ${modelo}`);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout de 15s atingido no modelo ${modelo}.`)), 15000)
      );

      const responsePromise = ai.models.generateContent({
        model: modelo,
        contents: [
          {
            role: "user",
            parts: [
              { text: `Hoje é dia ${dataAtual}. Ouça o áudio e extraia os dados de inventário. O áudio contém uma pessoa descrevendo o que está guardando.` },
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: audioBase64
                }
              }
            ]
          }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const response: any = await Promise.race([responsePromise, timeoutPromise]);

      const jsonStr = response.text;
      if (!jsonStr) {
        throw new Error(`Resposta vazia da IA usando o modelo ${modelo}.`);
      }

      console.log(`[Gemini AUDIO] Extração bem-sucedida usando o modelo: ${modelo}`);
      return JSON.parse(jsonStr) as ExtractedItem;
    } catch (error: any) {
      console.warn(`[Gemini AUDIO] Falha ao usar o modelo ${modelo}:`, error.message || error);
      ultimoErro = error;
    }
  }

  console.error("[Gemini AUDIO] Todas as tentativas de fallback falharam. Último erro:", ultimoErro);
  throw ultimoErro || new Error("Falha ao extrair áudio após tentar múltiplos modelos.");
}
