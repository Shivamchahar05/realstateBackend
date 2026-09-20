import { z } from 'zod';
import { VERIFICATION_STATUSES, type VerificationStatus } from '../../db/enums.js';

export const VERIFICATION_FLOW: VerificationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'DOCUMENT_COLLECTION',
  'AI_ANALYSIS',
  'LEGAL_REVIEW',
  'GOVERNMENT_CHECK',
  'PHYSICAL_INSPECTION',
  'VALUATION',
  'RISK_ASSESSMENT',
  'FINAL_REVIEW',
  'VERIFIED',
];

export const transitionSchema = z.object({
  toStatus: z.enum(VERIFICATION_STATUSES),
  notes: z.string().trim().min(3).max(2000).optional(),
  trustScore: z.coerce.number().int().min(0).max(100).optional(),
});

export const healthReportSchema = z.object({
  ownershipStatus: z.string().trim().max(100).optional(),
  ownershipNotes: z.string().trim().max(2000).optional(),
  titleStatus: z.string().trim().max(100).optional(),
  titleNotes: z.string().trim().max(2000).optional(),
  encumbranceStatus: z.string().trim().max(100).optional(),
  encumbranceNotes: z.string().trim().max(2000).optional(),
  litigationStatus: z.string().trim().max(100).optional(),
  litigationNotes: z.string().trim().max(2000).optional(),
  governmentApprovalStatus: z.string().trim().max(100).optional(),
  governmentApprovalNotes: z.string().trim().max(2000).optional(),
  propertyTaxStatus: z.string().trim().max(100).optional(),
  propertyTaxNotes: z.string().trim().max(2000).optional(),
  physicalInspectionStatus: z.string().trim().max(100).optional(),
  physicalInspectionNotes: z.string().trim().max(2000).optional(),
  priceAssessmentStatus: z.string().trim().max(100).optional(),
  priceAssessmentNotes: z.string().trim().max(2000).optional(),
  couldNotVerify: z.array(z.string().trim().min(2).max(200)).max(20).optional(),
  summary: z.string().trim().max(5000).optional(),
});

export type TransitionInput = z.infer<typeof transitionSchema>;
export type HealthReportInput = z.infer<typeof healthReportSchema>;
