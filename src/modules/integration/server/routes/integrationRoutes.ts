import { authenticated } from '@server/middleware/authMiddleware';
import { checkModuleAuthorization } from '@server/middleware/moduleAuthMiddleware';
import { Router } from 'express';
import apiKeyRoutes from './apiKeyRoutes';
import eventRoutes from './eventRoutes';
import partnerRoutes from './partnerRoutes';
import webhookRoutes from './webhookRoutes';

const router = Router();
router.use(authenticated());
router.use(checkModuleAuthorization('integration'));
router.use(partnerRoutes);
router.use(eventRoutes);
router.use(apiKeyRoutes);
router.use(webhookRoutes);

export default router;