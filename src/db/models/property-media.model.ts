import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import { MEDIA_TYPES, type MediaType } from '../enums.js';
import { sequelize } from '../sequelize.js';

export class PropertyMedia extends Model<
  InferAttributes<PropertyMedia>,
  InferCreationAttributes<PropertyMedia>
> {
  declare id: CreationOptional<string>;
  declare propertyId: string;
  declare type: CreationOptional<MediaType>;
  declare url: string;
  declare caption: string | null;
  declare sortOrder: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

PropertyMedia.init(
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
    type: {
      type: DataTypes.ENUM(...MEDIA_TYPES),
      allowNull: false,
      defaultValue: 'PHOTO',
    },
    url: { type: DataTypes.STRING(500), allowNull: false },
    caption: { type: DataTypes.STRING(255), allowNull: true },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'sort_order',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'property_media',
    updatedAt: false,
    indexes: [{ fields: ['property_id'] }],
  },
);
