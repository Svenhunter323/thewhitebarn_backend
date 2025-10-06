import express from 'express';
import {
  submitContactForm,
  validateContactForm
} from '../controllers/contactController.js';

const router = express.Router();

// Public routes only - admin contact management is handled by /api/admin/contacts
router.post('/', validateContactForm, submitContactForm);

// NOTE: Admin contact management routes are in /api/admin/contacts
// This keeps public contact routes separate from admin functionality

export default router;
