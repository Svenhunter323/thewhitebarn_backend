import express from 'express';
import {
  submitContactForm,
  getContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  deleteContactSubmission,
  validateContactForm
} from '../controllers/contactController.js';

const router = express.Router();

// Public routes
router.post('/', validateContactForm, submitContactForm);

// Admin routes (would need authentication middleware in production)
router.get('/', getContactSubmissions);
router.get('/:id', getContactSubmission);
router.put('/:id', updateContactStatus);
router.delete('/:id', deleteContactSubmission);

export default router;
