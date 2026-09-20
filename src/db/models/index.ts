import { sequelize } from '../sequelize.js';
import { env } from '../../config/env.js';
import { User } from './user.model.js';
import { RefreshToken } from './refresh-token.model.js';
import { Property } from './property.model.js';
import { PropertyMedia } from './property-media.model.js';
import { Document } from './document.model.js';
import { VerificationHistory } from './verification-history.model.js';
import { PropertyHealthReport } from './property-health-report.model.js';
import { Inspection } from './inspection.model.js';
import { Transaction } from './transaction.model.js';
import { AuditLog } from './audit-log.model.js';

User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Property, { foreignKey: 'sellerId', as: 'sellerProperties' });
User.hasMany(Property, { foreignKey: 'lawyerId', as: 'assignedAsLawyer' });
User.hasMany(Property, { foreignKey: 'inspectorId', as: 'assignedAsInspector' });
User.hasMany(Property, { foreignKey: 'propertyManagerId', as: 'managedProperties' });

Property.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });
Property.belongsTo(User, { foreignKey: 'lawyerId', as: 'lawyer' });
Property.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });
Property.belongsTo(User, { foreignKey: 'propertyManagerId', as: 'propertyManager' });

Property.hasMany(PropertyMedia, { foreignKey: 'propertyId', as: 'media' });
PropertyMedia.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Document, { foreignKey: 'propertyId', as: 'documents' });
Document.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Document.belongsTo(User, { foreignKey: 'uploadedById', as: 'uploadedBy' });
Document.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewedBy' });

Property.hasMany(VerificationHistory, {
  foreignKey: 'propertyId',
  as: 'verificationHistory',
});
VerificationHistory.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
VerificationHistory.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

Property.hasOne(PropertyHealthReport, { foreignKey: 'propertyId', as: 'healthReport' });
PropertyHealthReport.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Property.hasMany(Inspection, { foreignKey: 'propertyId', as: 'inspections' });
Inspection.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Inspection.belongsTo(User, { foreignKey: 'inspectorId', as: 'inspector' });

Property.hasMany(Transaction, { foreignKey: 'propertyId', as: 'transactions' });
Transaction.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });
Transaction.belongsTo(User, { foreignKey: 'buyerId', as: 'buyer' });
Transaction.belongsTo(User, { foreignKey: 'propertyManagerId', as: 'propertyManager' });

User.hasMany(Transaction, { foreignKey: 'buyerId', as: 'buyerTransactions' });
User.hasMany(Transaction, { foreignKey: 'propertyManagerId', as: 'managedTransactions' });
User.hasMany(AuditLog, { foreignKey: 'actorId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'actorId', as: 'actor' });

export const models = {
  User,
  RefreshToken,
  Property,
  PropertyMedia,
  Document,
  VerificationHistory,
  PropertyHealthReport,
  Inspection,
  Transaction,
  AuditLog,
};

/**
 * Sync models → PostgreSQL tables.
 * alter: true updates columns when models change (no Prisma migrations).
 */
export async function syncDatabase(): Promise<void> {
  await sequelize.authenticate();
  await sequelize.sync({
    alter: env.DB_SYNC_ALTER,
    force: env.DB_SYNC_FORCE,
  });
  console.log(
    `Database synced (alter=${env.DB_SYNC_ALTER}, force=${env.DB_SYNC_FORCE})`,
  );
}

export {
  User,
  RefreshToken,
  Property,
  PropertyMedia,
  Document,
  VerificationHistory,
  PropertyHealthReport,
  Inspection,
  Transaction,
  AuditLog,
  sequelize,
};
