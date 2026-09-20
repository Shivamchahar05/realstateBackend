import { Op } from 'sequelize';
import type { Role } from '../../db/enums.js';
import { AuditLog, Property, Transaction, User } from '../../db/models/index.js';

function assignmentWhere(role: Role, userId: string): Record<string, string> | undefined {
  if (role === 'LAWYER') return { lawyerId: userId };
  if (role === 'INSPECTOR') return { inspectorId: userId };
  if (role === 'PROPERTY_MANAGER') return { propertyManagerId: userId };
  return undefined;
}

export const dashboardService = {
  async getMetrics(actor?: { id: string; role: Role }) {
    const scope = actor ? assignmentWhere(actor.role, actor.id) : undefined;
    const propertyWhere = scope ?? {};

    const [
      totalProperties,
      verifiedProperties,
      rejectedProperties,
      pendingVerification,
      buyers,
      sellers,
      activeTransactions,
      completedTransactions,
      liveListings,
      recentProperties,
      recentAudits,
    ] = await Promise.all([
      Property.count({ where: propertyWhere }),
      Property.count({ where: { ...propertyWhere, verificationStatus: 'VERIFIED' } }),
      Property.count({ where: { ...propertyWhere, verificationStatus: 'REJECTED' } }),
      Property.count({
        where: {
          ...propertyWhere,
          verificationStatus: {
            [Op.notIn]: ['VERIFIED', 'REJECTED', 'DRAFT'],
          },
        },
      }),
      scope ? Promise.resolve(0) : User.count({ where: { role: 'BUYER' } }),
      scope ? Promise.resolve(0) : User.count({ where: { role: 'SELLER' } }),
      scope
        ? Promise.resolve(0)
        : Transaction.count({
            where: {
              stage: {
                [Op.notIn]: ['POSSESSION_COMPLETED', 'CANCELLED'],
              },
            },
          }),
      scope
        ? Promise.resolve(0)
        : Transaction.count({ where: { stage: 'POSSESSION_COMPLETED' } }),
      Property.count({ where: { ...propertyWhere, listingStatus: 'LIVE' } }),
      Property.findAll({
        where: propertyWhere,
        limit: 5,
        order: [['updatedAt', 'DESC']],
        attributes: [
          'id',
          'propertyCode',
          'title',
          'city',
          'verificationStatus',
          'listingStatus',
          'askingPrice',
          'updatedAt',
        ],
      }),
      scope
        ? Promise.resolve([])
        : AuditLog.findAll({
            limit: 8,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, as: 'actor', attributes: ['id', 'fullName', 'role'] }],
          }),
    ]);

    return {
      totals: {
        totalProperties,
        verifiedProperties,
        rejectedProperties,
        pendingVerification,
        liveListings,
        buyers,
        sellers,
        activeTransactions,
        completedTransactions,
      },
      recentProperties,
      recentAudits,
    };
  },
};
