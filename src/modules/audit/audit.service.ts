import type { AuditAction } from '../../db/enums.js';
import { AuditLog, User } from '../../db/models/index.js';

interface AuditInput {
  actorId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const auditService = {
  async log(input: AuditInput) {
    return AuditLog.create({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent?.slice(0, 255) ?? null,
    });
  },

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    entityType?: string;
    actorId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.entityType) where['entityType'] = params.entityType;
    if (params.actorId) where['actorId'] = params.actorId;

    const { rows: items, count: total } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'fullName', 'email', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
    });

    return { items, total, page: params.page, limit: params.limit };
  },
};
