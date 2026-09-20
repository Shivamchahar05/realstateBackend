import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../../db/enums.js';

export const createDocumentMetaSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  title: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(2000).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const reviewDocumentSchema = z
  .object({
    status: z.enum(['VERIFIED', 'REJECTED', 'UNDER_REVIEW', 'MISSING']),
    notes: z.string().trim().min(3).max(2000),
  });

export const requestDocumentSchema = z.object({
  category: z.enum(DOCUMENT_CATEGORIES),
  title: z.string().trim().min(2).max(200),
  notes: z.string().trim().min(5).max(2000),
});

export type CreateDocumentMeta = z.infer<typeof createDocumentMetaSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;
export type RequestDocumentInput = z.infer<typeof requestDocumentSchema>;
