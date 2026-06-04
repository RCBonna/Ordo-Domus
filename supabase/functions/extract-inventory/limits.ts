export type ExtractionMode = 'text' | 'audio' | 'receipt';

export interface AiExtractionLimitPolicy {
  maxRequests: number;
  windowSeconds: number;
  maxPayloadBytes: number;
  maxChars?: number;
  allowedMimeTypes: string[];
}

export const RATE_LIMIT_DEFAULTS: Record<ExtractionMode, AiExtractionLimitPolicy> = {
  text: {
    maxRequests: 20,
    windowSeconds: 600,
    maxChars: 4000,
    maxPayloadBytes: 16_000,
    allowedMimeTypes: [],
  },
  audio: {
    maxRequests: 8,
    windowSeconds: 3600,
    maxPayloadBytes: 7_500_000,
    allowedMimeTypes: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a'],
  },
  receipt: {
    maxRequests: 12,
    windowSeconds: 3600,
    maxPayloadBytes: 6_000_000,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'],
  },
};

export type PayloadEvaluation =
  | { allowed: true; payloadBytes: number }
  | { allowed: false; payloadBytes: number; reason: string; message: string; status: number };

export function normalizeMimeType(value: unknown) {
  return typeof value === 'string' ? value.split(';')[0].trim().toLowerCase() : '';
}

export function getBase64ByteLength(value: string) {
  const normalized = value.replace(/\s/g, '');
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

export function getPayloadBytes(mode: ExtractionMode, payload: Record<string, unknown>) {
  if (mode === 'text') {
    return new TextEncoder().encode(String(payload.text || '')).length;
  }

  if (mode === 'audio') {
    return getBase64ByteLength(String(payload.audioBase64 || ''));
  }

  return getBase64ByteLength(String(payload.imageBase64 || ''));
}

export function evaluateAiExtractionPayload(
  mode: ExtractionMode,
  payload: Record<string, unknown>,
  policy: AiExtractionLimitPolicy,
): PayloadEvaluation {
  const payloadBytes = getPayloadBytes(mode, payload);

  if (mode === 'text') {
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      return { allowed: false, payloadBytes, reason: 'missing_text', message: 'Texto obrigatório.', status: 400 };
    }

    const maxChars = policy.maxChars || RATE_LIMIT_DEFAULTS.text.maxChars || 4000;
    if (text.length > maxChars) {
      return {
        allowed: false,
        payloadBytes,
        reason: 'text_too_long',
        message: `Texto excede o limite de ${maxChars} caracteres.`,
        status: 413,
      };
    }
  }

  if (mode === 'audio') {
    const mimeType = normalizeMimeType(payload.mimeType);
    if (typeof payload.audioBase64 !== 'string' || payload.audioBase64.length === 0) {
      return { allowed: false, payloadBytes, reason: 'missing_audio', message: 'Áudio obrigatório.', status: 400 };
    }
    if (!policy.allowedMimeTypes.includes(mimeType)) {
      return {
        allowed: false,
        payloadBytes,
        reason: 'invalid_audio_mime',
        message: 'Formato de áudio não suportado para extração por IA.',
        status: 415,
      };
    }
  }

  if (mode === 'receipt') {
    const mimeType = normalizeMimeType(payload.mimeType);
    if (typeof payload.imageBase64 !== 'string' || payload.imageBase64.length === 0) {
      return { allowed: false, payloadBytes, reason: 'missing_image', message: 'Imagem obrigatória.', status: 400 };
    }
    if (!policy.allowedMimeTypes.includes(mimeType)) {
      return {
        allowed: false,
        payloadBytes,
        reason: 'invalid_image_mime',
        message: 'Formato de imagem não suportado para extração de cupom.',
        status: 415,
      };
    }
  }

  if (payloadBytes > policy.maxPayloadBytes) {
    return {
      allowed: false,
      payloadBytes,
      reason: 'payload_too_large',
      message: `Payload excede o limite de ${(policy.maxPayloadBytes / 1_000_000).toFixed(1)} MB para este modo.`,
      status: 413,
    };
  }

  return { allowed: true, payloadBytes };
}
