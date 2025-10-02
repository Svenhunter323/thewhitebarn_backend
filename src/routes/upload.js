import express from 'express';
import {
  uploadSingle,
  uploadMultiple,
  processImages,
  uploadGalleryImages,
  uploadAvatar
} from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All upload routes require authentication
router.use(protect);

// Gallery image upload
router.post(
  '/gallery',
  uploadMultiple('images', 10),
  processImages,
  uploadGalleryImages
);

// Single gallery image upload
router.post(
  '/gallery/single',
  uploadSingle('image'),
  processImages,
  uploadGalleryImages
);

// Avatar upload
router.post(
  '/avatar',
  uploadSingle('avatar'),
  uploadAvatar
);

export default router;
