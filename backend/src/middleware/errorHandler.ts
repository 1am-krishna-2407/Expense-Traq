import type { NextFunction, Request, Response } from 'express';
import { isProduction } from '../config/env';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface ErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}

/** Prisma's known-request errors, detected structurally so this file needn't import Prisma (Plan §12). */
const isPrismaKnownError = (e: unknown): e is { code: string } =>
  typeof e === 'object' &&
  e !== null &&
  (e as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
  typeof (e as { code?: unknown }).code === 'string';

const send = (res: Response, status: number, body: ErrorBody) => res.status(status).json(body);

export function notFoundHandler(req: Request, res: Response) {
  send(res, 404, { error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

/**
 * Global error handler — every failure leaves the API in the standard shape from Plan §19.
 * Unknown errors are logged with their stack server-side and returned as a generic 500.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return send(res, err.status, {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  // Malformed JSON body from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    return send(res, 400, { error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } });
  }

  // Safety net: DB constraints are the last line of defence (Plan §19).
  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      return send(res, 409, { error: { code: 'CONFLICT', message: 'Resource already exists' } });
    }
    if (err.code === 'P2025') {
      return send(res, 404, { error: { code: 'NOT_FOUND', message: 'Resource not found' } });
    }
  }

  logger.error('unhandled_error', {
    method: req.method,
    path: req.originalUrl,
    error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
  });

  return send(res, 500, {
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction
        ? 'Something went wrong. Please try again.'
        : err instanceof Error
          ? err.message
          : 'Internal server error',
    },
  });
}
