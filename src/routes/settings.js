import express from 'express';
import { body } from 'express-validator';
import {
  getAllSettings,
  getSettingsByCategory,
  updateSettings,
  updateSingleSetting,
  getPublicSettings,
  resetSettings,
  initializeSettings,
  exportSettings,
  importSettings
} from '../controllers/settingsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateSettingsUpdate = [
  body('settings')
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.*')
    .isObject()
    .withMessage('Each category must be an object')
];

const validateSingleSettingUpdate = [
  body('value')
    .exists()
    .withMessage('Value is required')
];

const validateReset = [
  body('category')
    .optional()
    .isIn(['general', 'email', 'security', 'notifications', 'backup', 'analytics'])
    .withMessage('Invalid category')
];

const validateImport = [
  body('settings')
    .isArray()
    .withMessage('Settings must be an array'),
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite must be a boolean'),
  body('settings.*.category')
    .isIn(['general', 'email', 'security', 'notifications', 'backup', 'analytics'])
    .withMessage('Invalid category'),
  body('settings.*.key')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Key must be between 1 and 100 characters'),
  body('settings.*.value')
    .exists()
    .withMessage('Value is required')
];

// Public routes
router.get('/public', getPublicSettings);

// Admin routes
router.use(protect, adminOnly);
router.get('/', getAllSettings);
router.get('/:category', getSettingsByCategory);
router.put('/', validateSettingsUpdate, updateSettings);
router.put('/:category/:key', validateSingleSettingUpdate, updateSingleSetting);
router.post('/reset', validateReset, resetSettings);
router.post('/initialize', initializeSettings);
router.get('/export/data', exportSettings);
router.post('/import', validateImport, importSettings);

export default router;
