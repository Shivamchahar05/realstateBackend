import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import { param } from '../../common/utils/params.js';
import { listPropertiesSchema } from '../properties/property.schema.js';
import { catalogService } from './catalog.service.js';

const router = Router();

router.get(
  '/properties',
  validate(listPropertiesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listPropertiesSchema>;
    const pagination = parsePagination(query);
    const result = await catalogService.listLive({
      ...pagination,
      city: query.city,
      locality: query.locality,
      propertyType: query.propertyType,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      search: query.search,
    });
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

router.get(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const property = await catalogService.getLiveById(param(req.params.id, 'id'));
    sendSuccess(res, property);
  }),
);

export default router;
