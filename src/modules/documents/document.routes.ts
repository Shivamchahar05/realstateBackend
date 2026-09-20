import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize, staffRoles } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { ForbiddenError, ValidationError } from '../../common/errors/AppError.js';
import { sendSuccess } from '../../common/utils/response.js';
import {
  createDocumentMetaSchema,
  requestDocumentSchema,
  reviewDocumentSchema,
} from './document.schema.js';
import { documentService, documentUpload } from './document.service.js';
import { param } from '../../common/utils/params.js';
import { Property } from '../../db/models/index.js';

const router = Router({ mergeParams: true });

router.use(authenticate, authorize(...staffRoles));

async function assertStaffCanAccessProperty(
  propertyId: string,
  user: { id: string; role: string },
) {
  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new ValidationError('Property not found');
  }
  if (user.role === 'LAWYER' && property.lawyerId !== user.id) {
    throw new ForbiddenError('You can only review documents on properties assigned to you');
  }
  if (user.role === 'INSPECTOR' && property.inspectorId !== user.id) {
    throw new ForbiddenError('You can only access properties assigned to you');
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
    await assertStaffCanAccessProperty(propertyId, req.user!);
    const docs = await documentService.list(propertyId);
    sendSuccess(res, docs);
  }),
);

router.post(
  '/',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER', 'LAWYER'),
  documentUpload.single('file'),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertStaffCanAccessProperty(propertyId, req.user!);
    const parsed = createDocumentMetaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten());
    }
    if (!req.file) {
      throw new ValidationError('Document file is required');
    }

    const doc = await documentService.upload(propertyId, parsed.data, req.file, req.user!.id);
    sendSuccess(res, doc, 201);
  }),
);

router.post(
  '/request',
  authorize('SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER', 'LAWYER'),
  validate(requestDocumentSchema),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertStaffCanAccessProperty(propertyId, req.user!);
    const doc = await documentService.requestAdditional(propertyId, req.body, req.user!.id);
    sendSuccess(res, doc, 201);
  }),
);

router.patch(
  '/:documentId/review',
  authorize('SUPER_ADMIN', 'ADMIN', 'LAWYER', 'PROPERTY_MANAGER'),
  validate(reviewDocumentSchema),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.propertyId, 'propertyId');
    await assertStaffCanAccessProperty(propertyId, req.user!);
    const doc = await documentService.review(
      param(req.params.documentId, 'documentId'),
      req.body,
      req.user!.id,
    );
    sendSuccess(res, doc);
  }),
);

export default router;
