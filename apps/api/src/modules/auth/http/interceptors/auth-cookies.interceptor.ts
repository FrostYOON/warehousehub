import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { map } from 'rxjs/operators';
import {
  AUTH_COOKIE_MODE,
  AuthCookieMode,
} from '../decorators/auth-cookies.decorator';
import { getAuthCookieConfig } from '../cookies.config';

type TokensPayload = {
  accessToken?: string;
  refreshToken?: string;
} & Record<string, unknown>;

function isTokensPayload(value: unknown): value is TokensPayload {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class AuthCookiesInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const mode =
      this.reflector.get<AuthCookieMode>(AUTH_COOKIE_MODE, ctx.getHandler()) ??
      'none';

    const res = ctx.switchToHttp().getResponse<Response>();
    const cfg = getAuthCookieConfig();

    return next.handle().pipe(
      map((data: unknown) => {
        if (mode === 'set') {
          if (!isTokensPayload(data)) return { ok: true };

          // data: { accessToken, refreshToken, ... }
          if (
            typeof data.accessToken === 'string' &&
            data.accessToken.length > 0
          ) {
            res.cookie(
              cfg.accessCookieName,
              data.accessToken,
              cfg.accessCookieOptions,
            );
          }
          if (
            typeof data.refreshToken === 'string' &&
            data.refreshToken.length > 0
          ) {
            res.cookie(
              cfg.refreshCookieName,
              data.refreshToken,
              cfg.refreshCookieOptions,
            );
          }

          // body에서 토큰 제거(프론트에 노출 안 함)
          const rest: Record<string, unknown> = { ...data };
          delete rest.accessToken;
          delete rest.refreshToken;
          return Object.keys(rest).length > 0 ? rest : { ok: true };
        }

        if (mode === 'clear') {
          res.clearCookie(cfg.accessCookieName, cfg.clearAccessCookieOptions);
          res.clearCookie(cfg.refreshCookieName, cfg.clearRefreshCookieOptions);
          return data;
        }

        return data;
      }),
    );
  }
}
