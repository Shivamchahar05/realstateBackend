import { z } from 'zod';
import {
  FURNISHING_STATUSES,
  PROPERTY_TYPES,
} from '../../db/enums.js';

const money = z.coerce.number().positive('Price must be greater than 0');
const area = z.coerce.number().positive().optional();

export const sellerCreatePropertySchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().max(5000).optional(),
  propertyType: z.enum(PROPERTY_TYPES),
  city: z.string().trim().min(2).max(100),
  locality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(500),
  state: z.string().trim().min(2).max(100).default('Haryana'),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  bhk: z.coerce.number().int().min(0).max(20).optional(),
  carpetAreaSqft: area,
  builtUpAreaSqft: area,
  floor: z.coerce.number().int().min(0).max(200).optional(),
  totalFloors: z.coerce.number().int().min(0).max(200).optional(),
  ageYears: z.coerce.number().int().min(0).max(200).optional(),
  parkingSpaces: z.coerce.number().int().min(0).max(50).optional(),
  furnishing: z.enum(FURNISHING_STATUSES).optional(),
  readyToMove: z.coerce.boolean().optional(),
  askingPrice: money,
  estimatedMinPrice: money.optional(),
  estimatedMaxPrice: money.optional(),
});

export const sellerUpdatePropertySchema = sellerCreatePropertySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export const sellerListSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(100).optional(),
});

export type SellerCreatePropertyInput = z.infer<typeof sellerCreatePropertySchema>;
export type SellerUpdatePropertyInput = z.infer<typeof sellerUpdatePropertySchema>;
