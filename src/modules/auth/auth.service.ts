import type { Request } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, RefreshToken } from '../../db/models/index.js';
import { STAFF_ROLES } from '../../db/enums.js';
import { env } from '../../config/env.js';
import { UnauthorizedError, ValidationError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import type { ChangePasswordInput, LoginInput, PortalLoginInput, RegisterInput } from './auth.schema.js';
import {
  hashToken,
  refreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './auth.token.js';

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user: User, req?: Request) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user.id);

  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiryDate(),
    revokedAt: null,
    userAgent: req?.headers['user-agent']?.slice(0, 255) ?? null,
    ipAddress: req?.ip ?? null,
  });

  return { accessToken, refreshToken, user: sanitizeUser(user) };
}

async function authenticateUser(
  input: LoginInput,
  req: Request | undefined,
  allowedRoles: readonly string[],
  deniedMessage: string,
) {
  const user = await User.findOne({ where: { email: input.email.toLowerCase() } });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account is not active');
  }

  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedError(deniedMessage);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  await user.update({ lastLoginAt: new Date() });

  await auditService.log({
    actorId: user.id,
    action: 'LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req?.ip,
    userAgent: req?.headers['user-agent'],
  });

  return issueTokens(user, req);
}

export const authService = {
  async login(input: LoginInput, req?: Request) {
    return authenticateUser(
      input,
      req,
      STAFF_ROLES,
      'Admin panel access is restricted to staff accounts',
    );
  },

  async portalLogin(input: PortalLoginInput, req?: Request) {
    return authenticateUser(input, req, ['BUYER', 'SELLER'], 'Use seller or buyer portal credentials');
  },

  async register(input: RegisterInput, req?: Request) {
    const email = input.email.toLowerCase();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ValidationError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const user = await User.create({
      email,
      phone: input.phone ?? null,
      fullName: input.fullName,
      passwordHash,
      role: input.role,
      status: 'ACTIVE',
      avatarUrl: null,
      lastLoginAt: new Date(),
    });

    await auditService.log({
      actorId: user.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      meta: { role: input.role, source: 'self-register' },
      ipAddress: req?.ip,
      userAgent: req?.headers['user-agent'],
    });

    return issueTokens(user, req);
  },

  async refresh(refreshToken: string, req?: Request) {
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await RefreshToken.findOne({ where: { tokenHash } });
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt < new Date() ||
      stored.userId !== payload.sub
    ) {
      throw new UnauthorizedError('Refresh token is invalid or revoked');
    }

    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }

    await stored.update({ revokedAt: new Date() });
    return issueTokens(user, req);
  },

  async logout(refreshToken: string, actorId?: string) {
    const tokenHash = hashToken(refreshToken);
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { tokenHash, revokedAt: { [Op.is]: null } } },
    );

    if (actorId) {
      await auditService.log({
        actorId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: actorId,
      });
    }
  },

  async me(userId: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new UnauthorizedError();
    }
    return sanitizeUser(user);
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new UnauthorizedError();
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ValidationError('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
    await user.update({ passwordHash });

    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: { [Op.is]: null } } },
    );

    return { message: 'Password updated successfully. Please login again.' };
  },
};
