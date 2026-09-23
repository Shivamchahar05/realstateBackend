import { z } from 'zod';
import { PROPERTY_REQUEST_STATUSES } from '../../db/enums.js';

export const createPropertyRequestSchema = z.object({
  propertyId: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
});

export const updatePropertyRequestSchema = z
  .object({
    status: z
      .preprocess(
        (value) => (value === 'CLOSED' ? 'CANCELLED' : value),
        z.enum(PROPERTY_REQUEST_STATUSES),
      )
      .optional(),
    message: z.string().trim().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const listPropertyRequestsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z
    .preprocess(
      (value) => (value === 'CLOSED' ? 'CANCELLED' : value),
      z.enum(PROPERTY_REQUEST_STATUSES),
    )
    .optional(),
  propertyId: z.string().min(1).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreatePropertyRequestInput = z.infer<typeof createPropertyRequestSchema>;
export type UpdatePropertyRequestInput = z.infer<typeof updatePropertyRequestSchema>;
