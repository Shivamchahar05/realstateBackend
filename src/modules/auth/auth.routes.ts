import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { sendSuccess } from '../../common/utils/response.js';
import {
  changePasswordSchema,
  loginSchema,
  portalLoginSchema,
  refreshSchema,
  registerSchema,
} from './auth.schema.js';
import { authService } from './auth.service.js';

const router = Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, req);
    sendSuccess(res, result);
  }),
);

router.post(
  '/portal/login',
  validate(portalLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.portalLogin(req.body, req);
    sendSuccess(res, result);
  }),
);

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, req);
    sendSuccess(res, result, 201);
  }),
);

router.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken, req);
    sendSuccess(res, result);
  }),
);

router.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body.refreshToken, req.user?.id);
    sendSuccess(res, { message: 'Logged out successfully' });
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.me(req.user!.id);
    sendSuccess(res, user);
  }),
);

router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user!.id, req.body);
    sendSuccess(res, result);
  }),
);

export default router;
