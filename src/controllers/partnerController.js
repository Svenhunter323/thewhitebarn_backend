import Partner from '../models/Partner.js';
import Contact from '../models/Contact.js';
import QRCode from 'qrcode';

// @desc    Get partner by code (public endpoint)
// @route   GET /api/partners/lookup/:code
// @access  Public
export const lookupPartner = async (req, res) => {
  try {
    const { code } = req.params;
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Partner code is required'
      });
    }

    const partner = await Partner.findByCode(code);
    
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found or inactive'
      });
    }
    
    // Return minimal partner info for public use
    const partnerInfo = {
      code: partner.code,
      name: partner.name,
      type: partner.type
    };
    
    res.status(200).json({
      status: 'success',
      data: { partner: partnerInfo }
    });
  } catch (error) {
    console.error('Partner lookup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during partner lookup'
    });
  }
};

// @desc    Generate QR code for partner
// @route   GET /api/partners/qr/:code
// @access  Public
export const generatePartnerQR = async (req, res) => {
  try {
    const { code } = req.params;
    const { page = 'weddings' } = req.query;
    
    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Partner code is required'
      });
    }

    // Verify partner exists and is active
    const partner = await Partner.findByCode(code);
    
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found or inactive'
      });
    }
    
    // Generate referral URL with UTM parameters
    const baseUrl = process.env.FRONTEND_URL || 'https://thewhitebarnfl.com';
    const referralUrl = `${baseUrl}/${page}?ref=${code.toUpperCase()}&utm_source=affiliate&utm_medium=qr&utm_campaign=${partner.type}-${code.toLowerCase()}`;
    
    // Generate QR code
    const qrBuffer = await QRCode.toBuffer(referralUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.set({
      'Content-Type': 'image/png',
      'Content-Length': qrBuffer.length,
      'Cache-Control': 'public, max-age=86400', // 24 hour cache
      'Content-Disposition': `inline; filename="partner-qr-${code}.png"`
    });
    
    res.send(qrBuffer);
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate QR code'
    });
  }
};

// @desc    Create new partner
// @route   POST /api/partners
// @access  Private/Admin
export const createPartner = async (req, res) => {
  try {
    const { name, type, email, social, phone, notes } = req.body;
    
    // Validate required fields
    if (!name || !type || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, type, and email are required'
      });
    }

    // Check if partner with email already exists
    const existingPartner = await Partner.findOne({ email: email.toLowerCase() });
    if (existingPartner) {
      return res.status(400).json({
        status: 'error',
        message: 'Partner with this email already exists'
      });
    }

    const partner = await Partner.create({
      name: name.trim(),
      type,
      email: email.toLowerCase().trim(),
      social: social || {},
      phone: phone?.trim(),
      notes: notes?.trim()
    });
    
    res.status(201).json({
      status: 'success',
      data: { partner }
    });
  } catch (error) {
    console.error('Create partner error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Partner with this email or code already exists'
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create partner'
    });
  }
};

// @desc    Get all partners
// @route   GET /api/partners
// @access  Private/Admin
export const getPartners = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      type, 
      active, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (active !== undefined) {
      filter.active = active === 'true';
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const [partners, total] = await Promise.all([
      Partner.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Partner.countDocuments(filter)
    ]);

    // Add lead counts for each partner
    const partnersWithStats = await Promise.all(
      partners.map(async (partner) => {
        const leadCount = await Contact.countDocuments({ refCode: partner.code });
        const tourCount = await Contact.countDocuments({ 
          refCode: partner.code, 
          tourScheduled: true 
        });
        const bookingCount = await Contact.countDocuments({ 
          refCode: partner.code, 
          booked: true 
        });
        
        return {
          ...partner,
          leadCount,
          tourCount,
          bookingCount,
          conversionRate: leadCount > 0 ? ((bookingCount / leadCount) * 100).toFixed(2) : 0
        };
      })
    );

    res.status(200).json({
      status: 'success',
      data: {
        partners: partnersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get partners error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch partners'
    });
  }
};

// @desc    Get single partner
// @route   GET /api/partners/:id
// @access  Private/Admin
export const getPartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    // Get partner performance stats
    const [leadCount, tourCount, bookingCount, recentLeads] = await Promise.all([
      Contact.countDocuments({ refCode: partner.code }),
      Contact.countDocuments({ refCode: partner.code, tourScheduled: true }),
      Contact.countDocuments({ refCode: partner.code, booked: true }),
      Contact.find({ refCode: partner.code })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email eventType createdAt tourScheduled booked')
    ]);

    const partnerWithStats = {
      ...partner.toObject(),
      leadCount,
      tourCount,
      bookingCount,
      recentLeads,
      conversionRate: leadCount > 0 ? ((bookingCount / leadCount) * 100).toFixed(2) : 0
    };
    
    res.status(200).json({
      status: 'success',
      data: { partner: partnerWithStats }
    });
  } catch (error) {
    console.error('Get partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch partner'
    });
  }
};

