import express from 'express';
import { body } from 'express-validator';
import {
  getReviews,
  getReview,
  createReview,
  getAdminReviews,
  updateReviewStatus,
  deleteReview,
  getReviewStats,
  bulkUpdateReviews
} from '../controllers/reviewController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateReview = [
  body('clientName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Client name must be between 2 and 100 characters'),
  body('clientEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('eventType')
    .isIn(['wedding', 'corporate', 'birthday', 'anniversary', 'graduation', 'other'])
    .withMessage('Invalid event type'),
  body('eventDate')
    .isISO8601()
    .withMessage('Please provide a valid event date'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters'),
  body('review')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Review must be between 10 and 2000 characters'),
  body('photos')
    .optional()
    .isArray()
    .withMessage('Photos must be an array'),
  body('photos.*.url')
    .optional()
    .isURL()
    .withMessage('Photo URL must be valid'),
  body('photos.*.alt')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Photo alt text cannot exceed 200 characters')
];

const validateStatusUpdate = [
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Admin notes cannot exceed 500 characters')
];

const validateBulkUpdate = [
  body('reviewIds')
    .isArray({ min: 1 })
    .withMessage('Review IDs array is required'),
  body('reviewIds.*')
    .isMongoId()
    .withMessage('Invalid review ID'),
  body('action')
    .optional()
    .isIn(['approve', 'reject', 'feature', 'unfeature'])
    .withMessage('Invalid action'),
  body('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid status'),
  body('isFeatured')
    .optional()
    .isBoolean()
    .withMessage('isFeatured must be a boolean')
];

// Public routes
router.get('/', getReviews);
router.get('/:id', getReview);
router.post('/', validateReview, createReview);

// Admin routes
router.use(protect, adminOnly);
router.get('/admin/all', getAdminReviews);
router.get('/admin/stats', getReviewStats);
router.patch('/admin/bulk', validateBulkUpdate, bulkUpdateReviews);
router.patch('/admin/:id', validateStatusUpdate, updateReviewStatus);
router.delete('/admin/:id', deleteReview);

export default router;
