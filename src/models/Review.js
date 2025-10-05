import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [100, 'Client name cannot exceed 100 characters']
  },
  clientEmail: {
    type: String,
    required: [true, 'Client email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: ['wedding', 'corporate', 'birthday', 'anniversary', 'graduation', 'other'],
    default: 'wedding'
  },
  eventDate: {
    type: Date,
    required: [true, 'Event date is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  review: {
    type: String,
    required: [true, 'Review content is required'],
    trim: true,
    maxlength: [2000, 'Review cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  photos: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    caption: {
      type: String,
      trim: true
    }
  }],
  adminNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin notes cannot exceed 500 characters']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['website', 'google', 'facebook', 'manual'],
    default: 'website'
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  moderatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for average rating calculation
reviewSchema.virtual('displayRating').get(function() {
  return Math.round(this.rating * 10) / 10;
});

// Static method to get approved reviews
reviewSchema.statics.getApproved = function(limit = 10, skip = 0) {
  return this.find({ status: 'approved' })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('-adminNotes -moderatedBy -ipAddress -userAgent');
};

// Static method to get featured reviews
reviewSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ status: 'approved', isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-adminNotes -moderatedBy -ipAddress -userAgent');
};

// Static method to get review statistics
reviewSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        approvedReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        pendingReviews: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        averageRating: { $avg: '$rating' },
        featuredReviews: {
          $sum: { $cond: ['$isFeatured', 1, 0] }
        }
      }
    }
  ]);

  return stats[0] || {
    totalReviews: 0,
    approvedReviews: 0,
    pendingReviews: 0,
    averageRating: 0,
    featuredReviews: 0
  };
};

// Method to approve review
reviewSchema.methods.approve = function(adminId) {
  this.status = 'approved';
  this.moderatedBy = adminId;
  this.moderatedAt = new Date();
  return this.save();
};

// Method to reject review
reviewSchema.methods.reject = function(adminId, notes = '') {
  this.status = 'rejected';
  this.moderatedBy = adminId;
  this.moderatedAt = new Date();
  if (notes) this.adminNotes = notes;
  return this.save();
};

// Indexes for efficient querying
reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ isFeatured: 1, status: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ eventType: 1 });
reviewSchema.index({ clientEmail: 1 });

// Text index for search functionality
reviewSchema.index({
  title: 'text',
  review: 'text',
  clientName: 'text'
});

// Prevent model overwrite error
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);
export default Review;
