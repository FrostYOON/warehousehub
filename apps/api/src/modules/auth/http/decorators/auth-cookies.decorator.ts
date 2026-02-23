// apps/api/src/modules/auth/http/decorators/auth-cookies.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const AUTH_COOKIE_MODE = 'AUTH_COOKIE_MODE';
export type AuthCookieMode = 'set' | 'clear' | 'none';

export const SetAuthCookies = () => SetMetadata(AUTH_COOKIE_MODE, 'set');
export const ClearAuthCookies = () => SetMetadata(AUTH_COOKIE_MODE, 'clear');
