import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { VERIFICATION_STATUSES, type VerificationStatus } from '../enums.js';
import { sequelize } from '../sequelize.js';

export class VerificationHistory extends Model<
  InferAttributes<VerificationHistory>,
  InferCreationAttributes<VerificationHistory>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare fromStatus: VerificationStatus | null;
  declare toStatus: VerificationStatus;
  declare notes: string | null;
  declare actorId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

VerificationHistory.init(
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
    fromStatus: {
      type: DataTypes.ENUM(...VERIFICATION_STATUSES),
      allowNull: true,
      field: 'from_status',
    },
    toStatus: {
      type: DataTypes.ENUM(...VERIFICATION_STATUSES),
      allowNull: false,
      field: 'to_status',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    actorId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'actor_id',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'verification_history',
    updatedAt: false,
    indexes: [{ fields: ['property_id', 'created_at'] }],
  },
);
