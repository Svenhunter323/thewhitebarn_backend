import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Contact from '../models/Contact.js';
import Review from '../models/Review.js';
import { SocialLinks } from '../models/Content.js';

// Dashboard Statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalContacts,
      newContacts,
      totalReviews,
      approvedReviews,
      totalAdmins
    ] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
      Review.countDocuments(),
      Review.countDocuments({ isApproved: true }),
      Admin.countDocuments({ isActive: true })
    ]);

    // Recent contacts (last 7 days)
    const recentContacts = await Contact.find({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(5);

    // Recent reviews
    const recentReviews = await Review.find({ isApproved: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('clientName rating title createdAt');

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          contacts: {
            total: totalContacts,
            new: newContacts
          },
          reviews: {
            total: totalReviews,
            approved: approvedReviews
          },
          admins: totalAdmins
        },
        recentActivity: {
          contacts: recentContacts,
          reviews: recentReviews
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Admin Management
export const getAllAdmins = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const admins = await Admin.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');

    const total = await Admin.countDocuments();

    res.status(200).json({
      status: 'success',
      data: {
        admins,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Prevent deactivating self
    if (id === req.admin.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot deactivate your own account'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { admin }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.admin.id.toString()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findByIdAndDelete(id);

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Social Links Management
export const updateSocialLinks = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { facebook, instagram, twitter, pinterest, youtube } = req.body;
    
    // Update or create social media links
    const updates = {};
    const socialPlatforms = ['facebook', 'instagram', 'twitter', 'pinterest', 'youtube'];
    
    // Update existing social links
    for (const platform of socialPlatforms) {
      if (req.body[platform]) {
        await SocialLinks.findOneAndUpdate(
          { platform },
          { 
            platform,
            url: req.body[platform],
            isActive: true
          },
          { upsert: true, new: true }
        );
      }
    }
    
    // Get all active social links
    const socialLinks = await SocialLinks.find({ isActive: true });

    res.status(200).json({
      status: 'success',
      data: socialLinks
    });
  } catch (error) {
    next(error);
  }
};

// NOTE: Review management functions have been moved to reviewController.js
// Gallery management functions have been moved to galleryController.js
// This controller now only handles admin-specific operations
