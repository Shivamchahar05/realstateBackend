import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import { createId } from '../../common/utils/id.js';
import {
  FURNISHING_STATUSES,
  LISTING_STATUSES,
  PROPERTY_TYPES,
  VERIFICATION_STATUSES,
  type FurnishingStatus,
  type ListingStatus,
  type PropertyType,
  type VerificationStatus,
} from '../enums.js';
import { sequelize } from '../sequelize.js';

export class Property extends Model<
  InferAttributes<Property>,
  InferCreationAttributes<Property>
> {
  declare id: CreationOptional<string>;
  declare propertyCode: string;
  declare title: string;
  declare description: string | null;
  declare propertyType: PropertyType;
  declare city: string;
  declare locality: string;
  declare address: string;
  declare state: CreationOptional<string>;
  declare pincode: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare bhk: number | null;
  declare carpetAreaSqft: number | null;
  declare builtUpAreaSqft: number | null;
  declare floor: number | null;
  declare totalFloors: number | null;
  declare ageYears: number | null;
  declare parkingSpaces: CreationOptional<number>;
  declare furnishing: CreationOptional<FurnishingStatus>;
  declare readyToMove: CreationOptional<boolean>;
  declare furnishingsInventory: CreationOptional<Array<{ key: string; qty: number }> | null>;
  declare amenities: CreationOptional<string[] | null>;
  declare nearbyPlaces: CreationOptional<
    Array<{ name: string; distance: string; category: string }> | null
  >;
  declare askingPrice: number;
  declare estimatedMinPrice: number | null;
  declare estimatedMaxPrice: number | null;
  declare trustScore: number | null;
  declare listingStatus: CreationOptional<ListingStatus>;
  declare verificationStatus: CreationOptional<VerificationStatus>;
  declare rejectionReason: string | null;
  declare lastVerifiedAt: Date | null;
  declare sellerId: string | null;
  declare lawyerId: string | null;
  declare inspectorId: string | null;
  declare propertyManagerId: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Property.init(
  {
    id: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      defaultValue: () => createId(),
    },
    propertyCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'property_code',
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    propertyType: {
      type: DataTypes.ENUM(...PROPERTY_TYPES),
      allowNull: false,
      field: 'property_type',
    },
    city: { type: DataTypes.STRING(100), allowNull: false },
    locality: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.STRING(500), allowNull: false },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'Haryana',
    },
    pincode: { type: DataTypes.STRING(10), allowNull: true },
    latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    bhk: { type: DataTypes.INTEGER, allowNull: true },
    carpetAreaSqft: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'carpet_area_sqft',
    },
    builtUpAreaSqft: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'built_up_area_sqft',
    },
    floor: { type: DataTypes.INTEGER, allowNull: true },
    totalFloors: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_floors',
    },
    ageYears: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'age_years',
    },
    parkingSpaces: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'parking_spaces',
    },
    furnishing: {
      type: DataTypes.ENUM(...FURNISHING_STATUSES),
      allowNull: false,
      defaultValue: 'UNFURNISHED',
    },
    readyToMove: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'ready_to_move',
    },
    furnishingsInventory: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'furnishings_inventory',
    },
    amenities: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    nearbyPlaces: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      field: 'nearby_places',
    },
    askingPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: 'asking_price',
    },
    estimatedMinPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: 'estimated_min_price',
    },
    estimatedMaxPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
      field: 'estimated_max_price',
    },
    trustScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'trust_score',
    },
    listingStatus: {
      type: DataTypes.ENUM(...LISTING_STATUSES),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'listing_status',
    },
    verificationStatus: {
      type: DataTypes.ENUM(...VERIFICATION_STATUSES),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'verification_status',
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'rejection_reason',
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_verified_at',
    },
    sellerId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'seller_id',
    },
    lawyerId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'lawyer_id',
    },
    inspectorId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'inspector_id',
    },
    propertyManagerId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'property_manager_id',
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'properties',
    indexes: [
      { fields: ['city', 'locality'] },
      { fields: ['listing_status'] },
      { fields: ['verification_status'] },
      { fields: ['asking_price'] },
      { fields: ['seller_id'] },
    ],
  },
);
