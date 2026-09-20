import { Op } from 'sequelize';
import {
  Document,
  Property,
  PropertyHealthReport,
  PropertyMedia,
  User,
} from '../../db/models/index.js';
import { NotFoundError } from '../../common/errors/AppError.js';

const publicInclude = [
  { model: User, as: 'seller', attributes: ['id', 'fullName'] },
  { model: PropertyMedia, as: 'media' },
  { model: PropertyHealthReport, as: 'healthReport' },
];

export const catalogService = {
  async listLive(params: {
    page: number;
    limit: number;
    skip: number;
    city?: string;
    locality?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
  }) {
    const where: Record<string | symbol, unknown> = {
      listingStatus: 'LIVE',
      verificationStatus: 'VERIFIED',
    };

    if (params.city) where['city'] = { [Op.iLike]: params.city };
    if (params.locality) where['locality'] = { [Op.iLike]: `%${params.locality}%` };
    if (params.propertyType) where['propertyType'] = params.propertyType;

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
      include: publicInclude,
      order: [['updatedAt', 'DESC']],
      offset: params.skip,
      limit: params.limit,
      distinct: true,
    });

    return { items, total, page: params.page, limit: params.limit };
  },

  async getLiveById(id: string) {
    const property = await Property.findOne({
      where: { id, listingStatus: 'LIVE', verificationStatus: 'VERIFIED' },
      include: [
        ...publicInclude,
        {
          model: Document,
          as: 'documents',
          attributes: ['id', 'category', 'title', 'status', 'version'],
          separate: true,
          order: [['category', 'ASC']],
        },
      ],
    });

    if (!property) {
      throw new NotFoundError('Property');
    }

    return property;
  },
};
