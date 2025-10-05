import asyncHandler from 'express-async-handler';
import { Analytics, SiteStats } from '../models/Analytics.js';
import Contact from '../models/Contact.js';
import Review from '../models/Review.js';
import Gallery from '../models/Gallery.js';
import Admin from '../models/Admin.js';

// @desc    Get dashboard statistics
// @route   GET /api/admin/analytics/dashboard
// @access  Private/Admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  
  // Get basic counts
  const [
    totalContacts,
    totalReviews,
    totalGalleryImages,
    totalAdmins,
    recentContacts,
    recentReviews,
    approvedReviews,
    pendingReviews
  ] = await Promise.all([
    Contact.countDocuments(),
    Review.countDocuments(),
    Gallery.countDocuments({ isActive: true }),
    Admin.countDocuments({ isActive: true }),
    Contact.countDocuments({ createdAt: { $gte: startDate } }),
    Review.countDocuments({ createdAt: { $gte: startDate } }),
    Review.countDocuments({ status: 'approved' }),
    Review.countDocuments({ status: 'pending' })
  ]);
  
  // Get site stats from analytics
  const siteStats = await SiteStats.getDashboardStats(daysNum);
  
  // Get recent activity
  const recentActivity = await Analytics.find({
    createdAt: { $gte: startDate }
  })
  .sort({ createdAt: -1 })
  .limit(50)
  .select('type page createdAt metadata');
  
  // Calculate growth rates
  const previousPeriodStart = new Date(startDate);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - daysNum);
  
  const [
    previousContacts,
    previousReviews
  ] = await Promise.all([
    Contact.countDocuments({ 
      createdAt: { 
        $gte: previousPeriodStart, 
        $lt: startDate 
      } 
    }),
    Review.countDocuments({ 
      createdAt: { 
        $gte: previousPeriodStart, 
        $lt: startDate 
      } 
    })
  ]);
  
  const contactGrowth = previousContacts > 0 
    ? ((recentContacts - previousContacts) / previousContacts * 100).toFixed(1)
    : recentContacts > 0 ? 100 : 0;
    
  const reviewGrowth = previousReviews > 0 
    ? ((recentReviews - previousReviews) / previousReviews * 100).toFixed(1)
    : recentReviews > 0 ? 100 : 0;
  
  res.json({
    status: 'success',
    data: {
      overview: {
        totalContacts,
        totalReviews,
        totalGalleryImages,
        totalAdmins,
        recentContacts,
        recentReviews,
        approvedReviews,
        pendingReviews,
        contactGrowth: parseFloat(contactGrowth),
        reviewGrowth: parseFloat(reviewGrowth)
      },
      siteStats,
      recentActivity: recentActivity.slice(0, 10) // Limit to 10 most recent
    }
  });
});

