import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  // Event type information
  eventType: {
    type: String,
    enum: ['wedding', 'corporate', 'shower', 'family', 'other'],
    default: 'other'
  },
  eventDate: {
    type: Date
  },
  guestCount: {
    type: Number,
    min: [1, 'Guest count must be at least 1']
  },
  budget: {
    type: String,
    enum: ['under-5k', '5k-10k', '10k-15k', '15k-25k', '25k-plus', 'not-specified'],
    default: 'not-specified'
  },
  // Referral tracking fields (non-breaking additions)
  refSource: {
    type: String,
    enum: ['affiliate', 'influencer', 'vendor', null],
    default: null
  },
  refCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null,
    validate: {
      validator: function(v) {
        return !v || /^TWBFL-[A-Z0-9]{4,10}$/.test(v);
      },
      message: 'Invalid referral code format'
    }
  },
  // UTM parameter tracking
  utm: {
    source: { type: String, trim: true },
    medium: { type: String, trim: true },
    campaign: { type: String, trim: true },
    content: { type: String, trim: true },
    term: { type: String, trim: true }
  },
  // Lead quality and follow-up tracking
  leadScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  tourScheduled: {
    type: Boolean,
    default: false
  },
  tourDate: {
    type: Date
  },
  booked: {
    type: Boolean,
    default: false
  },
  bookingDate: {
    type: Date
  },
  bookingAmount: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ email: 1 });
// New indexes for referral tracking
contactSchema.index({ refCode: 1 });
contactSchema.index({ refSource: 1, refCode: 1 });
contactSchema.index({ 'utm.source': 1, 'utm.campaign': 1 });
contactSchema.index({ eventType: 1, createdAt: -1 });
contactSchema.index({ tourScheduled: 1, booked: 1 });

export default mongoose.model('Contact', contactSchema);
