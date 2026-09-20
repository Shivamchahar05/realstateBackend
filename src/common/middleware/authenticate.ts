import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../../db/enums.js';
import { ADMIN_ROLES, STAFF_ROLES } from '../../db/enums.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { verifyAccessToken } from '../../modules/auth/auth.token.js';
import { User } from '../../db/models/index.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await User.findByPk(payload.sub, {
      attributes: ['id', 'email', 'role', 'fullName', 'status'],
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is inactive or does not exist');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError('Invalid or expired token'));
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
}

export const staffRoles = STAFF_ROLES;
export const adminRoles = ADMIN_ROLES;
