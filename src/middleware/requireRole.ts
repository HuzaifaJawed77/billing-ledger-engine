import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate';
import { ApiError } from '@/lib/apiError';

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}