// @desc    Update partner
// @route   PUT /api/partners/:id
// @access  Private/Admin
export const updatePartner = async (req, res) => {
  try {
    const { name, type, email, social, phone, notes, active } = req.body;
    
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    // Check if email is being changed and if new email exists
    if (email && email.toLowerCase() !== partner.email) {
      const existingPartner = await Partner.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: partner._id }
      });
      
      if (existingPartner) {
        return res.status(400).json({
          status: 'error',
          message: 'Partner with this email already exists'
        });
      }
    }

    // Update fields
    if (name) partner.name = name.trim();
    if (type) partner.type = type;
    if (email) partner.email = email.toLowerCase().trim();
    if (social) partner.social = { ...partner.social, ...social };
    if (phone !== undefined) partner.phone = phone?.trim();
    if (notes !== undefined) partner.notes = notes?.trim();
    if (active !== undefined) partner.active = active;

    await partner.save();
    
    res.status(200).json({
      status: 'success',
      data: { partner }
    });
  } catch (error) {
    console.error('Update partner error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update partner'
    });
  }
};

// @desc    Delete/Deactivate partner
// @route   DELETE /api/partners/:id
// @access  Private/Admin
export const deletePartner = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    // Soft delete by deactivating instead of removing
    partner.active = false;
    await partner.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Partner deactivated successfully'
    });
  } catch (error) {
    console.error('Delete partner error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to deactivate partner'
    });
  }
};

// @desc    Get contacts by partner
// @route   GET /api/partners/:code/contacts
// @access  Private/Admin
export const getPartnerContacts = async (req, res) => {
  try {
    const { code } = req.params;
    const { 
      page = 1, 
      limit = 20,
      status,
      eventType,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify partner exists
    const partner = await Partner.findByCode(code);
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    // Build filter
    const filter = { refCode: code.toUpperCase() };
    
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Contact.countDocuments(filter)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        partner: {
          code: partner.code,
          name: partner.name,
          type: partner.type
        },
        contacts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get partner contacts error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch partner contacts'
    });
  }
};

// @desc    Get partner performance analytics
// @route   GET /api/partners/analytics
// @access  Private/Admin
export const getPartnerAnalytics = async (req, res) => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      partnerType,
      groupBy = 'month' 
    } = req.query;

    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.$lte = new Date(dateTo);
    }

    // Build aggregation pipeline
    const matchStage = {
      refCode: { $exists: true, $ne: null }
    };
    
    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'partners',
          localField: 'refCode',
          foreignField: 'code',
          as: 'partner'
        }
      },
      { $unwind: '$partner' }
    ];

    // Add partner type filter if specified
    if (partnerType) {
      pipeline.push({
        $match: { 'partner.type': partnerType }
      });
    }

    // Group by time period and partner
    const groupByStage = {
      _id: {
        partnerCode: '$refCode',
        partnerName: '$partner.name',
        partnerType: '$partner.type'
      },
      totalLeads: { $sum: 1 },
      totalTours: { 
        $sum: { $cond: [{ $eq: ['$tourScheduled', true] }, 1, 0] }
      },
      totalBookings: { 
        $sum: { $cond: [{ $eq: ['$booked', true] }, 1, 0] }
      },
      totalRevenue: { 
        $sum: { $ifNull: ['$bookingAmount', 0] }
      }
    };

    if (groupBy === 'month') {
      groupByStage._id.year = { $year: '$createdAt' };
      groupByStage._id.month = { $month: '$createdAt' };
    } else if (groupBy === 'week') {
      groupByStage._id.year = { $year: '$createdAt' };
      groupByStage._id.week = { $week: '$createdAt' };
    }

    pipeline.push(
      { $group: groupByStage },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalLeads', 0] },
              { $multiply: [{ $divide: ['$totalBookings', '$totalLeads'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.week': -1 } }
    );

    const analytics = await Contact.aggregate(pipeline);

    // Get overall summary
    const summary = await Contact.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          totalTours: { 
            $sum: { $cond: [{ $eq: ['$tourScheduled', true] }, 1, 0] }
          },
          totalBookings: { 
            $sum: { $cond: [{ $eq: ['$booked', true] }, 1, 0] }
          },
          totalRevenue: { 
            $sum: { $ifNull: ['$bookingAmount', 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        analytics,
        summary: summary[0] || {
          totalLeads: 0,
          totalTours: 0,
          totalBookings: 0,
          totalRevenue: 0
        }
      }
    });
  } catch (error) {
    console.error('Get partner analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch partner analytics'
    });
  }
};
