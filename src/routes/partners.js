import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  lookupPartner,
  generatePartnerQR,
  createPartner,
  getPartners,
  getPartner,
  updatePartner,
  deletePartner,
  getPartnerContacts,
  getPartnerAnalytics
} from '../controllers/partnerController.js';

const router = express.Router();

// Rate limiting for public endpoints
const publicLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting for partner creation (more restrictive)
const partnerCreationLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 partner creation requests per hour
  message: {
    status: 'error',
    message: 'Too many partner creation attempts, please try again later.'
  }
});

// Validation middleware for partner data
const validatePartnerData = (req, res, next) => {
  const { name, type, email } = req.body;
  
  // Required field validation
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      status: 'error',
      message: 'Name must be at least 2 characters long'
    });
  }
  
  if (!type || !['affiliate', 'influencer', 'vendor'].includes(type)) {
    return res.status(400).json({
      status: 'error',
      message: 'Type must be affiliate, influencer, or vendor'
    });
  }
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      status: 'error',
      message: 'Valid email address is required'
    });
  }
  
  // Sanitize inputs
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();
  
  if (req.body.phone) {
    req.body.phone = req.body.phone.trim();
  }
  
  if (req.body.notes) {
    req.body.notes = req.body.notes.trim();
  }
  
  next();
};

// Public routes (no authentication required)
router.get('/lookup/:code', publicLimit, lookupPartner);
router.get('/qr/:code', publicLimit, generatePartnerQR);

// Partner application route (public but rate limited)
router.post('/', publicLimit, partnerCreationLimit, validatePartnerData, createPartner);

// Admin routes (require authentication and admin privileges)
router.use(protect, adminOnly); // Apply to all routes below

// Partner management routes
router.get('/', getPartners);
router.get('/analytics', getPartnerAnalytics);
router.get('/:id', getPartner);
router.put('/:id', validatePartnerData, updatePartner);
router.delete('/:id', deletePartner);

// Partner contacts routes
router.get('/:code/contacts', getPartnerContacts);

export default router;
