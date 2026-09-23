import { Op } from 'sequelize';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/AppError.js';
import { Property, PropertyRequest, User } from '../../db/models/index.js';
import { auditService } from '../audit/audit.service.js';
import type {
  CreatePropertyRequestInput,
  UpdatePropertyRequestInput,
} from './property-request.schema.js';

const propertyInclude = {
  model: Property,
  as: 'property' as const,
  attributes: [
    'id',
    'propertyCode',
    'title',
    'city',
    'locality',
    'askingPrice',
    'listingStatus',
    'sellerId',
  ],
};

const buyerInclude = {
  model: User,
  as: 'buyer' as const,
  attributes: ['id', 'fullName', 'email', 'phone'],
};

export const propertyRequestService = {
  async create(input: CreatePropertyRequestInput, buyerId: string) {
    const property = await Property.findByPk(input.propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }
    if (property.listingStatus !== 'LIVE' || property.verificationStatus !== 'VERIFIED') {
      throw new ValidationError('You can only request verified live listings');
    }
    if (property.sellerId === buyerId) {
      throw new ValidationError('You cannot request your own property');
    }

    const existing = await PropertyRequest.findOne({
      where: { buyerId, propertyId: property.id },
    });
    if (existing) {
      throw new ConflictError('You have already requested this property');
    }

    const request = await PropertyRequest.create({
      propertyId: property.id,
      buyerId,
      message: input.message?.trim() || null,
      status: 'NEW',
    });

    await auditService.log({
      actorId: buyerId,
      action: 'CREATE',
      entityType: 'PropertyRequest',
      entityId: request.id,
      meta: { propertyId: property.id },
    });

    return this.getById(request.id);
  },

  async getById(id: string) {
    const item = await PropertyRequest.findByPk(id, {
      include: [propertyInclude, buyerInclude],
    });
    if (!item) {
      throw new NotFoundError('Property request');
    }
    return item;
  },

  async listMine(buyerId: string, params: { page: number; limit: number; skip: number }) {
    const { rows: items, count: total } = await PropertyRequest.findAndCountAll({
      where: { buyerId },
      include: [propertyInclude],
      order: [['createdAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
    });
    return { items, total, page: params.page, limit: params.limit };
  },

  async getMineForProperty(buyerId: string, propertyId: string) {
    return PropertyRequest.findOne({
      where: { buyerId, propertyId },
      include: [propertyInclude],
    });
  },

  async listForSellerProperty(propertyId: string, sellerId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }
    if (property.sellerId !== sellerId) {
      throw new ForbiddenError('You can only view requests on your own properties');
    }

    // Sellers see interest + status only — no buyer PII or private message
    const rows = await PropertyRequest.findAll({
      where: { propertyId },
      attributes: ['id', 'propertyId', 'status', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
    });

    return rows.map((row, index) => ({
      id: row.id,
      propertyId: row.propertyId,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      label: `Buyer interest #${rows.length - index}`,
    }));
  },

  async listStaff(params: {
    page: number;
    limit: number;
    skip: number;
    status?: string;
    propertyId?: string;
    search?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.status) where['status'] = params.status;
    if (params.propertyId) where['propertyId'] = params.propertyId;

    const propertyWhere = params.search
      ? {
          [Op.or]: [
            { title: { [Op.iLike]: `%${params.search}%` } },
            { propertyCode: { [Op.iLike]: `%${params.search}%` } },
            { city: { [Op.iLike]: `%${params.search}%` } },
          ],
        }
      : undefined;

    const { rows: items, count: total } = await PropertyRequest.findAndCountAll({
      where,
      include: [
        {
          ...propertyInclude,
          ...(propertyWhere ? { where: propertyWhere, required: true } : {}),
        },
        buyerInclude,
      ],
      order: [['createdAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
      distinct: true,
    });

    return { items, total, page: params.page, limit: params.limit };
  },

  async update(id: string, input: UpdatePropertyRequestInput, actorId: string) {
    const item = await PropertyRequest.findByPk(id);
    if (!item) {
      throw new NotFoundError('Property request');
    }

    const previousStatus = item.status;
    if (input.status) {
      // Accept legacy CLOSED as CANCELLED
      const next =
        (input.status as string) === 'CLOSED' ? 'CANCELLED' : input.status;
      item.status = next;
    }
    if (input.message !== undefined) item.message = input.message.trim() || null;
    await item.save();

    await auditService.log({
      actorId,
      action: input.status ? 'STATUS_CHANGE' : 'UPDATE',
      entityType: 'PropertyRequest',
      entityId: item.id,
      meta: { ...input, fromStatus: previousStatus, toStatus: item.status },
    });

    return this.getById(item.id);
  },
};
