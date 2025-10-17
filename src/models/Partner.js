import mongoose from 'mongoose';
import validator from 'validator';

const partnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Partner name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Partner type is required'],
    enum: {
      values: ['affiliate', 'influencer', 'vendor'],
      message: 'Type must be affiliate, influencer, or vendor'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Please provide valid email'],
    unique: true
  },
  social: {
    instagram: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^@?[\w.]+$/.test(v);
        },
        message: 'Invalid Instagram handle'
      }
    },
    tiktok: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^@?[\w.]+$/.test(v);
        },
        message: 'Invalid TikTok handle'
      }
    },
    website: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v) {
          return !v || validator.isURL(v);
        },
        message: 'Invalid website URL'
      }
    }
  },
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    validate: {
      validator: function(v) {
        return /^TWBFL-[A-Z0-9]{4,10}$/.test(v);
      },
      message: 'Code must follow TWBFL-XXXXX format'
    }
  },
  active: {
    type: Boolean,
    default: true
  },
  // Performance tracking
  stats: {
    totalLeads: { type: Number, default: 0 },
    totalTours: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    lastActivityAt: { type: Date, default: Date.now }
  },
  // Contact information
  phone: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\+?[\d\s\-\(\)]+$/.test(v);
      },
      message: 'Invalid phone number format'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
partnerSchema.index({ code: 1 }, { unique: true });
partnerSchema.index({ email: 1 }, { unique: true });
partnerSchema.index({ type: 1, active: 1 });
partnerSchema.index({ 'stats.lastActivityAt': -1 });

// Generate unique partner code from name
const generatePartnerCode = (name) => {
  // Remove spaces, special characters, and convert to uppercase
  const cleanName = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 8);
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `TWBFL-${cleanName}${randomSuffix}`;
};

// Pre-save middleware to generate code
partnerSchema.pre('save', async function(next) {
  if (!this.code && this.name) {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const potentialCode = generatePartnerCode(this.name);
      
      // Check if code already exists
      const existingPartner = await this.constructor.findOne({ code: potentialCode });
      
      if (!existingPartner) {
        this.code = potentialCode;
        break;
      }
      
      attempts++;
    }
    
    if (!this.code) {
      return next(new Error('Unable to generate unique partner code'));
    }
  }
  next();
});

// Virtual for conversion rate
partnerSchema.virtual('conversionRate').get(function() {
  if (this.stats.totalLeads === 0) return 0;
  return ((this.stats.totalBookings / this.stats.totalLeads) * 100).toFixed(2);
});

// Instance method to update stats
partnerSchema.methods.updateStats = async function(type) {
  switch (type) {
    case 'lead':
      this.stats.totalLeads += 1;
      break;
    case 'tour':
      this.stats.totalTours += 1;
      break;
    case 'booking':
      this.stats.totalBookings += 1;
      break;
  }
  this.stats.lastActivityAt = new Date();
  await this.save();
};

// Static method to find active partners
partnerSchema.statics.findActive = function() {
  return this.find({ active: true }).sort({ 'stats.lastActivityAt': -1 });
};

// Static method to find by code (case insensitive)
partnerSchema.statics.findByCode = function(code) {
  return this.findOne({ 
    code: code.toUpperCase(), 
    active: true 
  });
};

const Partner = mongoose.model('Partner', partnerSchema);

export default Partner;
