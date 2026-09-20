import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { adminRoles, authenticate, authorize } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import { auditService } from './audit.service.js';

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  entityType: z.string().optional(),
  actorId: z.string().optional(),
});

const router = Router();

router.use(authenticate, authorize(...adminRoles));

router.get(
  '/',
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const pagination = parsePagination(req.query as { page?: number; limit?: number });
    const result = await auditService.list({
      ...pagination,
      entityType: (req.query as { entityType?: string }).entityType,
      actorId: (req.query as { actorId?: string }).actorId,
    });
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

export default router;
