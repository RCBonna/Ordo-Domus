// @ts-nocheck
// Supabase Edge Function: authenticated Gemini extraction endpoint.
// Required secret: GEMINI_API_KEY
import {
  RATE_LIMIT_DEFAULTS,
  evaluateAiExtractionPayload,
  normalizeMimeType,
} from "./limits.ts";

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

function envInt(name: string, fallback: number, min: number, max: number) {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    console.warn(`[extract-inventory] Variável ${name} inválida; usando padrão ${fallback}.`);
    return fallback;
  }

  return Math.floor(value);
}

function getRateLimitPolicy(mode: "text" | "audio" | "receipt") {
  if (mode === "text") {
    return {
      ...RATE_LIMIT_DEFAULTS.text,
      maxRequests: envInt("AI_TEXT_RATE_LIMIT", RATE_LIMIT_DEFAULTS.text.maxRequests, 1, 1000),
      windowSeconds: envInt("AI_TEXT_RATE_WINDOW_SECONDS", RATE_LIMIT_DEFAULTS.text.windowSeconds, 60, 86_400),
      maxChars: envInt("AI_TEXT_MAX_CHARS", RATE_LIMIT_DEFAULTS.text.maxChars, 1, 20_000),
      maxPayloadBytes: envInt("AI_TEXT_MAX_BYTES", RATE_LIMIT_DEFAULTS.text.maxPayloadBytes, 1, 200_000),
    };
  }

  if (mode === "audio") {
    return {
      ...RATE_LIMIT_DEFAULTS.audio,
      maxRequests: envInt("AI_AUDIO_RATE_LIMIT", RATE_LIMIT_DEFAULTS.audio.maxRequests, 1, 1000),
      windowSeconds: envInt("AI_AUDIO_RATE_WINDOW_SECONDS", RATE_LIMIT_DEFAULTS.audio.windowSeconds, 60, 86_400),
      maxPayloadBytes: envInt("AI_AUDIO_MAX_BYTES", RATE_LIMIT_DEFAULTS.audio.maxPayloadBytes, 1_000, 50_000_000),
    };
  }

  return {
    ...RATE_LIMIT_DEFAULTS.receipt,
    maxRequests: envInt("AI_RECEIPT_RATE_LIMIT", RATE_LIMIT_DEFAULTS.receipt.maxRequests, 1, 1000),
    windowSeconds: envInt("AI_RECEIPT_RATE_WINDOW_SECONDS", RATE_LIMIT_DEFAULTS.receipt.windowSeconds, 60, 86_400),
    maxPayloadBytes: envInt("AI_RECEIPT_MAX_BYTES", RATE_LIMIT_DEFAULTS.receipt.maxPayloadBytes, 1_000, 50_000_000),
  };
}

async function insertAiExtractionEvent(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  event: {
    unidade_id: string;
    user_id: string;
    mode: "text" | "audio" | "receipt";
    payload_bytes: number;
    allowed: boolean;
    reason?: string;
  },
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/ai_extraction_events`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const raw = await response.text();
    console.warn(`[extract-inventory] Falha ao registrar tentativa de IA: ${response.status} ${raw.slice(0, 300)}`);
  }
}

async function countRecentAiExtractionEvents(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  unidadeId: string,
  userId: string,
  mode: "text" | "audio" | "receipt",
  windowSeconds: number,
) {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const params = new URLSearchParams({
    select: "id",
    unidade_id: `eq.${unidadeId}`,
    user_id: `eq.${userId}`,
    mode: `eq.${mode}`,
    created_at: `gte.${windowStart}`,
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/ai_extraction_events?${params.toString()}`, {
    method: "HEAD",
    headers: {
      apikey: anonKey,
      authorization,
      Prefer: "count=exact",
    },
  });

  if (!response.ok) {
    const raw = await response.text();
    throw Object.assign(new Error(`Não foi possível validar limite de uso da IA: ${raw.slice(0, 300)}`), { status: 503 });
  }

  const contentRange = response.headers.get("content-range") || "";
  const total = Number(contentRange.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

async function assertAiUsageLimit(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  unidadeId: string,
  userId: string,
  mode: "text" | "audio" | "receipt",
  payload: Record<string, unknown>,
) {
  const policy = getRateLimitPolicy(mode);
  const payloadCheck = evaluateAiExtractionPayload(mode, payload, policy);
  const payloadBytes = payloadCheck.payloadBytes;

  const block = async (reason: string, message: string, status = 429) => {
    await insertAiExtractionEvent(supabaseUrl, anonKey, authorization, {
      unidade_id: unidadeId,
      user_id: userId,
      mode,
      payload_bytes: payloadBytes,
      allowed: false,
      reason,
    });
    throw Object.assign(new Error(message), { status });
  };

  if (!payloadCheck.allowed) {
    await block(payloadCheck.reason, payloadCheck.message, payloadCheck.status);
  }

  const recentCount = await countRecentAiExtractionEvents(
    supabaseUrl,
    anonKey,
    authorization,
    unidadeId,
    userId,
    mode,
    policy.windowSeconds,
  );

  if (recentCount >= policy.maxRequests) {
    const waitMinutes = Math.max(1, Math.ceil(policy.windowSeconds / 60));
    await block(
      "rate_limited",
      `Limite de uso da IA atingido para este modo. Tente novamente em até ${waitMinutes} minutos.`,
      429,
    );
  }

  await insertAiExtractionEvent(supabaseUrl, anonKey, authorization, {
    unidade_id: unidadeId,
    user_id: userId,
    mode,
    payload_bytes: payloadBytes,
    allowed: true,
    reason: "accepted",
  });
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
    await assertAiUsageLimit(supabaseUrl, anonKey, authorization, unidadeId, user.id, mode, payload);

    const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

    if (mode === "text") {
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
      const cleanMimeType = normalizeMimeType(payload.mimeType);
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

    const cleanMimeType = normalizeMimeType(payload.mimeType);
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
