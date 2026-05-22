import * as Sentry from '@sentry/react';

type JsonRecord = Record<string, unknown>;
type SpanAttributes = Record<string, string | number | boolean>;
type ObservabilityLevel = 'info' | 'warning' | 'error';

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const LONG_NUMBER_PATTERN = /\b\d{6,}\b/g;
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'email',
  'imageBase64',
  'audioBase64',
  'password',
  'request_body',
  'text',
  'token',
  'transcricao',
]);

const dsn = import.meta.env.VITE_SENTRY_DSN;
const appVersion = import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_COMMIT_SHA;
const enabledFlag = import.meta.env.VITE_OBSERVABILITY_ENABLED;

export const isObservabilityEnabled = () =>
  Boolean(dsn) && enabledFlag !== 'false';

const scrubText = (value: string) =>
  value
    .replace(EMAIL_PATTERN, '[email]')
    .replace(UUID_PATTERN, '[uuid]')
    .replace(LONG_NUMBER_PATTERN, '[number]');

const scrubValue = (value: unknown, seen = new WeakSet<object>(), depth = 0): unknown => {
  if (typeof value === 'string') return scrubText(value);
  if (typeof value !== 'object' || value === null) return value;
  if (seen.has(value)) return '[circular]';
  if (depth > 5) return '[truncated]';

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, seen, depth + 1));
  }

  return Object.entries(value as JsonRecord).reduce<JsonRecord>((acc, [key, item]) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      acc[key] = '[redacted]';
    } else {
      acc[key] = scrubValue(item, seen, depth + 1);
    }
    return acc;
  }, {});
};

const scrubEvent = (event: Sentry.ErrorEvent): Sentry.ErrorEvent =>
  scrubValue(event) as Sentry.ErrorEvent;

const toSpanAttributes = (attributes?: JsonRecord): SpanAttributes | undefined => {
  if (!attributes) return undefined;

  return Object.entries(scrubValue(attributes) as JsonRecord).reduce<SpanAttributes>((acc, [key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

export const initObservability = () => {
  if (!isObservabilityEnabled()) return;

  Sentry.init({
    dsn,
    enabled: true,
    environment: import.meta.env.MODE,
    release: appVersion,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    beforeSend: (event) => scrubEvent(event),
  });
};

export const captureException = (error: unknown, context?: JsonRecord) => {
  if (!isObservabilityEnabled()) return;
  Sentry.captureException(error, {
    extra: context ? scrubValue(context) as JsonRecord : undefined,
  });
};

export const captureMessage = (message: string, level: ObservabilityLevel = 'info', context?: JsonRecord) => {
  if (!isObservabilityEnabled()) return;
  Sentry.captureMessage(scrubText(message), {
    level,
    extra: context ? scrubValue(context) as JsonRecord : undefined,
  });
};

export const addBreadcrumb = (message: string, data?: JsonRecord) => {
  if (!isObservabilityEnabled()) return;
  Sentry.addBreadcrumb({
    category: 'ordo-domus',
    message: scrubText(message),
    data: data ? scrubValue(data) as JsonRecord : undefined,
    level: 'info',
  });
};

export async function measureAsync<T>(
  name: string,
  operation: string,
  callback: () => Promise<T>,
  attributes?: JsonRecord,
): Promise<T> {
  if (!isObservabilityEnabled()) return callback();

  return Sentry.startSpan(
    {
      name,
      op: operation,
      attributes: toSpanAttributes(attributes),
    },
    callback,
  );
}

export const setObservabilityUser = (userId: string | null) => {
  if (!isObservabilityEnabled()) return;
  Sentry.setUser(userId ? { id: scrubText(userId) } : null);
};

export const clearObservabilityUser = () => {
  if (!isObservabilityEnabled()) return;
  Sentry.setUser(null);
};

export const ObservabilityErrorBoundary = Sentry.ErrorBoundary;
