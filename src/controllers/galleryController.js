import asyncHandler from 'express-async-handler';
import Gallery from '../models/Gallery.js';

// @desc    Get all gallery images (admin view with all images)
// @route   GET /api/admin/gallery
// @access  Private/Admin
export const getAllGalleryImages = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category;
  const skip = (page - 1) * limit;

  let query = {};
  if (category && category !== 'all') {
    query.category = category;
  }

  const images = await Gallery.find(query)
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploadedBy', 'name email');

  const total = await Gallery.countDocuments(query);

  res.status(200).json({
    status: 'success',
    data: {
      images,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Update gallery image
// @route   PUT /api/admin/gallery/:id
// @access  Private/Admin
export const updateGalleryImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const image = await Gallery.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!image) {
    return res.status(404).json({
      status: 'error',
      message: 'Image not found'
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Image updated successfully',
    data: { image }
  });
});

// @desc    Delete gallery image
// @route   DELETE /api/admin/gallery/:id
// @access  Private/Admin
export const deleteGalleryImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const image = await Gallery.findByIdAndDelete(id);

  if (!image) {
    return res.status(404).json({
      status: 'error',
      message: 'Image not found'
    });
  }

  // TODO: Delete actual file from storage
  // fs.unlinkSync(image.path);

  res.status(200).json({
    status: 'success',
    message: 'Image deleted successfully'
  });
});

// @desc    Update gallery order
// @route   PUT /api/admin/gallery/order
// @access  Private/Admin
export const updateGalleryOrder = asyncHandler(async (req, res) => {
  const { imageOrders } = req.body; // Array of { id, order }

  const updatePromises = imageOrders.map(({ id, order }) =>
    Gallery.findByIdAndUpdate(id, { order }, { new: true })
  );

  await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    message: 'Gallery order updated successfully'
  });
});

// @desc    Bulk update gallery images
// @route   PATCH /api/admin/gallery/bulk
// @access  Private/Admin
export const bulkUpdateGalleryImages = asyncHandler(async (req, res) => {
  const { imageIds, action, category, isActive } = req.body;

  if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Image IDs array is required'
    });
  }

  let updateData = {};
  
  switch (action) {
    case 'activate':
      updateData.isActive = true;
      break;
    case 'deactivate':
      updateData.isActive = false;
      break;
    case 'categorize':
      if (category) updateData.category = category;
      break;
    case 'delete':
      await Gallery.deleteMany({ _id: { $in: imageIds } });
      return res.status(200).json({
        status: 'success',
        message: `${imageIds.length} images deleted successfully`
      });
    default:
      if (typeof isActive !== 'undefined') updateData.isActive = isActive;
      if (category) updateData.category = category;
  }

  const result = await Gallery.updateMany(
    { _id: { $in: imageIds } },
    updateData
  );

  res.status(200).json({
    status: 'success',
    message: `${result.modifiedCount} images updated successfully`,
    data: { modifiedCount: result.modifiedCount }
  });
});
