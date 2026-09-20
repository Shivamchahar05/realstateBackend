export const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'LAWYER',
  'INSPECTOR',
  'PROPERTY_MANAGER',
  'BUYER',
  'SELLER',
] as const;
export type Role = (typeof ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const PROPERTY_TYPES = [
  'APARTMENT',
  'VILLA',
  'INDEPENDENT_HOUSE',
  'PLOT',
  'COMMERCIAL',
  'OTHER',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const FURNISHING_STATUSES = [
  'UNFURNISHED',
  'SEMI_FURNISHED',
  'FULLY_FURNISHED',
] as const;
export type FurnishingStatus = (typeof FURNISHING_STATUSES)[number];

export const LISTING_STATUSES = [
  'DRAFT',
  'PENDING_VERIFICATION',
  'LIVE',
  'REJECTED',
  'ARCHIVED',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const VERIFICATION_STATUSES = [
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
  'REVIEW_REQUIRED',
  'REJECTED',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const DOCUMENT_CATEGORIES = [
  'OWNERSHIP',
  'SALE_DEED',
  'PREVIOUS_SALE_DEED',
  'TAX',
  'ENCUMBRANCE',
  'MUTATION',
  'APPROVALS',
  'RERA',
  'LOAN_MORTGAGE',
  'SOCIETY',
  'UTILITY',
  'OTHER',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const DOCUMENT_STATUSES = [
  'PENDING',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'MISSING',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const MEDIA_TYPES = [
  'PHOTO',
  'VIDEO',
  'VIEW_360',
  'INSPECTION_PHOTO',
  'OTHER',
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const INSPECTION_STATUSES = [
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type InspectionStatus = (typeof INSPECTION_STATUSES)[number];

export const TRANSACTION_STAGES = [
  'PROPERTY_SELECTED',
  'VERIFICATION_COMPLETED',
  'NEGOTIATION_COMPLETED',
  'AGREEMENT_PREPARED',
  'LOAN_APPROVED',
  'REGISTRATION_SCHEDULED',
  'REGISTRATION_COMPLETED',
  'POSSESSION_COMPLETED',
  'CANCELLED',
] as const;
export type TransactionStage = (typeof TRANSACTION_STAGES)[number];

export const AUDIT_ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'ASSIGN',
  'APPROVE',
  'REJECT',
  'STATUS_CHANGE',
  'UPLOAD',
  'DOWNLOAD',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const STAFF_ROLES: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'LAWYER',
  'INSPECTOR',
  'PROPERTY_MANAGER'
];

export const ADMIN_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN'];
