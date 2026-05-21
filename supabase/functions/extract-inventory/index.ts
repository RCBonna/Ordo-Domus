// @ts-nocheck
// Supabase Edge Function: authenticated Gemini extraction endpoint.
// Required secret: GEMINI_API_KEY

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVENTORY_SYSTEM_INSTRUCTION =
  "Você é um organizador de inventário profissional. Extraia as informações e retorne JSON. REGRA DE CLASSIFICAÇÃO VITAL: O campo 'armario' deve conter APENAS o Móvel ou Eletrodoméstico principal (ex: Geladeira, Freezer, Armário, Despensa). O campo 'caixa' deve conter as subdivisões internas, como Prateleiras, Gavetas, Caixas organizadoras ou Potes (ex: Prateleira 2, Gaveta de legumes, Pote azul). Exemplo: 'na prateleira 2 do freezer' -> armario: 'freezer', caixa: 'prateleira 2'. Se faltar dado, retorne string vazia ou null. Além disso, no campo 'transcricao', coloque o texto exato ou aproximado que foi dito/escrito. IMPORTANTE: Se o ano não for mencionado, use o ano da data de hoje fornecida.";

const inventoryResponseSchema = {
  type: "OBJECT",
  properties: {
    item: { type: "STRING" },
    categoria: { type: "STRING" },
    comodo: { type: "STRING" },
    armario: { type: "STRING" },
    caixa: { type: "STRING" },
    validade: { type: "STRING" },
    quantidade: { type: "NUMBER" },
    transcricao: {
      type: "STRING",
      description: "A transcrição literal ou resumida do que foi processado.",
    },
  },
  required: ["item", "categoria", "comodo", "armario", "caixa", "validade", "quantidade", "transcricao"],
};

const receiptResponseSchema = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      item: { type: "STRING", description: "Nome original bruto do produto no cupom" },
      categoria: {
        type: "STRING",
        description: "Categoria provável para inventário doméstico, por exemplo Bebidas, Alimentos, Limpeza, Higiene, Medicamentos, Pet, Descartáveis ou Geral",
      },
      quantidade: { type: "NUMBER" },
      valor: { type: "NUMBER", description: "Valor total ou unitário do item (opcional)" },
    },
    required: ["item", "categoria", "quantidade"],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function assertPayload(condition: boolean, message: string, status = 400) {
  if (!condition) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }
}

async function getAuthenticatedUser(supabaseUrl: string, anonKey: string, authorization: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      authorization,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Sessão inválida ou expirada."), { status: 401 });
  }

  return response.json();
}

async function assertApprovedAdminMembership(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  unidadeId: string,
  userId: string,
) {
  const params = new URLSearchParams({
    select: "unidade_id",
    unidade_id: `eq.${unidadeId}`,
    user_id: `eq.${userId}`,
    status: "eq.aprovado",
    papel: "eq.admin",
    limit: "1",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/membros_unidades?${params.toString()}`, {
    headers: {
      apikey: anonKey,
      authorization,
    },
  });

  if (!response.ok) {
    throw Object.assign(new Error("Não foi possível validar permissões da unidade."), { status: 403 });
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw Object.assign(new Error("Acesso negado: somente administradores aprovados podem usar extração por IA."), {
      status: 403,
    });
  }
}

async function callGemini(apiKey: string, model: string, body: unknown) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini ${model} falhou: ${response.status} ${raw.slice(0, 500)}`);
  }

  const parsed = JSON.parse(raw);
  const text = parsed?.candidates?.[0]?.content?.parts?.find((part: any) => typeof part.text === "string")?.text;
  if (!text) {
    throw new Error(`Resposta vazia da IA usando o modelo ${model}.`);
  }

  return JSON.parse(text);
}

