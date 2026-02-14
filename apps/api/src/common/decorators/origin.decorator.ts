import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RequestOrigin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    return origin ?? referer ?? null;
  },
);
