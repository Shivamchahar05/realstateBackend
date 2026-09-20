import { z } from 'zod';
import { TRANSACTION_STAGES } from '../../db/enums.js';

export const createTransactionSchema = z.object({
  propertyId: z.string().min(1),
  buyerId: z.string().min(1),
  propertyManagerId: z.string().min(1).optional(),
  sellerPrice: z.coerce.number().positive().optional(),
  negotiatedPrice: z.coerce.number().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateTransactionSchema = z
  .object({
    stage: z.enum(TRANSACTION_STAGES).optional(),
    propertyManagerId: z.string().min(1).nullable().optional(),
    sellerPrice: z.coerce.number().positive().optional(),
    negotiatedPrice: z.coerce.number().positive().optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  stage: z.enum(TRANSACTION_STAGES).optional(),
  search: z.string().trim().max(100).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
