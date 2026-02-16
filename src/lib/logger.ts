type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const minLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'error';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}

export const logger = {
  debug(tag: string, ...args: unknown[]) {
    if (shouldLog('debug')) console.debug(`[${tag}]`, ...args);
  },
  info(tag: string, ...args: unknown[]) {
    if (shouldLog('info')) console.info(`[${tag}]`, ...args);
  },
  warn(tag: string, ...args: unknown[]) {
    if (shouldLog('warn')) console.warn(`[${tag}]`, ...args);
  },
  error(tag: string, ...args: unknown[]) {
    if (shouldLog('error')) console.error(`[${tag}]`, ...args);
  },
};
