import express from 'express';
import {
  getDashboardStats,
  getAllAdmins,
  updateAdminStatus,
  deleteAdmin,
  updateContactDetails,
  updateAboutDetails,
  updateHomeDetails,
  updatePropertyDetails,
  updateSocialLinks,
  getAllReviews,
  updateReviewStatus,
  deleteReview,
  getAllGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  updateGalleryOrder
} from '../controllers/adminController.js';
import {
  getContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  deleteContactSubmission
} from '../controllers/contactController.js';
import { protect, restrictTo, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Admin Management (Super Admin only)
router.get('/admins', restrictTo('super_admin'), getAllAdmins);
router.put('/admins/:id/status', restrictTo('super_admin'), updateAdminStatus);
router.delete('/admins/:id', restrictTo('super_admin'), deleteAdmin);

// Contact Management
router.get('/contacts', getContactSubmissions);
router.get('/contacts/:id', getContactSubmission);
router.put('/contacts/:id', updateContactStatus);
router.delete('/contacts/:id', deleteContactSubmission);

// Content Management
router.put('/content/contact-details', updateContactDetails);
router.put('/content/about-details', updateAboutDetails);
router.put('/content/home-details', updateHomeDetails);
router.put('/content/property-details', updatePropertyDetails);
router.put('/content/social-links', updateSocialLinks);

// Review Management
router.get('/reviews', getAllReviews);
router.put('/reviews/:id', updateReviewStatus);
router.delete('/reviews/:id', deleteReview);

// Gallery Management
router.get('/gallery', getAllGalleryImages);
router.put('/gallery/:id', updateGalleryImage);
router.delete('/gallery/:id', deleteGalleryImage);
router.put('/gallery/order', updateGalleryOrder);

export default router;
