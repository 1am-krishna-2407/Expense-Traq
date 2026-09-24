import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';
import { badRequest, type ErrorDetail } from '../utils/errors';

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const zodIssuesToDetails = (error: ZodError): ErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || '(root)',
    message: issue.message,
  }));

/**
 * Validates body/query/params with Zod before the controller runs (Plan §19). On failure it
 * short-circuits with 400 + field-level details; on success the parsed (coerced, trimmed,
 * defaulted) values replace the raw ones, so controllers only ever see valid shapes.
 */
export const validate =
  (schemas: RequestSchemas) => (req: Request, _res: Response, next: NextFunction) => {
    const details: ErrorDetail[] = [];
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        // Express 4 exposes these as plain writable properties.
        (req as unknown as Record<string, unknown>)[part] = result.data;
      } else {
        details.push(...zodIssuesToDetails(result.error));
      }
    }
    if (details.length > 0) {
      return next(badRequest(details[0].message, details));
    }
    next();
  };
