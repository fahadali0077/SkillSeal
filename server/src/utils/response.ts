import type { Response } from 'express';
import { ApiErrorCode } from '@SkillSeal/shared';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', status = 200): Response {
  return res.status(status).json({ success: true, message, data });
}

export interface IFieldError { field: string; message: string }
export interface IApiError { success: boolean; message: string; code: string; errors?: IFieldError[] }

export function sendError(
  res: Response, message: string, statusCode = 500,
  code: ApiErrorCode = ApiErrorCode.INTERNAL_ERROR,
  extra?: IFieldError[] | Record<string, unknown>,
): Response {
  const errors = Array.isArray(extra) ? extra : undefined;
  const data = extra && !Array.isArray(extra) ? extra : undefined;
  return res.status(statusCode).json({ success: false, message, code, errors, ...data });
}

export function sendValidationError(res: Response, errors: IFieldError[]): Response {
  return sendError(res, 'Validation error', 400, ApiErrorCode.VALIDATION_ERROR, errors);
}
