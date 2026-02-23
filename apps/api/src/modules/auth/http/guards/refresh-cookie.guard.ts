import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getAuthCookieConfig } from '../cookies.config';
import type { Request } from 'express';

@Injectable()
export class RefreshCookieGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const { refreshCookieName } = getAuthCookieConfig();

    const token = req?.cookies?.[refreshCookieName] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Refresh cookie missing');
    }
    return true;
  }
}
