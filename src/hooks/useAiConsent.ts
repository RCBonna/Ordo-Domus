import { useCallback, useMemo, useRef, useState } from 'react';

export type AiConsentScope = 'text' | 'audio' | 'receipt';

export interface AiConsentRequest {
  scope: AiConsentScope;
  title: string;
  description: string;
}

interface StoredAiConsent {
  acceptedAt: string;
  version: 1;
}

const AI_CONSENT_STORAGE_PREFIX = 'ordo_domus_ai_consent_v1';

const scopeCopy: Record<AiConsentScope, Omit<AiConsentRequest, 'scope'>> = {
  text: {
    title: 'Uso de IA para texto',
    description: 'O texto digitado será enviado à função segura de IA para extrair item, quantidade, categoria e local.',
  },
  audio: {
    title: 'Uso de IA para áudio',
    description: 'O áudio gravado será convertido e enviado à função segura de IA para transcrição e extração dos dados do item.',
  },
  receipt: {
    title: 'Uso de IA para cupom',
    description: 'A imagem do cupom será comprimida no navegador e enviada à função segura de IA para identificar os itens.',
  },
};

export function useAiConsent(userKey?: string | null) {
  const storageKey = useMemo(() => {
    const normalizedUserKey = userKey?.trim().toLowerCase();
    return normalizedUserKey
      ? `${AI_CONSENT_STORAGE_PREFIX}:${normalizedUserKey}`
      : AI_CONSENT_STORAGE_PREFIX;
  }, [userKey]);

  const [request, setRequest] = useState<AiConsentRequest | null>(null);
  const pendingResolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const hasConsent = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<StoredAiConsent>;
      return parsed.version === 1 && Boolean(parsed.acceptedAt);
    } catch {
      return false;
    }
  }, [storageKey]);

  const ensureAiConsent = useCallback(async (scope: AiConsentScope) => {
    if (typeof window === 'undefined') return false;
    if (hasConsent()) return true;

    if (pendingResolverRef.current) {
      setRequest({ scope, ...scopeCopy[scope] });
      return false;
    }

    setRequest({ scope, ...scopeCopy[scope] });

    return new Promise<boolean>((resolve) => {
      pendingResolverRef.current = resolve;
    });
  }, [hasConsent]);

  const acceptAiConsent = useCallback(() => {
    const payload: StoredAiConsent = {
      acceptedAt: new Date().toISOString(),
      version: 1,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    pendingResolverRef.current?.(true);
    pendingResolverRef.current = null;
    setRequest(null);
  }, [storageKey]);

  const declineAiConsent = useCallback(() => {
    pendingResolverRef.current?.(false);
    pendingResolverRef.current = null;
    setRequest(null);
  }, []);

  return {
    aiConsentRequest: request,
    acceptAiConsent,
    declineAiConsent,
    ensureAiConsent,
  };
}
