import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import {
  PROPERTY_REQUEST_STATUSES,
  type PropertyRequestStatus,
} from '../enums.js';
import { sequelize } from '../sequelize.js';

export class PropertyRequest extends Model<
  InferAttributes<PropertyRequest>,
  InferCreationAttributes<PropertyRequest>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare buyerId: string;
  declare message: string | null;
  declare status: CreationOptional<PropertyRequestStatus>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PropertyRequest.init(
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
    buyerId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'buyer_id',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      // STRING avoids brittle Postgres ENUM alters when pipeline stages evolve
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'NEW',
      validate: {
        isIn: [PROPERTY_REQUEST_STATUSES as unknown as string[]],
      },
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'property_requests',
    indexes: [
      { fields: ['property_id'] },
      { fields: ['buyer_id'] },
      { fields: ['status'] },
      { unique: true, fields: ['buyer_id', 'property_id'], name: 'property_requests_buyer_property_unique' },
    ],
  },
);
