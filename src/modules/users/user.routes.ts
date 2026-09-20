import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { adminRoles, authenticate, authorize } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import { createUserSchema, listUsersSchema, updateUserSchema } from './user.schema.js';
import { userService } from './user.service.js';
import { z } from 'zod';
import { param } from '../../common/utils/params.js';

const router = Router();

router.use(authenticate, authorize(...adminRoles));

router.get(
  '/',
  validate(listUsersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listUsersSchema>;
    const pagination = parsePagination(query);
    const result = await userService.list({
      ...pagination,
      role: query.role,
      status: query.status,
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
  '/staff-options',
  asyncHandler(async (_req, res) => {
    const staff = await userService.listByRoles([
      'LAWYER',
      'INSPECTOR',
      'PROPERTY_MANAGER',
      'ADMIN',
    ]);
    sendSuccess(res, staff);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await userService.getById(param(req.params.id, 'id'));
    sendSuccess(res, user);
  }),
);

router.post(
  '/',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.create(req.body, req.user!.id, req.user!.role);
    sendSuccess(res, user, 201);
  }),
);

router.patch(
  '/:id',
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.update(param(req.params.id, 'id'), req.body, req.user!.id, req.user!.role);
    sendSuccess(res, user);
  }),
);

export default router;
