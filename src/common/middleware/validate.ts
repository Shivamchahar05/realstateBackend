import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ValidationError } from '../errors/AppError.js';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Express 5 makes `req.query` / `req.params` getter-only.
 * Use defineProperty so Zod-coerced values are available to handlers.
 */
function setRequestPart(req: Request, part: RequestPart, value: unknown): void {
  Object.defineProperty(req, part, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(new ValidationError('Validation failed', result.error.flatten()));
      return;
    }

    setRequestPart(req, part, result.data);
    next();
  };
}
