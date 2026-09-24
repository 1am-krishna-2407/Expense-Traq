export interface ErrorDetail {
  field: string;
  message: string;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'EMAIL_TAKEN'
  | 'DUPLICATE_CATEGORY'
  | 'DUPLICATE_BUDGET'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

/**
 * Domain error carrying an HTTP status. Services throw these; the global error
 * handler turns them into the standard error shape from Plan §19.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'Authentication required', code: ErrorCode = 'UNAUTHORIZED') =>
  new AppError(401, code, message);

/** 404 is used for both "missing" and "not yours" so existence is never leaked (Plan §10). */
export const notFound = (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`);

export const conflict = (code: ErrorCode, message: string, field?: string) =>
  new AppError(409, code, message, field ? [{ field, message }] : undefined);
