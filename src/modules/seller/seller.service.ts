import { Op } from 'sequelize';
import {
  Document,
  Property,
  PropertyHealthReport,
  PropertyMedia,
  User,
  VerificationHistory,
  sequelize,
} from '../../db/models/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { slugifyCode } from '../../common/utils/helpers.js';
import { auditService } from '../audit/audit.service.js';
import { propertyService } from '../properties/property.service.js';
import type { SellerCreatePropertyInput, SellerUpdatePropertyInput } from './seller.schema.js';

const sellerInclude = [
  { model: User, as: 'lawyer', attributes: ['id', 'fullName', 'email'] },
  { model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] },
  { model: PropertyMedia, as: 'media' },
  { model: PropertyHealthReport, as: 'healthReport' },
];

async function assertSellerOwns(propertyId: string, sellerId: string) {
  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new NotFoundError('Property');
  }
  if (property.sellerId !== sellerId) {
    throw new ForbiddenError('You can only manage your own properties');
  }
  return property;
}

export const sellerService = {
  async listMine(
    sellerId: string,
    params: { page: number; limit: number; skip: number; search?: string },
  ) {
    const where: Record<string | symbol, unknown> = { sellerId };

    if (params.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${params.search}%` } },
        { propertyCode: { [Op.iLike]: `%${params.search}%` } },
        { locality: { [Op.iLike]: `%${params.search}%` } },
      ];
    }

    const { rows: items, count: total } = await Property.findAndCountAll({
      where,
      include: sellerInclude,
      order: [['updatedAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
      distinct: true,
    });

    return { items, total, page: params.page, limit: params.limit };
  },

  async getMine(propertyId: string, sellerId: string) {
    await assertSellerOwns(propertyId, sellerId);
    return propertyService.getById(propertyId);
  },

  async create(input: SellerCreatePropertyInput, sellerId: string) {
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
          furnishingsInventory: input.furnishingsInventory ?? [],
          amenities: input.amenities ?? [],
          nearbyPlaces: input.nearbyPlaces ?? [],
          askingPrice: input.askingPrice,
          estimatedMinPrice: input.estimatedMinPrice ?? null,
          estimatedMaxPrice: input.estimatedMaxPrice ?? null,
          trustScore: null,
          listingStatus: 'DRAFT',
          verificationStatus: 'DRAFT',
          rejectionReason: null,
          lastVerifiedAt: null,
          sellerId,
          lawyerId: null,
          inspectorId: null,
          propertyManagerId: null,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId: created.id,
          fromStatus: null,
          toStatus: 'DRAFT',
          notes: 'Property listed by seller',
          actorId: sellerId,
        },
        { transaction: t },
      );

      return created;
    });

    await auditService.log({
      actorId: sellerId,
      action: 'CREATE',
      entityType: 'Property',
      entityId: property.id,
      meta: { propertyCode: property.propertyCode, source: 'seller-portal' },
    });

    return propertyService.getById(property.id);
  },

  async update(propertyId: string, input: SellerUpdatePropertyInput, sellerId: string) {
    const property = await assertSellerOwns(propertyId, sellerId);

    if (!['DRAFT', 'REVIEW_REQUIRED', 'REJECTED'].includes(property.verificationStatus)) {
      throw new ValidationError('Only draft or returned properties can be edited');
    }

    await property.update(input as never);

    await auditService.log({
      actorId: sellerId,
      action: 'UPDATE',
      entityType: 'Property',
      entityId: propertyId,
      meta: input as Record<string, unknown>,
    });

    return propertyService.getById(propertyId);
  },

  async submitForVerification(propertyId: string, sellerId: string) {
    const property = await assertSellerOwns(propertyId, sellerId);

    if (!['DRAFT', 'REVIEW_REQUIRED', 'REJECTED'].includes(property.verificationStatus)) {
      throw new ValidationError('Property is already in the verification pipeline');
    }

    const docs = await Document.count({ where: { propertyId } });
    if (docs < 1) {
      throw new ValidationError('Upload at least one ownership document before submitting');
    }

    const fromStatus = property.verificationStatus;

    await sequelize.transaction(async (t) => {
      await property.update(
        {
          verificationStatus: 'LEGAL_REVIEW',
          listingStatus: 'PENDING_VERIFICATION',
          rejectionReason: null,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId,
          fromStatus,
          toStatus: 'LEGAL_REVIEW',
          notes: 'Seller submitted property with documents for legal review',
          actorId: sellerId,
        },
        { transaction: t },
      );
    });

    await auditService.log({
      actorId: sellerId,
      action: 'STATUS_CHANGE',
      entityType: 'Property',
      entityId: propertyId,
      meta: { toStatus: 'LEGAL_REVIEW' },
    });

    return propertyService.getById(propertyId);
  },
};
