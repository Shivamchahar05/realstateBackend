import { Op } from 'sequelize';
import type { Role } from '../../db/enums.js';
import {
  Property,
  PropertyMedia,
  PropertyHealthReport,
  User,
  VerificationHistory,
  Document,
  Inspection,
  sequelize,
} from '../../db/models/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { slugifyCode } from '../../common/utils/helpers.js';
import { auditService } from '../audit/audit.service.js';
import type {
  AssignStaffInput,
  CreatePropertyInput,
  UpdatePropertyInput,
} from './property.schema.js';

const staffInclude = [
  { model: User, as: 'seller', attributes: ['id', 'fullName', 'email', 'phone'] },
  { model: User, as: 'lawyer', attributes: ['id', 'fullName', 'email'] },
  { model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] },
  { model: User, as: 'propertyManager', attributes: ['id', 'fullName', 'email'] },
  { model: PropertyMedia, as: 'media' },
  { model: PropertyHealthReport, as: 'healthReport' },
];

async function assertUserRole(userId: string | null | undefined, roles: string[], label: string) {
  if (!userId) return;
  const user = await User.findByPk(userId);
  if (!user || !roles.includes(user.role)) {
    throw new ValidationError(`Invalid ${label} assignment`);
  }
}

function assignmentScope(role: Role, userId: string): Record<string, string> | null {
  if (role === 'LAWYER') return { lawyerId: userId };
  if (role === 'INSPECTOR') return { inspectorId: userId };
  if (role === 'PROPERTY_MANAGER') return { propertyManagerId: userId };
  return null; // SUPER_ADMIN / ADMIN see all
}

