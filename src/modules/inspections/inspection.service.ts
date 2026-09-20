import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Inspection, Property, User } from '../../db/models/index.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import type { CreateInspectionInput, UpdateInspectionInput } from './inspection.schema.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR, 'inspections');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const imageMime = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const inspectionPhotoUpload = multer({
  storage,
  limits: { fileSize: Math.max(env.MAX_FILE_SIZE_MB, 20) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ValidationError('Only JPG, PNG, WEBP, or GIF images are allowed'));
  },
});

export const inspectionService = {
  async create(propertyId: string, input: CreateInspectionInput, actorId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const inspectorId = input.inspectorId;
    if (!inspectorId) {
      throw new ValidationError('inspectorId is required');
    }

    const inspector = await User.findByPk(inspectorId);
    if (!inspector || !['INSPECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(inspector.role)) {
      throw new ValidationError('Invalid inspector assignment');
    }

    const inspection = await Inspection.create({
      propertyId,
      inspectorId,
      scheduledAt: input.scheduledAt ?? null,
      status: 'ASSIGNED',
      completedAt: null,
      checklist: null,
      findings: null,
      issues: null,
      photos: [],
      latitude: null,
      longitude: null,
    });

    await property.update({ inspectorId });

    await auditService.log({
      actorId,
      action: 'ASSIGN',
      entityType: 'Inspection',
      entityId: inspection.id,
      meta: { propertyId, inspectorId },
    });

    return Inspection.findByPk(inspection.id, {
      include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] }],
    });
  },

  async list(propertyId: string) {
    return Inspection.findAll({
      where: { propertyId },
      include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] }],
      order: [['createdAt', 'DESC']],
    });
  },

  async update(inspectionId: string, input: UpdateInspectionInput, actorId: string) {
    const existing = await Inspection.findByPk(inspectionId);
    if (!existing) {
      throw new NotFoundError('Inspection');
    }

    const patch: Record<string, unknown> = {
      ...input,
      completedAt: input.status === 'COMPLETED' ? new Date() : existing.completedAt,
    };

    if (input.checklist !== undefined) {
      patch.checklist = input.checklist;
    }
    if (input.photos !== undefined) {
      patch.photos = input.photos;
    }

    await existing.update(patch);

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'Inspection',
      entityId: inspectionId,
      meta: input as Record<string, unknown>,
    });

    return Inspection.findByPk(inspectionId, {
      include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] }],
    });
  },

  async addPhotos(
    propertyId: string,
    inspectionId: string,
    files: Express.Multer.File[],
    actorId: string,
  ) {
    const existing = await Inspection.findByPk(inspectionId);
    if (!existing || existing.propertyId !== propertyId) {
      throw new NotFoundError('Inspection');
    }

    if (!files.length) {
      throw new ValidationError('At least one photo is required');
    }

    const current = Array.isArray(existing.photos) ? [...existing.photos] : [];
    if (current.length + files.length > 20) {
      throw new ValidationError('Maximum 20 inspection photos allowed');
    }

    const urls = files.map((file) => `/uploads/inspections/${file.filename}`);
    await existing.update({ photos: [...current, ...urls] });

    await auditService.log({
      actorId,
      action: 'UPLOAD',
      entityType: 'Inspection',
      entityId: inspectionId,
      meta: { propertyId, count: files.length },
    });

    return Inspection.findByPk(inspectionId, {
      include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] }],
    });
  },

  async removePhoto(
    propertyId: string,
    inspectionId: string,
    photoUrl: string,
    actorId: string,
  ) {
    const existing = await Inspection.findByPk(inspectionId);
    if (!existing || existing.propertyId !== propertyId) {
      throw new NotFoundError('Inspection');
    }

    const current = Array.isArray(existing.photos) ? [...existing.photos] : [];
    const next = current.filter((url) => url !== photoUrl);
    if (next.length === current.length) {
      throw new NotFoundError('Photo');
    }

    await existing.update({ photos: next });

    await auditService.log({
      actorId,
      action: 'DELETE',
      entityType: 'Inspection',
      entityId: inspectionId,
      meta: { propertyId, photoUrl },
    });

    return Inspection.findByPk(inspectionId, {
      include: [{ model: User, as: 'inspector', attributes: ['id', 'fullName', 'email'] }],
    });
  },
};