async function tryGeminiModels(apiKey: string, models: string[], bodyFactory: (model: string) => unknown) {
  let lastError: unknown;

  for (const model of models) {
    try {
      return await callGemini(apiKey, model, bodyFactory(model));
    } catch (error) {
      console.warn(`[extract-inventory] Falha no modelo ${model}:`, error?.message || error);
      lastError = error;
    }
  }

  throw lastError || new Error("Falha ao extrair dados após tentar múltiplos modelos.");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    assertPayload(req.method === "POST", "Método não permitido.", 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const authorization = req.headers.get("Authorization");

    assertPayload(Boolean(supabaseUrl), "SUPABASE_URL não configurada.", 500);
    assertPayload(Boolean(anonKey), "SUPABASE_ANON_KEY não configurada.", 500);
    assertPayload(Boolean(geminiApiKey), "GEMINI_API_KEY não configurada.", 500);
    assertPayload(Boolean(authorization), "Authorization header obrigatório.", 401);

    const payload = await req.json();
    const { mode, unidadeId } = payload;

    assertPayload(["text", "audio", "receipt"].includes(mode), "Modo de extração inválido.");
    assertPayload(typeof unidadeId === "string" && unidadeId.length > 0, "unidadeId obrigatório.");

    const user = await getAuthenticatedUser(supabaseUrl, anonKey, authorization);
    await assertApprovedAdminMembership(supabaseUrl, anonKey, authorization, unidadeId, user.id);

    const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

    if (mode === "text") {
      assertPayload(typeof payload.text === "string" && payload.text.trim().length > 0, "Texto obrigatório.");
      assertPayload(payload.text.length <= 4000, "Texto excede o limite de 4000 caracteres.");

      const result = await tryGeminiModels(
        geminiApiKey,
        ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash-lite", "gemini-pro-latest"],
        () => ({
          contents: [
            {
              role: "user",
              parts: [{ text: `Hoje é dia ${today}. Extraia os dados de inventário da seguinte frase: "${payload.text}"` }],
            },
          ],
          systemInstruction: {
            parts: [{ text: INVENTORY_SYSTEM_INSTRUCTION }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: inventoryResponseSchema,
          },
        }),
      );

      return jsonResponse({ result });
    }

    if (mode === "audio") {
      assertPayload(typeof payload.audioBase64 === "string" && payload.audioBase64.length > 0, "Áudio obrigatório.");
      assertPayload(payload.audioBase64.length <= 10_000_000, "Áudio excede o limite permitido.");
      assertPayload(typeof payload.mimeType === "string" && payload.mimeType.startsWith("audio/"), "MIME de áudio inválido.");

      const cleanMimeType = payload.mimeType.split(";")[0];
      const result = await tryGeminiModels(
        geminiApiKey,
        ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash-lite", "gemini-pro-latest"],
        () => ({
          contents: [
            {
              role: "user",
              parts: [
                { text: `Hoje é dia ${today}. Ouça o áudio e extraia os dados de inventário. O áudio contém uma pessoa descrevendo o que está guardando.` },
                {
                  inlineData: {
                    mimeType: cleanMimeType,
                    data: payload.audioBase64,
                  },
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [{ text: INVENTORY_SYSTEM_INSTRUCTION }],
          },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: inventoryResponseSchema,
          },
        }),
      );

      return jsonResponse({ result });
    }

    assertPayload(typeof payload.imageBase64 === "string" && payload.imageBase64.length > 0, "Imagem obrigatória.");
    assertPayload(payload.imageBase64.length <= 8_000_000, "Imagem excede o limite permitido.");
    assertPayload(typeof payload.mimeType === "string" && payload.mimeType.startsWith("image/"), "MIME de imagem inválido.");

    const cleanMimeType = payload.mimeType.split(";")[0];
    const result = await tryGeminiModels(geminiApiKey, ["gemini-2.5-flash", "gemini-flash-latest"], () => ({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: 'Extraia todos os itens deste cupom fiscal ou nota fiscal. Retorne um JSON com a lista de itens, contendo "item" (nome original bruto do produto no papel), "categoria" (categoria provável para inventário doméstico), "quantidade" (número) e "valor" (número, valor total do item, se houver). Use categorias curtas e úteis como Bebidas, Alimentos, Limpeza, Higiene, Medicamentos, Pet, Descartáveis ou Geral. Não invente ou limpe muito os nomes, use a transcrição o mais fiel possível ao papel.',
            },
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: payload.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptResponseSchema,
      },
    }));

    return jsonResponse({ result });
  } catch (error) {
    const status = error?.status || 500;
    console.error("[extract-inventory] Erro:", error?.message || error);
    return jsonResponse({ error: error?.message || "Erro inesperado na extração." }, status);
  }
});
