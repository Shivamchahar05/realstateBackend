import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { sendSuccess } from '../../common/utils/response.js';
import { healthReportSchema, transitionSchema } from './verification.schema.js';
import { verificationService } from './verification.service.js';
import { param } from '../../common/utils/params.js';

const router = Router({ mergeParams: true });

router.use(authenticate, authorize(...staffRoles));

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const history = await verificationService.history(param(req.params.propertyId, 'propertyId'));
    sendSuccess(res, history);
  }),
);

router.post(
  '/transition',
  authorize('SUPER_ADMIN', 'ADMIN', 'LAWYER', 'PROPERTY_MANAGER', 'INSPECTOR'),
  validate(transitionSchema),
  asyncHandler(async (req, res) => {
    const property = await verificationService.transition(
      param(req.params.propertyId, 'propertyId'),
      req.body,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, property);
  }),
);

router.put(
  '/health-report',
  authorize('SUPER_ADMIN', 'ADMIN', 'LAWYER', 'PROPERTY_MANAGER'),
  validate(healthReportSchema),
  asyncHandler(async (req, res) => {
    const report = await verificationService.upsertHealthReport(
      param(req.params.propertyId, 'propertyId'),
      req.body,
      req.user!.id,
    );
    sendSuccess(res, report);
  }),
);

export default router;
