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

export interface MergeDecision {
  action: 'MERGE' | 'ADD';
  matchIndex?: number;
  mergedItem?: ExtractedItem;
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

export async function mergeInventoryItem(newItem: ExtractedItem, existingItems: ExtractedItem[]): Promise<MergeDecision> {
  const prompt = `
Item Novo:
${JSON.stringify(newItem, null, 2)}

Lista de Itens Já Existentes:
${JSON.stringify(existingItems.map((item, index) => ({ index, ...item })), null, 2)}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Você é um motor de banco de dados inteligente. Sua tarefa é decidir se o 'Item Novo' deve ser somado a um existente na 'Lista de Itens Já Existentes' ou se deve ser criado um novo registro.\n\nRegras:\n1. Some (MERGE) se for o mesmo item, no mesmo local (cômodo, armário, caixa) e com a mesma validade. Considere equivalência semântica (ex: 'caixa azul' é o mesmo que 'caixa organizadora azul', 'dez/2025' é o mesmo que 'dezembro de 2025').\n2. Crie novo (ADD) se o nome for diferente, ou se o local for diferente, ou se a validade for diferente.\n\nSe MERGE, retorne o 'matchIndex' (o campo index do item correspondente na lista) e o 'mergedItem' com a quantidade somada.\nSe ADD, retorne apenas a ação ADD.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: {
            type: Type.STRING,
            description: "MERGE ou ADD"
          },
          matchIndex: {
            type: Type.NUMBER,
            description: "O índice do item na lista existente (obrigatório se MERGE)."
          },
          mergedItem: {
            type: Type.OBJECT,
            description: "O item com a quantidade somada (obrigatório se MERGE).",
            properties: {
              item: { type: Type.STRING },
              categoria: { type: Type.STRING },
              comodo: { type: Type.STRING },
              armario: { type: Type.STRING },
              caixa: { type: Type.STRING },
              validade: { type: Type.STRING },
              quantidade: { type: Type.NUMBER }
            }
          }
        },
        required: ["action"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Falha ao decidir o merge.");
  return JSON.parse(jsonStr) as MergeDecision;
}
