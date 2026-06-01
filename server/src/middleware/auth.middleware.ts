import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response';
import { ApiErrorCode } from '@SkillSeal/shared';
import { env } from '../config/env';

export interface AuthPayload { userId: string; tokenVersion: number; role: string }
export interface AuthRequest extends Request { user?: AuthPayload }

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(res, 'Authentication required.', 401, ApiErrorCode.UNAUTHORIZED);
    return;
  }
  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', 401, ApiErrorCode.UNAUTHORIZED);
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthPayload;
    } catch { }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Authentication required.', 401, ApiErrorCode.UNAUTHORIZED); return; }
    if (!roles.includes(req.user.role)) { sendError(res, 'Insufficient permissions.', 403, ApiErrorCode.FORBIDDEN); return; }
    next();
  };
}
