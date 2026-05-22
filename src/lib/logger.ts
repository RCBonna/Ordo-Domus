import { captureMessage } from './observability';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

const writeLog = (level: LogLevel, message: string) => {
  if (level === 'warn') {
    captureMessage(message, 'warning');
  } else if (level === 'error') {
    captureMessage(message, 'error');
  }

  if (!isDev) return;

  const prefix = `[OrdoDomus] ${message}`;

  if (level === 'error') {
    console.error(prefix);
  } else if (level === 'warn') {
    console.warn(prefix);
  } else if (level === 'info') {
    console.info(prefix);
  } else {
    console.debug(prefix);
  }
};

export const logger = {
  debug: (message: string) => writeLog('debug', message),
  info: (message: string) => writeLog('info', message),
  warn: (message: string) => writeLog('warn', message),
  error: (message: string) => writeLog('error', message),
};
