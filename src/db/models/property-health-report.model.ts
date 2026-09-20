import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { sequelize } from '../sequelize.js';

export class PropertyHealthReport extends Model<
  InferAttributes<PropertyHealthReport>,
  InferCreationAttributes<PropertyHealthReport>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare ownershipStatus: string | null;
  declare ownershipNotes: string | null;
  declare titleStatus: string | null;
  declare titleNotes: string | null;
  declare encumbranceStatus: string | null;
  declare encumbranceNotes: string | null;
  declare litigationStatus: string | null;
  declare litigationNotes: string | null;
  declare governmentApprovalStatus: string | null;
  declare governmentApprovalNotes: string | null;
  declare propertyTaxStatus: string | null;
  declare propertyTaxNotes: string | null;
  declare physicalInspectionStatus: string | null;
  declare physicalInspectionNotes: string | null;
  declare priceAssessmentStatus: string | null;
  declare priceAssessmentNotes: string | null;
  declare couldNotVerify: CreationOptional<string[]>;
  declare summary: string | null;
  declare generatedAt: CreationOptional<Date>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PropertyHealthReport.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => createId(),
    },
    propertyId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'property_id',
    },
    ownershipStatus: { type: DataTypes.STRING(100), allowNull: true, field: 'ownership_status' },
    ownershipNotes: { type: DataTypes.TEXT, allowNull: true, field: 'ownership_notes' },
    titleStatus: { type: DataTypes.STRING(100), allowNull: true, field: 'title_status' },
    titleNotes: { type: DataTypes.TEXT, allowNull: true, field: 'title_notes' },
    encumbranceStatus: { type: DataTypes.STRING(100), allowNull: true, field: 'encumbrance_status' },
    encumbranceNotes: { type: DataTypes.TEXT, allowNull: true, field: 'encumbrance_notes' },
    litigationStatus: { type: DataTypes.STRING(100), allowNull: true, field: 'litigation_status' },
    litigationNotes: { type: DataTypes.TEXT, allowNull: true, field: 'litigation_notes' },
    governmentApprovalStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'government_approval_status',
    },
    governmentApprovalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'government_approval_notes',
    },
    propertyTaxStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'property_tax_status',
    },
    propertyTaxNotes: { type: DataTypes.TEXT, allowNull: true, field: 'property_tax_notes' },
    physicalInspectionStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'physical_inspection_status',
    },
    physicalInspectionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'physical_inspection_notes',
    },
    priceAssessmentStatus: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'price_assessment_status',
    },
    priceAssessmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'price_assessment_notes',
    },
    couldNotVerify: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: 'could_not_verify',
    },
    summary: { type: DataTypes.TEXT, allowNull: true },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'generated_at',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'property_health_reports',
  },
);
