import type { Role, VerificationStatus } from '../../db/enums.js';
import {
  Property,
  PropertyHealthReport,
  VerificationHistory,
  User,
  sequelize,
} from '../../db/models/index.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../common/errors/AppError.js';
import { auditService } from '../audit/audit.service.js';
import { VERIFICATION_FLOW, type HealthReportInput, type TransitionInput } from './verification.schema.js';

/** MVP operational jumps: seller → lawyer → inspector → admin */
const ROLE_ALLOWED_JUMPS: Partial<Record<Role, Partial<Record<VerificationStatus, VerificationStatus[]>>>> = {
  LAWYER: {
    LEGAL_REVIEW: ['PHYSICAL_INSPECTION', 'REJECTED', 'REVIEW_REQUIRED'],
    DOCUMENT_COLLECTION: ['LEGAL_REVIEW', 'REJECTED'],
    SUBMITTED: ['LEGAL_REVIEW', 'DOCUMENT_COLLECTION'],
  },
  INSPECTOR: {
    PHYSICAL_INSPECTION: ['FINAL_REVIEW', 'REVIEW_REQUIRED', 'REJECTED'],
    GOVERNMENT_CHECK: ['PHYSICAL_INSPECTION'],
  },
  PROPERTY_MANAGER: {
    DRAFT: ['SUBMITTED', 'DOCUMENT_COLLECTION', 'LEGAL_REVIEW'],
    SUBMITTED: ['DOCUMENT_COLLECTION', 'LEGAL_REVIEW'],
    DOCUMENT_COLLECTION: ['LEGAL_REVIEW', 'AI_ANALYSIS'],
    REVIEW_REQUIRED: ['LEGAL_REVIEW', 'PHYSICAL_INSPECTION'],
  },
  ADMIN: {},
  SUPER_ADMIN: {},
};

function assertTransition(from: VerificationStatus, to: VerificationStatus, role: Role) {
  if (to === 'REJECTED' || to === 'REVIEW_REQUIRED') {
    if (['LAWYER', 'INSPECTOR', 'ADMIN', 'SUPER_ADMIN', 'PROPERTY_MANAGER'].includes(role)) {
      return;
    }
    throw new ForbiddenError('You cannot reject or return this property');
  }

  if (from === to) {
    throw new ValidationError('Property is already in this verification status');
  }

  if (from === 'REJECTED') {
    throw new ValidationError('Rejected property must be reopened via REVIEW_REQUIRED first');
  }

  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    if (to === 'VERIFIED') {
      const allowed: VerificationStatus[] = ['FINAL_REVIEW', 'RISK_ASSESSMENT', 'REVIEW_REQUIRED'];
      if (!allowed.includes(from)) {
        throw new ValidationError('Approve only after final review / inspection complete');
      }
    }
    return;
  }

  const roleJumps = ROLE_ALLOWED_JUMPS[role]?.[from];
  if (roleJumps?.includes(to)) {
    return;
  }

  const fromIndex = VERIFICATION_FLOW.indexOf(from);
  const toIndex = VERIFICATION_FLOW.indexOf(to);

  if (fromIndex === -1 || toIndex === -1) {
    throw new ValidationError('Invalid verification status');
  }

  if (toIndex < fromIndex - 1 || toIndex > fromIndex + 1) {
    throw new ValidationError(
      `Invalid transition from ${from} to ${to} for role ${role}. Follow seller → lawyer → inspection → admin.`,
    );
  }

  if (role === 'LAWYER' && !['LEGAL_REVIEW', 'DOCUMENT_COLLECTION', 'SUBMITTED', 'AI_ANALYSIS', 'GOVERNMENT_CHECK'].includes(from)) {
    throw new ForbiddenError('Lawyer can only advance legal / document stages');
  }

  if (role === 'INSPECTOR' && !['PHYSICAL_INSPECTION', 'GOVERNMENT_CHECK', 'VALUATION'].includes(from)) {
    throw new ForbiddenError('Inspector can only advance inspection stages');
  }
}

export const verificationService = {
  async transition(propertyId: string, input: TransitionInput, actorId: string, role: Role) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    assertTransition(property.verificationStatus, input.toStatus, role);

    const listingStatus =
      input.toStatus === 'VERIFIED'
        ? 'LIVE'
        : input.toStatus === 'REJECTED'
          ? 'REJECTED'
          : input.toStatus === 'DRAFT'
            ? 'DRAFT'
            : 'PENDING_VERIFICATION';

    await sequelize.transaction(async (t) => {
      await property.update(
        {
          verificationStatus: input.toStatus,
          listingStatus,
          lastVerifiedAt:
            input.toStatus === 'VERIFIED' ? new Date() : property.lastVerifiedAt,
          trustScore: input.trustScore ?? property.trustScore,
          rejectionReason:
            input.toStatus === 'REJECTED'
              ? input.notes ?? property.rejectionReason
              : input.toStatus === 'VERIFIED'
                ? null
                : property.rejectionReason,
        },
        { transaction: t },
      );

      await VerificationHistory.create(
        {
          propertyId,
          fromStatus: property.verificationStatus,
          toStatus: input.toStatus,
          notes: input.notes ?? null,
          actorId,
        },
        { transaction: t },
      );
    });

    await auditService.log({
      actorId,
      action: 'STATUS_CHANGE',
      entityType: 'Property',
      entityId: propertyId,
      meta: {
        from: property.verificationStatus,
        to: input.toStatus,
        notes: input.notes,
        role,
      },
    });

    return Property.findByPk(propertyId);
  },

  async history(propertyId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    return VerificationHistory.findAll({
      where: { propertyId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'fullName', 'role'] }],
      order: [['createdAt', 'DESC']],
    });
  },

  async upsertHealthReport(propertyId: string, input: HealthReportInput, actorId: string) {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      throw new NotFoundError('Property');
    }

    const existing = await PropertyHealthReport.findOne({ where: { propertyId } });
    let report: PropertyHealthReport;

    if (existing) {
      await existing.update({
        ...input,
        couldNotVerify: input.couldNotVerify ?? existing.couldNotVerify,
      });
      report = existing;
    } else {
      report = await PropertyHealthReport.create({
        propertyId,
        ownershipStatus: input.ownershipStatus ?? null,
        ownershipNotes: input.ownershipNotes ?? null,
        titleStatus: input.titleStatus ?? null,
        titleNotes: input.titleNotes ?? null,
        encumbranceStatus: input.encumbranceStatus ?? null,
        encumbranceNotes: input.encumbranceNotes ?? null,
        litigationStatus: input.litigationStatus ?? null,
        litigationNotes: input.litigationNotes ?? null,
        governmentApprovalStatus: input.governmentApprovalStatus ?? null,
        governmentApprovalNotes: input.governmentApprovalNotes ?? null,
        propertyTaxStatus: input.propertyTaxStatus ?? null,
        propertyTaxNotes: input.propertyTaxNotes ?? null,
        physicalInspectionStatus: input.physicalInspectionStatus ?? null,
        physicalInspectionNotes: input.physicalInspectionNotes ?? null,
        priceAssessmentStatus: input.priceAssessmentStatus ?? null,
        priceAssessmentNotes: input.priceAssessmentNotes ?? null,
        couldNotVerify: input.couldNotVerify ?? [],
        summary: input.summary ?? null,
      });
    }

    await auditService.log({
      actorId,
      action: 'UPDATE',
      entityType: 'PropertyHealthReport',
      entityId: report.id,
      meta: { propertyId },
    });

    return report;
  },
};
