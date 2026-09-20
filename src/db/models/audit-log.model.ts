import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { AUDIT_ACTIONS, type AuditAction } from '../enums.js';
import { sequelize } from '../sequelize.js';

export class AuditLog extends Model<
  InferAttributes<AuditLog>,
  InferCreationAttributes<AuditLog>
> {
  declare id: CreationOptional<string>;
  declare actorId: string | null;
  declare action: AuditAction;
  declare entityType: string;
  declare entityId: string | null;
  declare meta: Record<string, unknown> | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => createId(),
    },
    actorId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'actor_id',
    },
    action: {
      type: DataTypes.ENUM(...AUDIT_ACTIONS),
      allowNull: false,
    },
    entityType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'entity_type',
    },
    entityId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'entity_id',
    },
    meta: { type: DataTypes.JSONB, allowNull: true },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'ip_address',
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'user_agent',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'audit_logs',
    updatedAt: false,
    indexes: [
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['actor_id', 'created_at'] },
      { fields: ['created_at'] },
    ],
  },
);
