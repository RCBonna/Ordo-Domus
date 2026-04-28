import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface ExtractedItem {
  item: string;
  categoria: string;
  comodo: string;
  armario: string;
  caixa: string;
  validade: string;
  quantidade: number;
}




export async function extractInventoryData(text: string): Promise<ExtractedItem> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extraia os dados de inventário da seguinte frase: "${text}"`,
    config: {
      systemInstruction: "Você é um organizador de inventário profissional. Extraia as informações e retorne JSON. REGRA DE CLASSIFICAÇÃO VITAL: O campo 'armario' deve conter APENAS o Móvel ou Eletrodoméstico principal (ex: Geladeira, Freezer, Armário, Despensa). O campo 'caixa' deve conter as subdivisões internas, como Prateleiras, Gavetas, Caixas organizadoras ou Potes (ex: Prateleira 2, Gaveta de legumes, Pote azul). Exemplo: 'na prateleira 2 do freezer' -> armario: 'freezer', caixa: 'prateleira 2'. Se faltar dado, retorne string vazia ou null.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          item: {
            type: Type.STRING,
            description: "O nome do item guardado (ex: caixas de leite, martelo, etc).",
          },
          categoria: {
            type: Type.STRING,
            description: "A categoria lógica do item (ex: Alimentos, Ferramentas, Limpeza, etc).",
          },
          comodo: {
            type: Type.STRING,
            description: "O cômodo da casa onde o item foi guardado (ex: cozinha, garagem, quarto).",
          },
          armario: {
            type: Type.STRING,
            description: "O móvel ou eletrodoméstico principal (ex: Geladeira, Armário da pia, Rack).",
          },
          caixa: {
            type: Type.STRING,
            description: "A subdivisão interna, prateleira, gaveta ou caixa (ex: Prateleira 2, Gaveta inferior, Pote de vidro).",
          },
          validade: {
            type: Type.STRING,
            description: "A data de validade do item, se houver (ex: dezembro de 2025).",
          },
          quantidade: {
            type: Type.NUMBER,
            description: "A quantidade de itens guardados.",
          },
        },
        required: ["item", "categoria", "comodo", "armario", "caixa", "validade", "quantidade"],
      },
    },
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) {
    throw new Error("Não foi possível extrair os dados.");
  }

  return JSON.parse(jsonStr) as ExtractedItem;
}



