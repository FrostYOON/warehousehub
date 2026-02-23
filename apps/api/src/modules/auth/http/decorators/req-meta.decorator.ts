import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type RequestMeta = {
  ip?: string;
  userAgent?: string;
  deviceId?: string;
  deviceName?: string;
};

function pickFirstForwardedFor(xff: string): string {
  return xff.split(',')[0]?.trim() ?? '';
}

function extractIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];

  const raw = Array.isArray(xff)
    ? xff[0]
    : typeof xff === 'string'
      ? pickFirstForwardedFor(xff)
      : req.ip;

  const ip = typeof raw === 'string' ? raw.trim() : '';
  return ip.length > 0 ? ip : undefined;
}

function extractUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  const userAgent = typeof ua === 'string' ? ua.trim() : '';
  return userAgent.length > 0 ? userAgent : undefined;
}

function extractHeaderString(req: Request, name: string): string | undefined {
  const v = req.headers[name.toLowerCase()];
  const s = Array.isArray(v) ? v[0] : v;
  const out = typeof s === 'string' ? s.trim() : '';
  return out.length > 0 ? out : undefined;
}

function extractDeviceId(req: Request): string | undefined {
  return (
    extractHeaderString(req, 'x-device-id') ??
    extractHeaderString(req, 'x-client-device-id')
  );
}

function extractDeviceName(req: Request): string | undefined {
  return (
    extractHeaderString(req, 'x-device-name') ??
    extractHeaderString(req, 'x-client-device-name')
  );
}

export const RequestMeta = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestMeta => {
    const req = ctx.switchToHttp().getRequest<Request>();

    return {
      ip: extractIp(req),
      userAgent: extractUserAgent(req),
      deviceId: extractDeviceId(req),
      deviceName: extractDeviceName(req),
    };
  },
);
export const ReqMeta = RequestMeta;
