import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { TRANSACTION_STAGES, type TransactionStage } from '../enums.js';
import { sequelize } from '../sequelize.js';

export class Transaction extends Model<
  InferAttributes<Transaction>,
  InferCreationAttributes<Transaction>
> {
  declare id: CreationOptional<string>;
  declare transactionCode: string;
  declare propertyId: string;
  declare buyerId: string;
  declare propertyManagerId: string | null;
  declare stage: CreationOptional<TransactionStage>;
  declare sellerPrice: number | null;
  declare negotiatedPrice: number | null;
  declare notes: string | null;
  declare completedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Transaction.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => createId(),
    },
    transactionCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'transaction_code',
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
    propertyManagerId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'property_manager_id',
    },
    stage: {
      type: DataTypes.ENUM(...TRANSACTION_STAGES),
      allowNull: false,
      defaultValue: 'PROPERTY_SELECTED',
    },
    sellerPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: 'seller_price',
    },
    negotiatedPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: 'negotiated_price',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'transactions',
    indexes: [
      { fields: ['property_id'] },
      { fields: ['buyer_id'] },
      { fields: ['stage'] },
    ],
  },
);
