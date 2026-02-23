import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getAuthCookieConfig } from '../cookies.config';
import type { Request } from 'express';

export const RefreshToken = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const { refreshCookieName } = getAuthCookieConfig();
    const token = req?.cookies?.[refreshCookieName] as string | undefined;
    return token ?? undefined;
  },
);
