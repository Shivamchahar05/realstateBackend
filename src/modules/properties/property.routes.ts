import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import {
  assignStaffSchema,
  createPropertySchema,
  listPropertiesSchema,
  rejectPropertySchema,
  updatePropertySchema,
} from './property.schema.js';
import { propertyService } from './property.service.js';
import { param } from '../../common/utils/params.js';

const approveSchema = z.object({
  trustScore: z.coerce.number().int().min(0).max(100).optional(),
});

const router = Router();

router.use(authenticate, authorize(...staffRoles));

router.get(
  '/',
  validate(listPropertiesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listPropertiesSchema>;
    const pagination = parsePagination(query);
    const result = await propertyService.list({
      ...pagination,
      city: query.city,
      locality: query.locality,
      propertyType: query.propertyType,
      listingStatus: query.listingStatus,
      verificationStatus: query.verificationStatus,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      search: query.search,
      actorId: req.user!.id,
      actorRole: req.user!.role,
    });
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const property = await propertyService.getById(param(req.params.id, 'id'), {
      id: req.user!.id,
      role: req.user!.role,
    });
    sendSuccess(res, property);
  }),
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(createPropertySchema),
  asyncHandler(async (req, res) => {
    const property = await propertyService.create(req.body, req.user!.id);
    sendSuccess(res, property, 201);
  }),
);

router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(updatePropertySchema),
  asyncHandler(async (req, res) => {
    const property = await propertyService.update(param(req.params.id, 'id'), req.body, req.user!.id);
    sendSuccess(res, property);
  }),
);

router.post(
  '/:id/assign',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(assignStaffSchema),
  asyncHandler(async (req, res) => {
    const property = await propertyService.assignStaff(param(req.params.id, 'id'), req.body, req.user!.id);
    sendSuccess(res, property);
  }),
);

router.post(
  '/:id/approve',
  authorize('SUPER_ADMIN', 'ADMIN'),
  validate(approveSchema),
  asyncHandler(async (req, res) => {
    const property = await propertyService.approve(
      param(req.params.id, 'id'),
      req.user!.id,
      req.body.trustScore,
    );
    sendSuccess(res, property);
  }),
);

router.post(
  '/:id/reject',
  authorize('SUPER_ADMIN', 'ADMIN', 'LAWYER'),
  validate(rejectPropertySchema),
  asyncHandler(async (req, res) => {
    const property = await propertyService.reject(param(req.params.id, 'id'), req.body.reason, req.user!.id);
    sendSuccess(res, property);
  }),
);

export default router;
