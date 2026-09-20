import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { sendSuccess } from '../../common/utils/response.js';
import { createInspectionSchema, updateInspectionSchema } from './inspection.schema.js';
import { inspectionPhotoUpload, inspectionService } from './inspection.service.js';
import { param } from '../../common/utils/params.js';
import { Property } from '../../db/models/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, authorize(...staffRoles));

async function assertInspectionAccess(
  propertyId: string,
  user: { id: string; role: string },
) {
  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new NotFoundError('Property');
  }
  if (user.role === 'INSPECTOR' && property.inspectorId !== user.id) {
    throw new ForbiddenError('You can only inspect properties assigned to you');
  }
  if (user.role === 'LAWYER' && property.lawyerId !== user.id) {
    throw new ForbiddenError('You can only view inspections on properties assigned to you');
  }
  if (user.role === 'PROPERTY_MANAGER' && property.propertyManagerId !== user.id) {
    throw new ForbiddenError('You can only access properties assigned to you');
  }
  return property;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertInspectionAccess(propertyId, req.user!);
    const items = await inspectionService.list(propertyId);
    sendSuccess(res, items);
  }),
);

/** Property manager / admin schedules the visit — inspector does not create */
router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  validate(createInspectionSchema),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertInspectionAccess(propertyId, req.user!);

    const inspectorId = req.body.inspectorId as string | undefined;
    if (!inspectorId) {
      throw new ValidationError('Select an inspector to schedule the visit');
    }
    if (!req.body.scheduledAt) {
      throw new ValidationError('Inspection date & time is required');
    }

    const item = await inspectionService.create(
      propertyId,
      { inspectorId, scheduledAt: req.body.scheduledAt },
      req.user!.id,
    );
    sendSuccess(res, item, 201);
  }),
);

/** Inspector fills the report after schedule */
router.patch(
  '/:inspectionId',
  authorize('SUPER_ADMIN', 'ADMIN', 'INSPECTOR'),
  validate(updateInspectionSchema),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertInspectionAccess(propertyId, req.user!);

    if (req.user!.role === 'INSPECTOR') {
      const items = await inspectionService.list(propertyId);
      const target = items.find((i) => i.id === param(req.params.inspectionId, 'inspectionId'));
      if (!target || target.inspectorId !== req.user!.id) {
        throw new ForbiddenError('You can only update your own inspection reports');
      }
    }

    const item = await inspectionService.update(
      param(req.params.inspectionId, 'inspectionId'),
      req.body,
      req.user!.id,
    );
    sendSuccess(res, item);
  }),
);

router.post(
  '/:inspectionId/photos',
  authorize('SUPER_ADMIN', 'ADMIN', 'INSPECTOR'),
  inspectionPhotoUpload.array('photos', 10),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    const inspectionId = param(req.params.inspectionId, 'inspectionId');
    await assertInspectionAccess(propertyId, req.user!);

    if (req.user!.role === 'INSPECTOR') {
      const items = await inspectionService.list(propertyId);
      const target = items.find((i) => i.id === inspectionId);
      if (!target || target.inspectorId !== req.user!.id) {
        throw new ForbiddenError('You can only upload photos to your own inspection');
      }
    }

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const item = await inspectionService.addPhotos(propertyId, inspectionId, files, req.user!.id);
    sendSuccess(res, item, 201);
  }),
);

router.delete(
  '/:inspectionId/photos',
  authorize('SUPER_ADMIN', 'ADMIN', 'INSPECTOR'),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    const inspectionId = param(req.params.inspectionId, 'inspectionId');
    await assertInspectionAccess(propertyId, req.user!);

    const photoUrl = typeof req.body?.url === 'string' ? req.body.url : '';
    if (!photoUrl) {
      throw new ValidationError('Photo url is required');
    }

    if (req.user!.role === 'INSPECTOR') {
      const items = await inspectionService.list(propertyId);
      const target = items.find((i) => i.id === inspectionId);
      if (!target || target.inspectorId !== req.user!.id) {
        throw new ForbiddenError('You can only remove photos from your own inspection');
      }
    }

    const item = await inspectionService.removePhoto(
      propertyId,
      inspectionId,
      photoUrl,
      req.user!.id,
    );
    sendSuccess(res, item);
  }),
);

export default router;