export const propertyService = {
  async create(input: CreatePropertyInput, actorId: string) {
    await Promise.all([
      assertUserRole(input.sellerId, ['SELLER'], 'seller'),
      assertUserRole(input.lawyerId, ['LAWYER', 'ADMIN', 'SUPER_ADMIN'], 'lawyer'),
      assertUserRole(input.inspectorId, ['INSPECTOR', 'ADMIN', 'SUPER_ADMIN'], 'inspector'),
      assertUserRole(
        input.propertyManagerId,
        ['PROPERTY_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
        'property manager',
      ),
    ]);

    const property = await sequelize.transaction(async (t) => {
      const created = await Property.create(
        {
          propertyCode: slugifyCode('GW'),
          title: input.title,
          description: input.description ?? null,
          propertyType: input.propertyType,
          city: input.city,
          locality: input.locality,
          address: input.address,
          state: input.state,
          pincode: input.pincode ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          bhk: input.bhk ?? null,
          carpetAreaSqft: input.carpetAreaSqft ?? null,
          builtUpAreaSqft: input.builtUpAreaSqft ?? null,
          floor: input.floor ?? null,
          totalFloors: input.totalFloors ?? null,
          ageYears: input.ageYears ?? null,
          parkingSpaces: input.parkingSpaces ?? 0,
          furnishing: input.furnishing ?? 'UNFURNISHED',
          readyToMove: input.readyToMove ?? true,
          askingPrice: input.askingPrice,
          estimatedMinPrice: input.estimatedMinPrice ?? null,
          estimatedMaxPrice: input.estimatedMaxPrice ?? null,
          trustScore: null,
          listingStatus: 'DRAFT',
          verificationStatus: 'DRAFT',
          rejectionReason: null,
          lastVerifiedAt: null,
          sellerId: input.sellerId ?? null,
          lawyerId: input.lawyerId ?? null,
          inspectorId: input.inspectorId ?? null,
          propertyManagerId: input.propertyManagerId ?? null,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId: created.id,
          fromStatus: null,
          toStatus: 'DRAFT',
          notes: 'Property created',
          actorId,
        },
        { transaction: t },
      );

      return created;
    });

    await auditService.log({
      actorId,
      action: 'CREATE',
      entityType: 'Property',
      entityId: property.id,
      meta: { propertyCode: property.propertyCode },
    });

    return propertyService.getById(property.id);
  },

  async list(params: {
    page: number;
    limit: number;
    skip: number;
    city?: string;
    locality?: string;
    propertyType?: string;
    listingStatus?: string;
    verificationStatus?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    actorId?: string;
    actorRole?: Role;
  }) {
    const where: Record<string | symbol, unknown> = {};

    const scope = params.actorRole && params.actorId
      ? assignmentScope(params.actorRole, params.actorId)
      : null;
    if (scope) {
      Object.assign(where, scope);
    }

    if (params.city) where['city'] = { [Op.iLike]: params.city };
    if (params.locality) where['locality'] = { [Op.iLike]: `%${params.locality}%` };
    if (params.propertyType) where['propertyType'] = params.propertyType;
    if (params.listingStatus) where['listingStatus'] = params.listingStatus;
    if (params.verificationStatus) where['verificationStatus'] = params.verificationStatus;

    if (params.minPrice || params.maxPrice) {
      where['askingPrice'] = {
        ...(params.minPrice ? { [Op.gte]: params.minPrice } : {}),
        ...(params.maxPrice ? { [Op.lte]: params.maxPrice } : {}),
      };
    }

    if (params.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${params.search}%` } },
        { propertyCode: { [Op.iLike]: `%${params.search}%` } },
        { address: { [Op.iLike]: `%${params.search}%` } },
        { locality: { [Op.iLike]: `%${params.search}%` } },
      ];
    }

    const { rows: items, count: total } = await Property.findAndCountAll({
      where,
      include: staffInclude,
      order: [['updatedAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
      distinct: true,
    });

    return { items, total, page: params.page, limit: params.limit };
  },

  async getById(id: string, actor?: { id: string; role: Role }) {
    const property = await Property.findByPk(id, {
      include: [
        ...staffInclude,
        {
          model: Document,
          as: 'documents',
          separate: true,
          order: [['createdAt', 'DESC']],
          include: [
            { model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] },
            { model: User, as: 'reviewedBy', attributes: ['id', 'fullName'] },
          ],
        },
        {
          model: VerificationHistory,
          as: 'verificationHistory',
          separate: true,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'actor', attributes: ['id', 'fullName', 'role'] }],
        },
        {
          model: Inspection,
          as: 'inspections',
          separate: true,
          order: [['createdAt', 'DESC']],
          include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName'] }],
        },
      ],
    });

    if (!property) {
      throw new NotFoundError('Property');
    }

    if (actor) {
      const scope = assignmentScope(actor.role, actor.id);
      if (scope) {
        const [field, value] = Object.entries(scope)[0]!;
        if ((property as unknown as Record<string, unknown>)[field] !== value) {
          throw new ForbiddenError('You can only access properties assigned to you');
        }
      }
    }

    return property;
  },

  async update(id: string, input: UpdatePropertyInput, actorId: string) {
    await propertyService.getById(id);

    await Promise.all([
      assertUserRole(input.sellerId, ['SELLER'], 'seller'),
      assertUserRole(input.lawyerId, ['LAWYER', 'ADMIN', 'SUPER_ADMIN'], 'lawyer'),
      assertUserRole(input.inspectorId, ['INSPECTOR', 'ADMIN', 'SUPER_ADMIN'], 'inspector'),
      assertUserRole(
        input.propertyManagerId,
        ['PROPERTY_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
        'property manager',
      ),
    ]);

    await Property.update(input as never, { where: { id } });

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Property',
      entityId: id,
      meta: input as Record<string, unknown>,
    });

    return propertyService.getById(id);
  },

  async assignStaff(id: string, input: AssignStaffInput, actorId: string) {
    await propertyService.getById(id);

    await Promise.all([
      assertUserRole(input.lawyerId ?? undefined, ['LAWYER', 'ADMIN', 'SUPER_ADMIN'], 'lawyer'),
      assertUserRole(
        input.inspectorId ?? undefined,
        ['INSPECTOR', 'ADMIN', 'SUPER_ADMIN'],
        'inspector',
      ),
      assertUserRole(
        input.propertyManagerId ?? undefined,
        ['PROPERTY_MANAGER', 'ADMIN', 'SUPER_ADMIN'],
        'property manager',
      ),
    ]);

    await Property.update(
      {
        ...(input.lawyerId !== undefined ? { lawyerId: input.lawyerId } : {}),
        ...(input.inspectorId !== undefined ? { inspectorId: input.inspectorId } : {}),
        ...(input.propertyManagerId !== undefined
          ? { propertyManagerId: input.propertyManagerId }
          : {}),
      },
      { where: { id } },
    );

    await auditService.log({
      actorId,
      action: 'ASSIGN',
      entityType: 'Property',
      entityId: id,
      meta: input as Record<string, unknown>,
    });

    return propertyService.getById(id);
  },

  async approve(id: string, actorId: string, trustScore?: number) {
    const existing = await propertyService.getById(id);

    if (existing.verificationStatus === 'REJECTED') {
      throw new ValidationError('Rejected property cannot be approved without reopening workflow');
    }

    const ready: string[] = ['FINAL_REVIEW', 'RISK_ASSESSMENT', 'PHYSICAL_INSPECTION'];
    if (!ready.includes(existing.verificationStatus) && existing.verificationStatus !== 'VERIFIED') {
      throw new ValidationError(
        'Approve only after lawyer review and physical inspection (final review stage)',
      );
    }

    await sequelize.transaction(async (t) => {
      await existing.update(
        {
          verificationStatus: 'VERIFIED',
          listingStatus: 'LIVE',
          lastVerifiedAt: new Date(),
          trustScore: trustScore ?? existing.trustScore ?? 85,
          rejectionReason: null,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId: id,
          fromStatus: existing.verificationStatus,
          toStatus: 'VERIFIED',
          notes: 'Admin approved — property verified and published',
          actorId,
        },
        { transaction: t },
      );
    });

    await auditService.log({
      actorId,
      action: 'APPROVE',
      entityType: 'Property',
      entityId: id,
    });

    return propertyService.getById(id);
  },

  async reject(id: string, reason: string, actorId: string) {
    const existing = await propertyService.getById(id);

    await sequelize.transaction(async (t) => {
      await existing.update(
        {
          verificationStatus: 'REJECTED',
          listingStatus: 'REJECTED',
          rejectionReason: reason,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId: id,
          fromStatus: existing.verificationStatus,
          toStatus: 'REJECTED',
          notes: reason,
          actorId,
        },
        { transaction: t },
      );
    });

    await auditService.log({
      actorId,
      action: 'REJECT',
      entityType: 'Property',
      entityId: id,
      meta: { reason },
    });

    return propertyService.getById(id);
  },
};
