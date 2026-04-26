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
      systemInstruction: "Você é um organizador de inventário profissional. Extraia as informações da frase fornecida e retorne um objeto JSON estrito com os campos solicitados. Se alguma informação não estiver presente na frase, use uma string vazia ou null conforme apropriado.",
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
            description: "O armário ou móvel específico onde o item está (ex: armário debaixo, prateleira superior).",
          },
          caixa: {
            type: Type.STRING,
            description: "A caixa ou recipiente onde o item foi colocado (ex: caixa organizadora azul).",
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
