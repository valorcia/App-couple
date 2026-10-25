import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
import { AppError, ErrorCode } from '@couple/shared';
import { Prisma } from '@couple/database';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? req.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL;
    let message = 'Une erreur est survenue.';
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.status;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as { message?: string }).message ?? exception.message);
      code =
        status === 401 ? ErrorCode.UNAUTHORIZED
        : status === 403 ? ErrorCode.FORBIDDEN
        : status === 404 ? ErrorCode.NOT_FOUND
        : status === 429 ? ErrorCode.RATE_LIMITED
        : status === 409 ? ErrorCode.CONFLICT
        : status >= 500 ? ErrorCode.INTERNAL
        : ErrorCode.VALIDATION_FAILED;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        code = ErrorCode.CONFLICT;
        message = 'Cette ressource existe déjà.';
      } else if (exception.code === 'P2025') {
        status = 404;
        code = ErrorCode.NOT_FOUND;
        message = 'Ressource introuvable.';
      } else if (exception.code === 'P2034') {
        status = 409;
        code = ErrorCode.CONFLICT;
        message = 'Conflit d\u2019écriture, réessayez.';
      }
    } else if (exception instanceof Prisma.PrismaClientUnknownRequestError && exception.message.includes('COUPLE_FULL')) {
      status = 409;
      code = ErrorCode.COUPLE_FULL;
      message = 'Ce couple est déjà complet.';
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId, path: req.url }, 'Unhandled exception');
    }

    res.status(status).json({ code, message, details, requestId });
  }
}
