import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { Property, PropertyMedia } from '../../db/models/index.js';
import { env } from '../../config/env.js';
import { NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import type { MediaType } from '../../db/enums.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR, 'media');

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
const videoMime = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export const mediaUpload = multer({
  storage,
  limits: { fileSize: Math.max(env.MAX_FILE_SIZE_MB, 50) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.has(file.mimetype) || videoMime.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ValidationError('Only JPG, PNG, WEBP, GIF images or MP4/WEBM/MOV videos are allowed'));
  },
});

function detectType(mime: string): MediaType {
  if (videoMime.has(mime)) return 'VIDEO';
  return 'PHOTO';
}

export const mediaService = {
  async list(propertyId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    return PropertyMedia.findAll({
      where: { propertyId },
      order: [
        ['sortOrder', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    });
  },

  async upload(
    propertyId: string,
    file: Express.Multer.File,
    actorId: string,
    caption?: string,
  ) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    if (!file) {
      throw new ValidationError('Media file is required');
    }

    const count = await PropertyMedia.count({ where: { propertyId } });
    if (count >= 20) {
      throw new ValidationError('Maximum 20 media files allowed per property');
    }

    const type = detectType(file.mimetype);
    const media = await PropertyMedia.create({
      propertyId,
      type,
      url: `/uploads/media/${file.filename}`,
      caption: caption?.trim() || null,
      sortOrder: count,
    });

    await auditService.log({
      actorId,
      action: 'UPLOAD',
      entityType: 'PropertyMedia',
      entityId: media.id,
      meta: { propertyId, type, fileName: file.originalname },
    });

    return media;
  },

  async remove(mediaId: string, propertyId: string, actorId: string) {
    const media = await PropertyMedia.findOne({ where: { id: mediaId, propertyId } });
    if (!media) {
      throw new NotFoundError('Media');
    }

    const diskPath = path.resolve(process.cwd(), media.url.replace(/^\//, ''));
    await media.destroy();

    try {
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch {
      // ignore cleanup errors
    }

    await auditService.log({
      actorId,
      action: 'DELETE',
      entityType: 'PropertyMedia',
      entityId: mediaId,
      meta: { propertyId },
    });

    return { message: 'Media removed' };
  },
};
