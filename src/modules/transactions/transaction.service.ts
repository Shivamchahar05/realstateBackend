import { Op } from 'sequelize';
import type { TransactionStage } from '../../db/enums.js';
import { Property, Transaction, User } from '../../db/models/index.js';
import { NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { slugifyCode } from '../../common/utils/helpers.js';
import { auditService } from '../audit/audit.service.js';
import type { CreateTransactionInput, UpdateTransactionInput } from './transaction.schema.js';

const include = [
  {
    model: Property,
    as: 'property',
    attributes: [
      'id',
      'propertyCode',
      'title',
      'city',
      'locality',
      'askingPrice',
      'verificationStatus',
    ],
  },
  { model: User, as: 'buyer', attributes: ['id', 'fullName', 'email', 'phone'] },
  { model: User, as: 'propertyManager', attributes: ['id', 'fullName', 'email'] },
];

export const transactionService = {
  async create(input: CreateTransactionInput, actorId: string) {
    const [property, buyer] = await Promise.all([
      Property.findByPk(input.propertyId),
      User.findByPk(input.buyerId),
    ]);

    if (!property) throw new NotFoundError('Property');
    if (!buyer || buyer.role !== 'BUYER') {
      throw new ValidationError('buyerId must belong to a BUYER account');
    }

    if (input.propertyManagerId) {
      const manager = await User.findByPk(input.propertyManagerId);
      if (!manager || !['PROPERTY_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(manager.role)) {
        throw new ValidationError('Invalid property manager');
      }
    }

    const transaction = await Transaction.create({
      transactionCode: slugifyCode('TX'),
      propertyId: input.propertyId,
      buyerId: input.buyerId,
      propertyManagerId: input.propertyManagerId ?? null,
      sellerPrice: input.sellerPrice ?? Number(property.askingPrice),
      negotiatedPrice: input.negotiatedPrice ?? null,
      notes: input.notes ?? null,
      stage: 'PROPERTY_SELECTED',
      completedAt: null,
    });

    await auditService.log({
      actorId,
      action: 'CREATE',
      entityType: 'Transaction',
      entityId: transaction.id,
    });

    return transactionService.getById(transaction.id);
  },

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    stage?: TransactionStage;
    search?: string;
  }) {
    const where: Record<string | symbol, unknown> = {};
    if (params.stage) where['stage'] = params.stage;

    const { rows: items, count: total } = await Transaction.findAndCountAll({
      where,
      include: [
        {
          ...include[0]!,
          where: params.search
            ? {
                [Op.or]: [
                  { title: { [Op.iLike]: `%${params.search}%` } },
                  { propertyCode: { [Op.iLike]: `%${params.search}%` } },
                ],
              }
            : undefined,
          required: !!params.search,
        },
        {
          ...include[1]!,
          where: params.search
            ? { fullName: { [Op.iLike]: `%${params.search}%` } }
            : undefined,
          required: false,
        },
        include[2]!,
      ],
      order: [['updatedAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
      distinct: true,
    });

    // Also allow search by transaction code without forcing property join filter only
    if (params.search && items.length === 0) {
      const fallback = await Transaction.findAndCountAll({
        where: {
          ...where,
          transactionCode: { [Op.iLike]: `%${params.search}%` },
        },
        include,
        order: [['updatedAt', 'DESC']],
        offset: params.skip,
        limit: params.limit,
        distinct: true,
      });
      return {
        items: fallback.rows,
        total: fallback.count,
        page: params.page,
        limit: params.limit,
      };
    }

    return { items, total, page: params.page, limit: params.limit };
  },

  async getById(id: string) {
    const transaction = await Transaction.findByPk(id, { include });
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }
    return transaction;
  },

  async update(id: string, input: UpdateTransactionInput, actorId: string) {
    const existing = await transactionService.getById(id);

    await existing.update({
      ...input,
      completedAt:
        input.stage === 'POSSESSION_COMPLETED' ? new Date() : existing.completedAt,
    });

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Transaction',
      entityId: id,
      meta: input as Record<string, unknown>,
    });

    return transactionService.getById(id);
  },
};
