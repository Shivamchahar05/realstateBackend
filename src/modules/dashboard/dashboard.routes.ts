import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { sendSuccess } from '../../common/utils/response.js';
import { dashboardService } from './dashboard.service.js';

const router = Router();

router.use(authenticate, authorize(...staffRoles));

router.get(
  '/metrics',
  asyncHandler(async (req, res) => {
    const metrics = await dashboardService.getMetrics({
      id: req.user!.id,
      role: req.user!.role,
    });
    sendSuccess(res, metrics);
  }),
);

export default router;
