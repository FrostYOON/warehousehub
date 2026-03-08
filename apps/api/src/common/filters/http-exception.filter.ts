import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

/** 응답 형식: { code, message, details } */
export interface HttpExceptionResponse {
  code: string;
  message: string;
  details?: unknown;
}

/** Prisma 에러 코드 → HTTP 상태 매핑 */
const PRISMA_ERROR_MAP: Record<string, { status: HttpStatus; code: string }> = {
  P2002: { status: HttpStatus.CONFLICT, code: 'CONFLICT' },
  P2003: { status: HttpStatus.BAD_REQUEST, code: 'FOREIGN_KEY_VIOLATION' },
  P2025: { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
};

const PRODUCTION_MESSAGE = 'An unexpected error occurred';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private normalizePrismaError(exception: unknown): {
    status: HttpStatus;
    code: string;
    message: string;
    details?: unknown;
  } | null {
    if (exception instanceof PrismaClientKnownRequestError) {
      const mapping = PRISMA_ERROR_MAP[exception.code];
      if (!mapping) {
        this.logger.warn(
          `Unmapped Prisma error code: ${exception.code}`,
          exception.message,
        );
        return null;
      }
      const isProd = process.env.NODE_ENV === 'production';
      const message =
        mapping.status === HttpStatus.CONFLICT
          ? '이미 존재하는 데이터입니다.'
          : mapping.status === HttpStatus.NOT_FOUND
            ? '요청한 데이터를 찾을 수 없습니다.'
            : mapping.status === HttpStatus.BAD_REQUEST
              ? '잘못된 참조입니다.'
              : isProd
                ? PRODUCTION_MESSAGE
                : exception.message;
      return {
        status: mapping.status,
        code: mapping.code,
        message,
        details: isProd ? undefined : { prismaCode: exception.code },
      };
    }
    return null;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    const prismaError = this.normalizePrismaError(exception);
    if (prismaError) {
      status = prismaError.status;
      code = prismaError.code;
      message = prismaError.message;
      details = prismaError.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        code =
          (body['code'] as string) ??
          (body['error'] as string) ??
          `HTTP_${status}`;
        const msg = body['message'];
        message = Array.isArray(msg)
          ? msg.join('; ')
          : ((msg as string) ?? exception.message);
        details =
          body['details'] ?? (Array.isArray(msg) ? { errors: msg } : undefined);
      } else {
        message = String(res);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const body: HttpExceptionResponse = {
      code,
      message,
      ...(details !== undefined && { details }),
    };

    response.status(status).json(body);
  }
}
