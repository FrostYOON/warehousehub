import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerModule } from 'nestjs-pino';

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd && !isTest;

function resolveHttpLogLevel(): string {
  if (isTest) return 'silent';
  return process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');
}

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: resolveHttpLogLevel(),
        ...(isDev
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                  singleLine: false,
                  ignore: 'pid,hostname,req.headers,res.headers',
                  messageFormat:
                    '[{req.id}] {req.method} {req.url} -> {res.statusCode} ({responseTime}ms)',
                },
              },
            }
          : {}),
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.accessToken',
            'req.body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        genReqId: (req, res) => {
          const header = req.headers['x-request-id'];
          const candidate = Array.isArray(header) ? header[0] : header;
          const requestId =
            typeof candidate === 'string' && candidate.trim().length > 0
              ? candidate.trim()
              : randomUUID();
          res.setHeader('x-request-id', requestId);
          return requestId;
        },
        customLogLevel: (_req, res, err) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        customReceivedMessage: (req) =>
          `request started: ${req.method} ${req.url}`,
        customSuccessMessage: (req, res) =>
          `request completed: ${req.method} ${req.url} -> ${res.statusCode}`,
        customErrorMessage: (req, res, error) =>
          `request failed: ${req.method} ${req.url} -> ${res.statusCode} (${error.message})`,
      },
    }),
  ],
})
export class LoggingModule {}
