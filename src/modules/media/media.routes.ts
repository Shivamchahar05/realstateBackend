import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { sendSuccess } from '../../common/utils/response.js';
import { mediaService, mediaUpload } from './media.service.js';
import { param } from '../../common/utils/params.js';
import { Property } from '../../db/models/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, authorize(...staffRoles));

async function assertStaffPropertyAccess(
  propertyId: string,
  user: { id: string; role: string },
) {
  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new NotFoundError('Property');
  }
  if (user.role === 'LAWYER' || user.role === 'INSPECTOR') {
    throw new ForbiddenError('Only admin or property manager can manage listing media');
  }
  return property;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertStaffPropertyAccess(propertyId, req.user!);
    const media = await mediaService.list(propertyId);
    sendSuccess(res, media);
  }),
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  mediaUpload.array('files', 10),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertStaffPropertyAccess(propertyId, req.user!);

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (!files.length) {
      throw new ValidationError('At least one image or video file is required');
    }

    const caption = typeof req.body.caption === 'string' ? req.body.caption : undefined;
    const uploaded = [];
    for (const file of files) {
      uploaded.push(await mediaService.upload(propertyId, file, req.user!.id, caption));
    }

    sendSuccess(res, uploaded, 201);
  }),
);

router.delete(
  '/:mediaId',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER'),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    const mediaId = param(req.params.mediaId, 'mediaId');
    await assertStaffPropertyAccess(propertyId, req.user!);
    const result = await mediaService.remove(mediaId, propertyId, req.user!.id);
    sendSuccess(res, result);
  }),
);

export default router;
