import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { authenticate, authorize } from '../../common/middleware/authenticate.js';
import { validate } from '../../common/middleware/validate.js';
import { ValidationError } from '../../common/errors/AppError.js';
import { parsePagination } from '../../common/utils/helpers.js';
import { sendSuccess } from '../../common/utils/response.js';
import { param } from '../../common/utils/params.js';
import { createDocumentMetaSchema } from '../documents/document.schema.js';
import { documentService, documentUpload } from '../documents/document.service.js';
import { mediaService, mediaUpload } from '../media/media.service.js';
import {
  sellerCreatePropertySchema,
  sellerListSchema,
  sellerUpdatePropertySchema,
} from './seller.schema.js';
import { sellerService } from './seller.service.js';
import { Property } from '../../db/models/index.js';
import { ForbiddenError, NotFoundError } from '../../common/errors/AppError.js';
import { propertyRequestService } from '../property-requests/property-request.service.js';

const router = Router();

router.use(authenticate, authorize('SELLER'));

async function assertOwnProperty(propertyId: string, sellerId: string) {
  const property = await Property.findByPk(propertyId);
  if (!property) {
    throw new NotFoundError('Property');
  }
  if (property.sellerId !== sellerId) {
    throw new ForbiddenError('You can only manage your own properties');
  }
  return property;
}

router.get(
  '/properties/:id/requests',
  asyncHandler(async (req, res) => {
    const items = await propertyRequestService.listForSellerProperty(
      param(req.params.id, 'id'),
      req.user!.id,
    );
    sendSuccess(res, items);
  }),
);

router.get(
  '/properties',
  validate(sellerListSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof sellerListSchema>;
    const pagination = parsePagination(query);
    const result = await sellerService.listMine(req.user!.id, {
      ...pagination,
      search: query.search,
    });
    sendSuccess(res, result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }),
);

router.post(
  '/properties',
  validate(sellerCreatePropertySchema),
  asyncHandler(async (req, res) => {
    const property = await sellerService.create(req.body, req.user!.id);
    sendSuccess(res, property, 201);
  }),
);

router.get(
  '/properties/:id',
  asyncHandler(async (req, res) => {
    const property = await sellerService.getMine(param(req.params.id, 'id'), req.user!.id);
    sendSuccess(res, property);
  }),
);

router.patch(
  '/properties/:id',
  validate(sellerUpdatePropertySchema),
  asyncHandler(async (req, res) => {
    const property = await sellerService.update(param(req.params.id, 'id'), req.body, req.user!.id);
    sendSuccess(res, property);
  }),
);

router.post(
  '/properties/:id/submit',
  asyncHandler(async (req, res) => {
    const property = await sellerService.submitForVerification(
      param(req.params.id, 'id'),
      req.user!.id,
    );
    sendSuccess(res, property);
  }),
);

router.get(
  '/properties/:id/documents',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    await assertOwnProperty(propertyId, req.user!.id);
    const docs = await documentService.list(propertyId);
    sendSuccess(res, docs);
  }),
);

router.post(
  '/properties/:id/documents',
  documentUpload.single('file'),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    const property = await assertOwnProperty(propertyId, req.user!.id);

    if (!['DRAFT', 'REVIEW_REQUIRED', 'REJECTED', 'DOCUMENT_COLLECTION', 'LEGAL_REVIEW', 'SUBMITTED'].includes(property.verificationStatus)) {
      throw new ValidationError(
        'Documents can only be uploaded before final inspection, or when more docs are requested',
      );
    }

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
  '/properties/:id/documents/:documentId/replace',
  documentUpload.single('file'),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    const documentId = param(req.params.documentId, 'documentId');
    const property = await assertOwnProperty(propertyId, req.user!.id);

    if (
      !['DRAFT', 'REVIEW_REQUIRED', 'REJECTED', 'DOCUMENT_COLLECTION', 'LEGAL_REVIEW', 'SUBMITTED'].includes(
        property.verificationStatus,
      )
    ) {
      throw new ValidationError('Documents can only be updated while verification is open');
    }

    if (!req.file) {
      throw new ValidationError('Document file is required');
    }

    const doc = await documentService.fulfillRequest(propertyId, documentId, req.file, req.user!.id);
    sendSuccess(res, doc, 201);
  }),
);

router.delete(
  '/properties/:id/documents/:documentId',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    const documentId = param(req.params.documentId, 'documentId');
    await assertOwnProperty(propertyId, req.user!.id);

    const docs = await documentService.list(propertyId);
    const owned = docs.find((d) => d.id === documentId);
    if (!owned) {
      throw new NotFoundError('Document');
    }

    const result = await documentService.remove(documentId, req.user!.id);
    sendSuccess(res, result);
  }),
);

router.get(
  '/properties/:id/media',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    await assertOwnProperty(propertyId, req.user!.id);
    const media = await mediaService.list(propertyId);
    sendSuccess(res, media);
  }),
);

router.post(
  '/properties/:id/media',
  mediaUpload.array('files', 10),
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    const property = await assertOwnProperty(propertyId, req.user!.id);

    if (property.verificationStatus === 'VERIFIED' && property.listingStatus === 'LIVE') {
      throw new ValidationError('Cannot change media on a live verified listing');
    }

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
  '/properties/:id/media/:mediaId',
  asyncHandler(async (req, res) => {
    const propertyId = param(req.params.id, 'id');
    const mediaId = param(req.params.mediaId, 'mediaId');
    const property = await assertOwnProperty(propertyId, req.user!.id);

    if (property.verificationStatus === 'VERIFIED' && property.listingStatus === 'LIVE') {
      throw new ValidationError('Cannot remove media from a live verified listing');
    }

    const result = await mediaService.remove(mediaId, propertyId, req.user!.id);
    sendSuccess(res, result);
  }),
);

export default router;