// @desc    Get analytics time series data
// @route   GET /api/admin/analytics/timeseries
// @access  Private/Admin
export const getTimeSeriesData = asyncHandler(async (req, res) => {
  const { days = 30, type = 'all' } = req.query;
  const daysNum = parseInt(days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  
  let matchCondition = {
    createdAt: { $gte: startDate }
  };
  
  if (type !== 'all') {
    matchCondition.type = type;
  }
  
  const timeSeriesData = await Analytics.aggregate([
    {
      $match: matchCondition
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
        data: {
          $push: {
            type: '$_id.type',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  // Fill in missing dates with zero values
  const filledData = [];
  const currentDate = new Date(startDate);
  const endDate = new Date();
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const existingData = timeSeriesData.find(item => item._id === dateStr);
    
    if (existingData) {
      filledData.push({
        date: dateStr,
        ...existingData.data.reduce((acc, item) => {
          acc[item.type] = item.count;
          return acc;
        }, {}),
        total: existingData.totalCount
      });
    } else {
      filledData.push({
        date: dateStr,
        page_view: 0,
        contact_form: 0,
        gallery_view: 0,
        review_submission: 0,
        admin_login: 0,
        total: 0
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  res.json({
    status: 'success',
    data: {
      timeSeries: filledData,
      period: {
        days: daysNum,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    }
  });
});

// @desc    Get page analytics
// @route   GET /api/admin/analytics/pages
// @access  Private/Admin
export const getPageAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  
  const pageStats = await Analytics.aggregate([
    {
      $match: {
        type: 'page_view',
        createdAt: { $gte: startDate },
        page: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$page',
        views: { $sum: 1 },
        uniqueVisitors: { $addToSet: '$ipAddress' }
      }
    },
    {
      $project: {
        page: '$_id',
        views: 1,
        uniqueVisitors: { $size: '$uniqueVisitors' },
        _id: 0
      }
    },
    {
      $sort: { views: -1 }
    }
  ]);
  
  // Calculate total views for percentage calculation
  const totalViews = pageStats.reduce((sum, page) => sum + page.views, 0);
  
  const pagesWithPercentage = pageStats.map(page => ({
    ...page,
    percentage: totalViews > 0 ? ((page.views / totalViews) * 100).toFixed(1) : 0
  }));
  
  res.json({
    status: 'success',
    data: {
      pages: pagesWithPercentage,
      totalViews,
      period: {
        days: daysNum,
        startDate: startDate.toISOString()
      }
    }
  });
});

// @desc    Get device and browser analytics
// @route   GET /api/admin/analytics/devices
// @access  Private/Admin
export const getDeviceAnalytics = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const daysNum = parseInt(days);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);
  
  const deviceStats = await Analytics.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        userAgent: { $exists: true, $ne: null }
      }
    },
    {
      $project: {
        userAgent: 1,
        deviceType: {
          $cond: {
            if: { $regexMatch: { input: '$userAgent', regex: /Mobile|Android|iPhone/i } },
            then: 'mobile',
            else: {
              $cond: {
                if: { $regexMatch: { input: '$userAgent', regex: /iPad|Tablet/i } },
                then: 'tablet',
                else: 'desktop'
              }
            }
          }
        },
        browser: {
          $cond: {
            if: { $regexMatch: { input: '$userAgent', regex: /Chrome/i } },
            then: 'chrome',
            else: {
              $cond: {
                if: { $regexMatch: { input: '$userAgent', regex: /Firefox/i } },
                then: 'firefox',
                else: {
                  $cond: {
                    if: { $regexMatch: { input: '$userAgent', regex: /Safari/i } },
                    then: 'safari',
                    else: {
                      $cond: {
                        if: { $regexMatch: { input: '$userAgent', regex: /Edge/i } },
                        then: 'edge',
                        else: 'other'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        deviceBreakdown: {
          $push: '$deviceType'
        },
        browserBreakdown: {
          $push: '$browser'
        }
      }
    }
  ]);
  
  if (deviceStats.length === 0) {
    return res.json({
      status: 'success',
      data: {
        devices: [],
        browsers: [],
        period: {
          days: daysNum,
          startDate: startDate.toISOString()
        }
      }
    });
  }
  
  const data = deviceStats[0];
  
  // Count device types
  const deviceCounts = data.deviceBreakdown.reduce((acc, device) => {
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {});
  
  // Count browsers
  const browserCounts = data.browserBreakdown.reduce((acc, browser) => {
    acc[browser] = (acc[browser] || 0) + 1;
    return acc;
  }, {});
  
  const totalDevices = data.deviceBreakdown.length;
  const totalBrowsers = data.browserBreakdown.length;
  
  const devices = Object.entries(deviceCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: count,
    percentage: ((count / totalDevices) * 100).toFixed(1)
  }));
  
  const browsers = Object.entries(browserCounts).map(([name, count]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: count,
    percentage: ((count / totalBrowsers) * 100).toFixed(1)
  }));
  
  res.json({
    status: 'success',
    data: {
      devices,
      browsers,
      period: {
        days: daysNum,
        startDate: startDate.toISOString()
      }
    }
  });
});

// @desc    Track page view
// @route   POST /api/analytics/track
// @access  Public
export const trackPageView = asyncHandler(async (req, res) => {
  const { page, referrer, sessionId } = req.body;
  
  await Analytics.trackPageView({
    page,
    referrer,
    sessionId,
    userAgent: req.get('User-Agent'),
    ipAddress: req.ip
  });
  
  res.json({
    status: 'success',
    message: 'Page view tracked'
  });
});

// @desc    Get real-time statistics
// @route   GET /api/admin/analytics/realtime
// @access  Private/Admin
export const getRealTimeStats = asyncHandler(async (req, res) => {
  const lastHour = new Date();
  lastHour.setHours(lastHour.getHours() - 1);
  
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);
  
  const [
    lastHourActivity,
    last24HourActivity,
    activePages
  ] = await Promise.all([
    Analytics.countDocuments({ createdAt: { $gte: lastHour } }),
    Analytics.countDocuments({ createdAt: { $gte: last24Hours } }),
    Analytics.aggregate([
      {
        $match: {
          type: 'page_view',
          createdAt: { $gte: lastHour }
        }
      },
      {
        $group: {
          _id: '$page',
          views: { $sum: 1 }
        }
      },
      {
        $sort: { views: -1 }
      },
      {
        $limit: 5
      }
    ])
  ]);
  
  res.json({
    status: 'success',
    data: {
      lastHourActivity,
      last24HourActivity,
      activePages: activePages.map(page => ({
        page: page._id || 'Unknown',
        views: page.views
      })),
      timestamp: new Date().toISOString()
    }
  });
});

// @desc    Export analytics data
// @route   GET /api/admin/analytics/export
// @access  Private/Admin
export const exportAnalytics = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = 'json' } = req.query;
  
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  
  const analyticsData = await Analytics.find({
    createdAt: { $gte: start, $lte: end }
  })
  .sort({ createdAt: -1 })
  .lean();
  
  if (format === 'csv') {
    // Convert to CSV format
    const csvHeader = 'Date,Type,Page,IP Address,User Agent\n';
    const csvData = analyticsData.map(item => 
      `${item.createdAt.toISOString()},${item.type},${item.page || ''},${item.ipAddress || ''},${item.userAgent || ''}`
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
    res.send(csvHeader + csvData);
  } else {
    res.json({
      status: 'success',
      data: {
        analytics: analyticsData,
        period: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          totalRecords: analyticsData.length
        }
      }
    });
  }
});
