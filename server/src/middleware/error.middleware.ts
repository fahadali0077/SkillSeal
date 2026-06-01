import type { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational = true,
    public code?: string,
  ) { super(message); Object.setPrototypeOf(this, AppError.prototype); }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }
  logger.error('[errorHandler]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}
