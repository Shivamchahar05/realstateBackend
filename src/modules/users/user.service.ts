import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '../../db/models/index.js';
import type { Role } from '../../db/enums.js';
import { env } from '../../config/env.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import type { CreateUserInput, UpdateUserInput } from './user.schema.js';

const publicAttributes = [
  'id',
  'email',
  'phone',
  'fullName',
  'role',
  'status',
  'avatarUrl',
  'lastLoginAt',
  'createdAt',
  'updatedAt',
] as const;

export const userService = {
  async create(input: CreateUserInput, actorId: string, actorRole: Role) {
    if (input.role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only super admin can create super admin accounts');
    }

    const email = input.email.toLowerCase();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    if (input.phone) {
      const phoneExists = await User.findOne({ where: { phone: input.phone } });
      if (phoneExists) {
        throw new ConflictError('Phone number is already registered');
      }
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    const user = await User.create({
      email,
      phone: input.phone ?? null,
      fullName: input.fullName,
      role: input.role,
      status: input.status ?? 'ACTIVE',
      passwordHash,
      avatarUrl: null,
      lastLoginAt: null,
    });

    await auditService.log({
      actorId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      meta: { role: user.role, email: user.email },
    });

    return userService.getById(user.id);
  },

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    role?: Role;
    status?: string;
    search?: string;
  }) {
    const where: Record<string | symbol, unknown> = {};
    if (params.role) where['role'] = params.role;
    if (params.status) where['status'] = params.status;
    if (params.search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${params.search}%` } },
        { email: { [Op.iLike]: `%${params.search}%` } },
        { phone: { [Op.iLike]: `%${params.search}%` } },
      ];
    }

    const { rows: items, count: total } = await User.findAndCountAll({
      where,
      attributes: [...publicAttributes],
      order: [['createdAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
    });

    return { items, total, page: params.page, limit: params.limit };
  },

  async getById(id: string) {
    const user = await User.findByPk(id, { attributes: [...publicAttributes] });
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  async update(id: string, input: UpdateUserInput, actorId: string, actorRole: Role) {
    const existing = await User.findByPk(id);
    if (!existing) {
      throw new NotFoundError('User');
    }

    if (existing.role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only super admin can modify super admin accounts');
    }

    if (input.role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Only super admin can assign super admin role');
    }

    if (input.email) {
      const email = input.email.toLowerCase();
      const clash = await User.findOne({ where: { email } });
      if (clash && clash.id !== id) {
        throw new ConflictError('Email is already registered');
      }
    }

    if (input.phone) {
      const clash = await User.findOne({ where: { phone: input.phone } });
      if (clash && clash.id !== id) {
        throw new ConflictError('Phone number is already registered');
      }
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, env.BCRYPT_ROUNDS)
      : undefined;

    await existing.update({
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(passwordHash ? { passwordHash } : {}),
    });

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      meta: input as Record<string, unknown>,
    });

    return userService.getById(id);
  },

  async listByRoles(roles: Role[]) {
    return User.findAll({
      where: { role: { [Op.in]: roles }, status: 'ACTIVE' },
      attributes: ['id', 'fullName', 'email', 'role'],
      order: [['fullName', 'ASC']],
    });
  },
};
