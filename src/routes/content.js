import express from 'express';
import {
  getContactDetails,
  getAboutDetails,
  getHomeDetails,
  getSocialLinks,
  getPropertyDetails,
  getReviews,
  getReview,
  updateContactDetails,
  updateAboutDetails,
  updateHomeDetails,
  updatePropertyDetails
} from '../controllers/contentController.js';

const router = express.Router();

// Public routes
router.get('/contact-details', getContactDetails);
router.get('/about-details', getAboutDetails);
router.get('/home-details', getHomeDetails);
router.get('/social-links', getSocialLinks);
router.get('/property-details', getPropertyDetails);
router.get('/reviews', getReviews);
router.get('/reviews/:id', getReview);

// Admin routes (would need authentication middleware in production)
router.post('/contact-details', updateContactDetails);
router.post('/about-details', updateAboutDetails);
router.post('/home-details', updateHomeDetails);
router.post('/property-details', updatePropertyDetails);

export default router;
