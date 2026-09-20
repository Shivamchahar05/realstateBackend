import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from './transaction.schema.js';
import { transactionService } from './transaction.service.js';
import { param } from '../../common/utils/params.js';

const router = Router();

router.use(authenticate, authorize(...staffRoles));

router.get(
  '/',
  validate(listTransactionsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listTransactionsSchema>;
    const pagination = parsePagination(query);
    const result = await transactionService.list({
      ...pagination,
      stage: query.stage,
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
  '/:id',
  asyncHandler(async (req, res) => {
    const item = await transactionService.getById(param(req.params.id, 'id'));
    sendSuccess(res, item);
  }),
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(createTransactionSchema),
  asyncHandler(async (req, res) => {
    const item = await transactionService.create(req.body, req.user!.id);
    sendSuccess(res, item, 201);
  }),
);

router.patch(
  '/:id',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(updateTransactionSchema),
  asyncHandler(async (req, res) => {
    const item = await transactionService.update(param(req.params.id, 'id'), req.body, req.user!.id);
    sendSuccess(res, item);
  }),
);

export default router;
