import express from 'express';
import { body } from 'express-validator';
import {
  getDashboardStats,
  getTimeSeriesData,
  getPageAnalytics,
  getDeviceAnalytics,
  trackPageView,
  getRealTimeStats,
  exportAnalytics
} from '../controllers/analyticsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validatePageView = [
  body('page')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Page path cannot exceed 255 characters'),
  body('referrer')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Referrer cannot exceed 500 characters'),
  body('sessionId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Session ID cannot exceed 100 characters')
];

// Public routes
router.post('/track', validatePageView, trackPageView);

// Admin routes
router.use(protect, adminOnly);
router.get('/dashboard', getDashboardStats);
router.get('/timeseries', getTimeSeriesData);
router.get('/pages', getPageAnalytics);
router.get('/devices', getDeviceAnalytics);
router.get('/realtime', getRealTimeStats);
router.get('/export', exportAnalytics);

export default router;
