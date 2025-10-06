import express from 'express';
import Gallery from '../models/Gallery.js';
import asyncHandler from 'express-async-handler';
import {
  getAllGalleryImages,
  updateGalleryImage,
  deleteGalleryImage,
  updateGalleryOrder,
  bulkUpdateGalleryImages
} from '../controllers/galleryController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get gallery images
// @route   GET /api/gallery
// @access  Public
router.get('/', asyncHandler(async (req, res) => {
  const { category, limit = 20, skip = 0 } = req.query;
  
  let query = { isActive: true };
  
  if (category && category !== 'all') {
    query.category = category;
  }
  
  const images = await Gallery.find(query)
    .sort({ order: 1, createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));
    
  const total = await Gallery.countDocuments(query);
  
  res.status(200).json({
    status: 'success',
    data: images,
    pagination: {
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    }
  });
}));

// @desc    Get gallery categories
// @route   GET /api/gallery/categories
// @access  Public
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Gallery.distinct('category', { isActive: true });
  
  res.status(200).json({
    status: 'success',
    data: categories
  });
}));

// =============================================================================
// ADMIN ROUTES - Must come BEFORE parameterized routes like /:id
// =============================================================================

// Admin gallery management
router.get('/admin', protect, adminOnly, getAllGalleryImages);
router.put('/admin/order', protect, adminOnly, updateGalleryOrder);
router.patch('/admin/bulk', protect, adminOnly, bulkUpdateGalleryImages);
router.put('/admin/:id', protect, adminOnly, updateGalleryImage);
router.delete('/admin/:id', protect, adminOnly, deleteGalleryImage);

// =============================================================================
// PARAMETERIZED ROUTES - Must come AFTER specific routes
// =============================================================================

// @desc    Get single gallery image
// @route   GET /api/gallery/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const image = await Gallery.findById(req.params.id);
  
  if (!image) {
    res.status(404);
    throw new Error('Image not found');
  }
  
  // Increment view count
  await image.incrementViews();
  
  res.status(200).json({
    status: 'success',
    data: image
  });
}));

export default router;
