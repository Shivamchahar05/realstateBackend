import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import propertyRoutes from '../modules/properties/property.routes.js';
import verificationRoutes from '../modules/verifications/verification.routes.js';
import documentRoutes from '../modules/documents/document.routes.js';
import inspectionRoutes from '../modules/inspections/inspection.routes.js';
import mediaRoutes from '../modules/media/media.routes.js';
import transactionRoutes from '../modules/transactions/transaction.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import auditRoutes from '../modules/audit/audit.routes.js';
import catalogRoutes from '../modules/catalog/catalog.routes.js';
import sellerRoutes from '../modules/seller/seller.routes.js';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/catalog', catalogRoutes);
apiRouter.use('/seller', sellerRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/properties', propertyRoutes);
apiRouter.use('/properties/:propertyId/verifications', verificationRoutes);
apiRouter.use('/properties/:propertyId/documents', documentRoutes);
apiRouter.use('/properties/:propertyId/inspections', inspectionRoutes);
apiRouter.use('/properties/:propertyId/media', mediaRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/audit-logs', auditRoutes);

export default apiRouter;
