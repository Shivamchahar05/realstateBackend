import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { param } from '../../common/utils/params.js';
import { sendSuccess } from '../../common/utils/response.js';
import {
  createPropertyRequestSchema,
  listPropertyRequestsSchema,
  updatePropertyRequestSchema,
} from './property-request.schema.js';
import { propertyRequestService } from './property-request.service.js';

const router = Router();

router.post(
  '/',
  authenticate,
  authorize('BUYER'),
  validate(createPropertyRequestSchema),
  asyncHandler(async (req, res) => {
    const item = await propertyRequestService.create(req.body, req.user!.id);
    sendSuccess(res, item, 201);
  }),
);

router.get(
  '/mine',
  authenticate,
  authorize('BUYER'),
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const pagination = parsePagination({ page, limit });
    const result = await propertyRequestService.listMine(req.user!.id, pagination);
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

router.get(
  '/for-property/:propertyId',
  authenticate,
  authorize('BUYER'),
  asyncHandler(async (req, res) => {
    const item = await propertyRequestService.getMineForProperty(
      req.user!.id,
      param(req.params.propertyId, 'propertyId'),
    );
    sendSuccess(res, item);
  }),
);

router.get(
  '/',
  authenticate,
  authorize(...staffRoles),
  validate(listPropertyRequestsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listPropertyRequestsSchema>;
    const pagination = parsePagination(query);
    const result = await propertyRequestService.listStaff({
      ...pagination,
      status: query.status,
      propertyId: query.propertyId,
      search: query.search,
    });
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

router.patch(
  '/:id',
  authenticate,
  authorize(...staffRoles),
  validate(updatePropertyRequestSchema),
  asyncHandler(async (req, res) => {
    const item = await propertyRequestService.update(
      param(req.params.id, 'id'),
      req.body,
      req.user!.id,
    );
    sendSuccess(res, item);
  }),
);

export default router;
