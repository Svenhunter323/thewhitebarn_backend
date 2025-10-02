import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: 0
  },
  mimetype: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['weddings', 'ceremonies', 'receptions', 'venue', 'gardens', 'general'],
    default: 'general'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  alt: {
    type: String,
    trim: true,
    maxlength: [200, 'Alt text cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
    colorSpace: String,
    hasAlpha: Boolean,
    orientation: Number
  },
  thumbnails: {
    small: {
      path: String,
      width: Number,
      height: Number
    },
    medium: {
      path: String,
      width: Number,
      height: Number
    },
    large: {
      path: String,
      width: Number,
      height: Number
    }
  },
  seo: {
    slug: {
      type: String,
      trim: true,
      lowercase: true
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    }
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Virtual for full URL
gallerySchema.virtual('fullUrl').get(function() {
  if (this.url) return this.url;
  return `${process.env.FRONTEND_URL || 'http://localhost:5173'}${this.path}`;
});

// Virtual for file extension
gallerySchema.virtual('extension').get(function() {
  return this.filename.split('.').pop().toLowerCase();
});

// Virtual for human readable file size
gallerySchema.virtual('humanSize').get(function() {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = Math.floor(Math.log(this.size) / Math.log(1024));
  return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Pre-save middleware to generate slug
gallerySchema.pre('save', function(next) {
  if (this.title && (!this.seo.slug || this.isModified('title'))) {
    this.seo.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Generate alt text if not provided
  if (!this.alt && this.title) {
    this.alt = this.title;
  }
  
  next();
});

// Static method to get images by category
gallerySchema.statics.getByCategory = function(category, limit = 20, skip = 0) {
  const query = { isActive: true };
  if (category && category !== 'all') {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('-uploadedBy');
};

// Static method to get featured images
gallerySchema.statics.getFeatured = function(limit = 10) {
  return this.find({ isActive: true, isFeatured: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .select('-uploadedBy');
};

// Method to increment view count
gallerySchema.methods.incrementViews = function() {
  return this.updateOne({ $inc: { 'analytics.views': 1 } });
};

// Method to increment download count
gallerySchema.methods.incrementDownloads = function() {
  return this.updateOne({ $inc: { 'analytics.downloads': 1 } });
};

// Method to toggle like
gallerySchema.methods.toggleLike = function(increment = true) {
  const update = increment 
    ? { $inc: { 'analytics.likes': 1 } }
    : { $inc: { 'analytics.likes': -1 } };
  
  return this.updateOne(update);
};

// Indexes for efficient querying
gallerySchema.index({ category: 1, isActive: 1 });
gallerySchema.index({ isFeatured: 1, isActive: 1 });
gallerySchema.index({ order: 1, createdAt: -1 });
gallerySchema.index({ 'seo.slug': 1 });
gallerySchema.index({ tags: 1 });
gallerySchema.index({ uploadedBy: 1 });

// Text index for search functionality
gallerySchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
  'seo.metaTitle': 'text',
  'seo.metaDescription': 'text'
});

export default mongoose.model('Gallery', gallerySchema);
