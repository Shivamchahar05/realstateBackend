import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  type DocumentCategory,
  type DocumentStatus,
} from '../enums.js';
import { sequelize } from '../sequelize.js';

export class Document extends Model<
  InferAttributes<Document>,
  InferCreationAttributes<Document>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare category: DocumentCategory;
  declare title: string;
  declare fileName: string;
  declare fileUrl: string;
  declare mimeType: string;
  declare fileSize: number;
  declare version: CreationOptional<number>;
  declare status: CreationOptional<DocumentStatus>;
  declare notes: string | null;
  declare uploadedById: string;
  declare reviewedById: string | null;
  declare reviewedAt: Date | null;
  declare expiresAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Document.init(
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
    category: {
      type: DataTypes.ENUM(...DOCUMENT_CATEGORIES),
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    fileUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'file_url',
    },
    mimeType: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'mime_type',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM(...DOCUMENT_STATUSES),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    uploadedById: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'uploaded_by_id',
    },
    reviewedById: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'reviewed_by_id',
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reviewed_at',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'documents',
    indexes: [
      { fields: ['property_id', 'category'] },
      { fields: ['status'] },
    ],
  },
);
