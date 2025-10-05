import asyncHandler from 'express-async-handler';
import { validationResult } from 'express-validator';
import Review from '../models/Review.js';
import { Analytics } from '../models/Analytics.js';

// @desc    Get all reviews (public - approved only)
// @route   GET /api/reviews
// @access  Public
export const getReviews = asyncHandler(async (req, res) => {
  const { status = 'approved', limit = 10, skip = 0, featured } = req.query;
  
  let query = {};
  
  if (status === 'approved') {
    query.status = 'approved';
  }
  
  if (featured === 'true') {
    query.isFeatured = true;
  }
  
  const reviews = await Review.find(query)
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .select('-adminNotes -moderatedBy -ipAddress -userAgent -clientEmail');
  
  const total = await Review.countDocuments(query);
  
  res.json({
    status: 'success',
    data: {
      reviews,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    }
  });
});

// @desc    Get single review
// @route   GET /api/reviews/:id
// @access  Public
export const getReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id)
    .select('-adminNotes -moderatedBy -ipAddress -userAgent -clientEmail');
  
  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }
  
  res.json({
    status: 'success',
    data: { review }
  });
});

// @desc    Create new review
// @route   POST /api/reviews
// @access  Public
export const createReview = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  const {
    clientName,
    clientEmail,
    eventType,
    eventDate,
    rating,
    title,
    review,
    photos = []
  } = req.body;
  
  const newReview = await Review.create({
    clientName,
    clientEmail,
    eventType,
    eventDate,
    rating,
    title,
    review,
    photos,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Track analytics
  await Analytics.create({
    type: 'review_submission',
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip,
    metadata: {
      reviewId: newReview._id,
      rating: rating
    }
  });
  
  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully and is pending approval',
    data: { review: newReview }
  });
});

// @desc    Get all reviews for admin (including pending/rejected)
// @route   GET /api/admin/reviews
// @access  Private/Admin
export const getAdminReviews = asyncHandler(async (req, res) => {
  const { status, limit = 20, skip = 0, sort = '-createdAt' } = req.query;
  
  let query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  
  const reviews = await Review.find(query)
    .populate('moderatedBy', 'name email')
    .sort(sort)
    .limit(parseInt(limit))
    .skip(parseInt(skip));
  
  const total = await Review.countDocuments(query);
  
  // Get status counts
  const statusCounts = await Review.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const counts = {
    all: total,
    pending: 0,
    approved: 0,
    rejected: 0
  };
  
  statusCounts.forEach(item => {
    counts[item._id] = item.count;
  });
  
  res.json({
    status: 'success',
    data: {
      reviews,
      counts,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    }
  });
});

// @desc    Update review status
// @route   PATCH /api/admin/reviews/:id
// @access  Private/Admin
export const updateReviewStatus = asyncHandler(async (req, res) => {
  const { status, adminNotes, isFeatured } = req.body;
  const adminId = req.admin.id;
  
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }
  
  // Update fields
  if (status) {
    review.status = status;
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();
  }
  
  if (adminNotes !== undefined) {
    review.adminNotes = adminNotes;
  }
  
  if (isFeatured !== undefined) {
    review.isFeatured = isFeatured;
  }
  
  await review.save();
  
  await review.populate('moderatedBy', 'name email');
  
  res.json({
    status: 'success',
    message: 'Review updated successfully',
    data: { review }
  });
});

// @desc    Delete review
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  
  if (!review) {
    return res.status(404).json({
      status: 'error',
      message: 'Review not found'
    });
  }
  
  await review.deleteOne();
  
  res.json({
    status: 'success',
    message: 'Review deleted successfully'
  });
});

// @desc    Get review statistics
// @route   GET /api/admin/reviews/stats
// @access  Private/Admin
export const getReviewStats = asyncHandler(async (req, res) => {
  const stats = await Review.getStats();
  
  // Get recent reviews trend (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentTrend = await Review.aggregate([
    {
      $match: {
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // Get rating distribution
  const ratingDistribution = await Review.aggregate([
    {
      $match: { status: 'approved' }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  res.json({
    status: 'success',
    data: {
      stats,
      recentTrend,
      ratingDistribution
    }
  });
});

// @desc    Bulk update reviews
// @route   PATCH /api/admin/reviews/bulk
// @access  Private/Admin
export const bulkUpdateReviews = asyncHandler(async (req, res) => {
  const { reviewIds, action, status, isFeatured } = req.body;
  const adminId = req.admin.id;
  
  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Review IDs are required'
    });
  }
  
  let updateData = {
    moderatedBy: adminId,
    moderatedAt: new Date()
  };
  
  if (action === 'approve') {
    updateData.status = 'approved';
  } else if (action === 'reject') {
    updateData.status = 'rejected';
  } else if (action === 'feature') {
    updateData.isFeatured = true;
  } else if (action === 'unfeature') {
    updateData.isFeatured = false;
  } else if (status) {
    updateData.status = status;
  }
  
  if (isFeatured !== undefined) {
    updateData.isFeatured = isFeatured;
  }
  
  const result = await Review.updateMany(
    { _id: { $in: reviewIds } },
    updateData
  );
  
  res.json({
    status: 'success',
    message: `${result.modifiedCount} reviews updated successfully`,
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    }
  });
});
