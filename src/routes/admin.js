import express from 'express';
import {
  getDashboardStats,
  getAllAdmins,
  updateAdminStatus,
  deleteAdmin,
  updateSocialLinks
} from '../controllers/adminController.js';
import {
  getContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  deleteContactSubmission
} from '../controllers/contactController.js';
// NOTE: Review and Gallery admin functions are handled by their respective route files
// /api/reviews/admin/* for review management
// /api/gallery/admin/* for gallery management (to be created)
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Admin Management (Super Admin only)
router.route('/admins')
  .get(restrictTo('super_admin'), getAllAdmins);

router.route('/admins/:id')
  .put(restrictTo('super_admin'), updateAdminStatus)
  .delete(restrictTo('super_admin'), deleteAdmin);

// Contact Management
router.route('/contacts')
  .get(getContactSubmissions);

router.route('/contacts/:id')
  .get(getContactSubmission)
  .put(updateContactStatus)
  .delete(deleteContactSubmission);

// Social Links Management
router.put('/social-links', updateSocialLinks);

// NOTE: Review management moved to /api/reviews/admin/*
// NOTE: Gallery management moved to /api/gallery/admin/*
// This keeps admin routes focused on core admin operations only

export default router;
