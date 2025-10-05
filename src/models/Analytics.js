import mongoose from 'mongoose';

// Analytics Schema for tracking website statistics
const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  type: {
    type: String,
    required: true,
    enum: ['page_view', 'contact_form', 'gallery_view', 'review_submission', 'admin_login'],
    index: true
  },
  page: {
    type: String,
    trim: true,
    index: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true,
    index: true
  },
  referrer: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Site Statistics Schema for aggregated data
const siteStatsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
    index: true
  },
  visitors: {
    unique: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  pageViews: {
    total: { type: Number, default: 0 },
    byPage: {
      home: { type: Number, default: 0 },
      about: { type: Number, default: 0 },
      gallery: { type: Number, default: 0 },
      videos: { type: Number, default: 0 },
      contact: { type: Number, default: 0 },
      licenses: { type: Number, default: 0 },
      associations: { type: Number, default: 0 }
    }
  },
  contactForms: { type: Number, default: 0 },
  galleryViews: { type: Number, default: 0 },
  reviews: { type: Number, default: 0 },
  devices: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  browsers: {
    chrome: { type: Number, default: 0 },
    firefox: { type: Number, default: 0 },
    safari: { type: Number, default: 0 },
    edge: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  topReferrers: [{
    domain: String,
    count: Number
  }]
}, {
  timestamps: true
});

// Static methods for Analytics
analyticsSchema.statics.trackPageView = async function(data) {
  return this.create({
    type: 'page_view',
    page: data.page,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    referrer: data.referrer,
    sessionId: data.sessionId
  });
};

analyticsSchema.statics.trackContactForm = async function(data) {
  return this.create({
    type: 'contact_form',
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    sessionId: data.sessionId,
    metadata: {
      formData: data.formData
    }
  });
};

analyticsSchema.statics.getRecentStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        stats: {
          $push: {
            type: '$_id.type',
            count: '$count'
          }
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Static methods for SiteStats
siteStatsSchema.statics.getDashboardStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalVisitors: { $sum: '$visitors.total' },
        uniqueVisitors: { $sum: '$visitors.unique' },
        totalPageViews: { $sum: '$pageViews.total' },
        totalContactForms: { $sum: '$contactForms' },
        totalGalleryViews: { $sum: '$galleryViews' },
        totalReviews: { $sum: '$reviews' },
        avgPageViews: { $avg: '$pageViews.total' },
        deviceBreakdown: {
          desktop: { $sum: '$devices.desktop' },
          mobile: { $sum: '$devices.mobile' },
          tablet: { $sum: '$devices.tablet' }
        }
      }
    }
  ]);

  return stats[0] || {
    totalVisitors: 0,
    uniqueVisitors: 0,
    totalPageViews: 0,
    totalContactForms: 0,
    totalGalleryViews: 0,
    totalReviews: 0,
    avgPageViews: 0,
    deviceBreakdown: {
      desktop: 0,
      mobile: 0,
      tablet: 0
    }
  };
};

siteStatsSchema.statics.getTimeSeriesData = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.find({
    date: { $gte: startDate }
  })
  .sort({ date: 1 })
  .select('date visitors pageViews contactForms galleryViews')
  .lean();
};

siteStatsSchema.statics.updateDailyStats = async function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get analytics data for the day
  const Analytics = mongoose.model('Analytics');
  const dailyData = await Analytics.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      }
    },
    {
      $group: {
        _id: {
          type: '$type',
          page: '$page',
          ip: '$ipAddress'
        },
        count: { $sum: 1 }
      }
    }
  ]);

  // Process the data and update stats
  const statsUpdate = {
    date: startOfDay,
    visitors: { unique: 0, total: 0 },
    pageViews: { total: 0, byPage: {} },
    contactForms: 0,
    galleryViews: 0,
    reviews: 0
  };

  // Calculate stats from daily data
  const uniqueIPs = new Set();
  dailyData.forEach(item => {
    if (item._id.ip) uniqueIPs.add(item._id.ip);
    
    switch (item._id.type) {
      case 'page_view':
        statsUpdate.pageViews.total += item.count;
        if (item._id.page) {
          const pageName = item._id.page.replace('/', '') || 'home';
          statsUpdate.pageViews.byPage[pageName] = 
            (statsUpdate.pageViews.byPage[pageName] || 0) + item.count;
        }
        break;
      case 'contact_form':
        statsUpdate.contactForms += item.count;
        break;
      case 'gallery_view':
        statsUpdate.galleryViews += item.count;
        break;
      case 'review_submission':
        statsUpdate.reviews += item.count;
        break;
    }
  });

  statsUpdate.visitors.unique = uniqueIPs.size;
  statsUpdate.visitors.total = dailyData.length;

  return this.findOneAndUpdate(
    { date: startOfDay },
    statsUpdate,
    { upsert: true, new: true }
  );
};

// Indexes for efficient querying
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ type: 1, createdAt: -1 });
analyticsSchema.index({ page: 1, createdAt: -1 });
analyticsSchema.index({ sessionId: 1 });

siteStatsSchema.index({ date: -1 });

export const Analytics = mongoose.models.Analytics || mongoose.model('Analytics', analyticsSchema);
export default Analytics;
export const SiteStats = mongoose.models.SiteStats || mongoose.model('SiteStats', siteStatsSchema);
