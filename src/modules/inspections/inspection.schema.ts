import { z } from 'zod';
import { INSPECTION_STATUSES } from '../../db/enums.js';

export const createInspectionSchema = z.object({
  inspectorId: z.string().min(1),
  scheduledAt: z.coerce.date(),
});

export const updateInspectionSchema = z
  .object({
    status: z.enum(INSPECTION_STATUSES).optional(),
    scheduledAt: z.coerce.date().optional(),
    checklist: z.record(z.string(), z.unknown()).optional(),
    findings: z.string().trim().max(5000).optional(),
    issues: z.string().trim().max(5000).optional(),
    photos: z.array(z.string().min(1).max(500)).max(50).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
export type UpdateInspectionInput = z.infer<typeof updateInspectionSchema>;
