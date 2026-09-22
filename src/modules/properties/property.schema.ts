import { z } from 'zod';
import {
  FURNISHING_STATUSES,
  LISTING_STATUSES,
  PROPERTY_TYPES,
  VERIFICATION_STATUSES,
} from '../../db/enums.js';
import {
  AMENITY_KEYS,
  FURNISHING_ITEM_KEYS,
  NEARBY_CATEGORIES,
} from '../../db/property-features.js';

const money = z.coerce.number().positive('Price must be greater than 0');
const area = z.coerce.number().positive().optional();

const furnishingsInventorySchema = z
  .array(
    z.object({
      key: z.enum(FURNISHING_ITEM_KEYS),
      qty: z.coerce.number().int().min(1).max(99),
    }),
  )
  .max(40)
  .optional();

const amenitiesSchema = z.array(z.enum(AMENITY_KEYS)).max(40).optional();

const nearbyPlacesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(2).max(120),
      distance: z.string().trim().min(1).max(40),
      category: z.enum(NEARBY_CATEGORIES),
    }),
  )
  .max(20)
  .optional();

export const createPropertySchema = z.object({
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
  furnishingsInventory: furnishingsInventorySchema,
  amenities: amenitiesSchema,
  nearbyPlaces: nearbyPlacesSchema,
  askingPrice: money,
  estimatedMinPrice: money.optional(),
  estimatedMaxPrice: money.optional(),
  sellerId: z.string().min(1).optional(),
  lawyerId: z.string().min(1).optional(),
  inspectorId: z.string().min(1).optional(),
  propertyManagerId: z.string().min(1).optional(),
});

export const updatePropertySchema = createPropertySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' },
);

export const assignStaffSchema = z
  .object({
    lawyerId: z.string().min(1).nullable().optional(),
    inspectorId: z.string().min(1).nullable().optional(),
    propertyManagerId: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one assignment',
  });

export const listPropertiesSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  city: z.string().trim().optional(),
  locality: z.string().trim().optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  listingStatus: z.enum(LISTING_STATUSES).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  search: z.string().trim().max(100).optional(),
});

export const rejectPropertySchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type AssignStaffInput = z.infer<typeof assignStaffSchema>;
