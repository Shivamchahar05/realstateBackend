import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Document, Property, User, VerificationHistory, sequelize } from '../../db/models/index.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import type { CreateDocumentMeta, ReviewDocumentInput, RequestDocumentInput } from './document.schema.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadRoot, 'documents');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const allowedMime = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const documentUpload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      cb(new ValidationError('Only PDF, JPG, PNG, WEBP, DOC, DOCX files are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const documentService = {
  async upload(
    propertyId: string,
    meta: CreateDocumentMeta,
    file: Express.Multer.File,
    actorId: string,
  ) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    if (!file) {
      throw new ValidationError('Document file is required');
    }

    const latest = await Document.findOne({
      where: { propertyId, category: meta.category, title: meta.title },
      order: [['version', 'DESC']],
    });

    const document = await Document.create({
      propertyId,
      category: meta.category,
      title: meta.title,
      notes: meta.notes ?? null,
      expiresAt: meta.expiresAt ?? null,
      fileName: file.originalname,
      fileUrl: `/uploads/documents/${file.filename}`,
      mimeType: file.mimetype,
      fileSize: file.size,
      version: (latest?.version ?? 0) + 1,
      status: 'PENDING',
      uploadedById: actorId,
      reviewedById: null,
      reviewedAt: null,
    });

    await auditService.log({
      actorId,
      action: 'UPLOAD',
      entityType: 'Document',
      entityId: document.id,
      meta: { propertyId, category: meta.category },
    });

    return Document.findByPk(document.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] }],
    });
  },

  async list(propertyId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    return Document.findAll({
      where: { propertyId },
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] },
        { model: User, as: 'reviewedBy', attributes: ['id', 'fullName'] },
      ],
      order: [
        ['category', 'ASC'],
        ['version', 'DESC'],
      ],
    });
  },

  async review(documentId: string, input: ReviewDocumentInput, actorId: string) {
    const existing = await Document.findByPk(documentId);
    if (!existing) {
      throw new NotFoundError('Document');
    }

    if (existing.status === 'MISSING' && input.status === 'VERIFIED') {
      throw new ValidationError('Cannot approve a document that has not been uploaded yet');
    }

    await existing.update({
      status: input.status,
      notes: input.notes,
      reviewedById: actorId,
      reviewedAt: new Date(),
    });

    if (input.status === 'REJECTED' || input.status === 'MISSING') {
      const property = await Property.findByPk(existing.propertyId);
      if (property && !['DRAFT', 'REJECTED', 'VERIFIED'].includes(property.verificationStatus)) {
        const fromStatus = property.verificationStatus;
        await sequelize.transaction(async (t) => {
          await property.update(
            {
              verificationStatus: 'REVIEW_REQUIRED',
              listingStatus: 'PENDING_VERIFICATION',
            },
            { transaction: t },
          );
          await VerificationHistory.create(
            {
              propertyId: property.id,
              fromStatus,
              toStatus: 'REVIEW_REQUIRED',
              notes:
                input.status === 'REJECTED'
                  ? `Document rejected: ${existing.title}. ${input.notes}`
                  : `Additional document requested: ${existing.title}. ${input.notes}`,
              actorId,
            },
            { transaction: t },
          );
        });
      }
    }

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Document',
      entityId: documentId,
      meta: { status: input.status, notes: input.notes },
    });

    return Document.findByPk(documentId, {
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] },
        { model: User, as: 'reviewedBy', attributes: ['id', 'fullName'] },
      ],
    });
  },

  async requestAdditional(propertyId: string, input: RequestDocumentInput, actorId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const document = await Document.create({
      propertyId,
      category: input.category,
      title: input.title,
      notes: input.notes,
      expiresAt: null,
      fileName: '(awaiting seller upload)',
      fileUrl: '',
      mimeType: 'application/octet-stream',
      fileSize: 0,
      version: 1,
      status: 'MISSING',
      uploadedById: actorId,
      reviewedById: actorId,
      reviewedAt: new Date(),
    });

    if (!['DRAFT', 'REJECTED', 'VERIFIED'].includes(property.verificationStatus)) {
      const fromStatus = property.verificationStatus;
      await sequelize.transaction(async (t) => {
        await property.update(
          {
            verificationStatus: 'REVIEW_REQUIRED',
            listingStatus: 'PENDING_VERIFICATION',
          },
          { transaction: t },
        );
        await VerificationHistory.create(
          {
            propertyId,
            fromStatus,
            toStatus: 'REVIEW_REQUIRED',
            notes: `Additional document requested: ${input.title}. ${input.notes}`,
            actorId,
          },
          { transaction: t },
        );
      });
    }

    await auditService.log({
      actorId,
      action: 'CREATE',
      entityType: 'Document',
      entityId: document.id,
      meta: { propertyId, status: 'MISSING', title: input.title },
    });

    return Document.findByPk(document.id, {
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] },
        { model: User, as: 'reviewedBy', attributes: ['id', 'fullName'] },
      ],
    });
  },

  async fulfillRequest(
    propertyId: string,
    documentId: string,
    file: Express.Multer.File,
    actorId: string,
  ) {
    const existing = await Document.findByPk(documentId);
    if (!existing || existing.propertyId !== propertyId) {
      throw new NotFoundError('Document');
    }

    if (!['REJECTED', 'MISSING', 'PENDING'].includes(existing.status)) {
      throw new ValidationError('Only pending, rejected, or requested documents can be replaced');
    }

    if (!file) {
      throw new ValidationError('Document file is required');
    }

    const latest = await Document.findOne({
      where: { propertyId, category: existing.category, title: existing.title },
      order: [['version', 'DESC']],
    });

    if (existing.status === 'MISSING' && existing.fileSize === 0) {
      await existing.update({
        fileName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        fileSize: file.size,
        status: 'PENDING',
        uploadedById: actorId,
        reviewedById: null,
        reviewedAt: null,
        notes: existing.notes
          ? `Seller uploaded in response to request. Prior note: ${existing.notes}`
          : 'Seller uploaded requested document',
      });

      await auditService.log({
        actorId,
        action: 'UPLOAD',
        entityType: 'Document',
        entityId: existing.id,
        meta: { propertyId, replaced: true },
      });

      return Document.findByPk(existing.id, {
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] }],
      });
    }

    if (existing.status === 'REJECTED' || existing.status === 'PENDING') {
      const nextVersion = (latest?.version ?? existing.version) + 1;
      await existing.update({
        fileName: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        mimeType: file.mimetype,
        fileSize: file.size,
        version: nextVersion,
        status: 'PENDING',
        uploadedById: actorId,
        reviewedById: null,
        reviewedAt: null,
        notes: `Re-upload after review (v${nextVersion})`,
      });

      await auditService.log({
        actorId,
        action: 'UPLOAD',
        entityType: 'Document',
        entityId: existing.id,
        meta: { propertyId, replaced: true, version: nextVersion },
      });

      return Document.findByPk(existing.id, {
        include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] }],
      });
    }

    const document = await Document.create({
      propertyId,
      category: existing.category,
      title: existing.title,
      notes: `Re-upload after ${existing.status.toLowerCase()}`,
      expiresAt: null,
      fileName: file.originalname,
      fileUrl: `/uploads/documents/${file.filename}`,
      mimeType: file.mimetype,
      fileSize: file.size,
      version: (latest?.version ?? existing.version) + 1,
      status: 'PENDING',
      uploadedById: actorId,
      reviewedById: null,
      reviewedAt: null,
    });

    await auditService.log({
      actorId,
      action: 'UPLOAD',
      entityType: 'Document',
      entityId: document.id,
      meta: { propertyId, replaces: documentId },
    });

    return Document.findByPk(document.id, {
      include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'fullName'] }],
    });
  },

  async remove(documentId: string, actorId: string) {
    const existing = await Document.findByPk(documentId);
    if (!existing) {
      throw new NotFoundError('Document');
    }

    if (existing.status === 'VERIFIED') {
      throw new ValidationError('Approved documents cannot be removed');
    }

    const diskPath = path.resolve(process.cwd(), existing.fileUrl.replace(/^\//, ''));

    await existing.destroy();

    try {
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch {
      // ignore file cleanup errors
    }

    await auditService.log({
      actorId,
      action: 'DELETE',
      entityType: 'Document',
      entityId: documentId,
      meta: { propertyId: existing.propertyId, title: existing.title },
    });

    return { message: 'Document removed' };
  },
};
