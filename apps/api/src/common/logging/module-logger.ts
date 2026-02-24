import pino, { type Logger } from 'pino';

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd && !isTest;

function resolveModuleLogLevel(): string {
  if (isTest) return 'silent';
  return process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');
}

const baseLogger = pino({
  level: resolveModuleLogLevel(),
  redact: {
    paths: [
      'password',
      'passwordHash',
      'accessToken',
      'refreshToken',
      'authorization',
      'cookie',
    ],
    censor: '[REDACTED]',
  },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export function getModuleLogger(context: string): Logger {
  return baseLogger.child({ context });
}
