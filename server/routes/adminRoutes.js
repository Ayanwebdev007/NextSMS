import express from 'express';
import { getAllBusinesses, getContactSubmissions, updateBusinessStatus, updateBusinessCredits, getBusinessActivity, getAdminDashboardStats, adminDisconnectSession } from '../controllers/adminController.js';
import { createPlan, getAllPlans, updatePlan } from '../controllers/planController.js'; // Moved from planRoutes
import { protectAdmin } from '../middlewares/adminAuth.js';

const router = express.Router();

router.use(protectAdmin);

router.get('/dashboard-stats', getAdminDashboardStats);

router.get('/businesses', getAllBusinesses);

router.put('/businesses/:id', updateBusinessStatus);
router.put('/businesses/:id/credits', updateBusinessCredits);
router.get('/businesses/:id/activity', getBusinessActivity);
router.post('/businesses/:id/disconnect', adminDisconnectSession);


router.route('/plans')
    .get(getAllPlans)
    .post(createPlan)

router.route('/plans/:id').put(updatePlan)

router.get('/submissions', getContactSubmissions)
export default router;