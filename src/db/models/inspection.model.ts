import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { INSPECTION_STATUSES, type InspectionStatus } from '../enums.js';
import { sequelize } from '../sequelize.js';

export class Inspection extends Model<
  InferAttributes<Inspection>,
  InferCreationAttributes<Inspection>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare inspectorId: string;
  declare status: CreationOptional<InspectionStatus>;
  declare scheduledAt: Date | null;
  declare completedAt: Date | null;
  declare checklist: Record<string, unknown> | null;
  declare findings: string | null;
  declare issues: string | null;
  declare photos: CreationOptional<string[]>;
  declare latitude: number | null;
  declare longitude: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Inspection.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => createId(),
    },
    propertyId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'property_id',
    },
    inspectorId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'inspector_id',
    },
    status: {
      type: DataTypes.ENUM(...INSPECTION_STATUSES),
      allowNull: false,
      defaultValue: 'ASSIGNED',
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'scheduled_at',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    checklist: { type: DataTypes.JSONB, allowNull: true },
    findings: { type: DataTypes.TEXT, allowNull: true },
    issues: { type: DataTypes.TEXT, allowNull: true },
    photos: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'inspections',
    indexes: [
      { fields: ['property_id'] },
      { fields: ['inspector_id'] },
      { fields: ['status'] },
    ],
  },
);
