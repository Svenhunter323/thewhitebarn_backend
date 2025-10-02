import { body, validationResult } from 'express-validator';
import Admin from '../models/Admin.js';
import Contact from '../models/Contact.js';
import Gallery from '../models/Gallery.js';
import {
  ContactDetails,
  AboutDetails,
  HomeDetails,
  SocialLinks,
  PropertyDetails,
  Review
} from '../models/Content.js';

// Dashboard Statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalContacts,
      newContacts,
      totalReviews,
      approvedReviews,
      totalGalleryImages,
      activeGalleryImages,
      totalAdmins
    ] = await Promise.all([
      Contact.countDocuments(),
      Contact.countDocuments({ status: 'new' }),
      Review.countDocuments(),
      Review.countDocuments({ isApproved: true }),
      Gallery.countDocuments(),
      Gallery.countDocuments({ isActive: true }),
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
          gallery: {
            total: totalGalleryImages,
            active: activeGalleryImages
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

// Content Management
export const updateContactDetails = async (req, res, next) => {
  try {
    const contactDetails = await ContactDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Contact details updated successfully',
      data: { contactDetails }
    });
  } catch (error) {
    next(error);
  }
};

export const updateAboutDetails = async (req, res, next) => {
  try {
    const aboutDetails = await AboutDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'About details updated successfully',
      data: { aboutDetails }
    });
  } catch (error) {
    next(error);
  }
};

export const updateHomeDetails = async (req, res, next) => {
  try {
    const homeDetails = await HomeDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Home details updated successfully',
      data: { homeDetails }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePropertyDetails = async (req, res, next) => {
  try {
    const propertyDetails = await PropertyDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Property details updated successfully',
      data: { propertyDetails }
    });
  } catch (error) {
    next(error);
  }
};

// Social Links Management
export const updateSocialLinks = async (req, res, next) => {
  try {
    const { socialLinks } = req.body;

    // Delete existing social links
    await SocialLinks.deleteMany({});

    // Create new social links
    const createdLinks = await SocialLinks.create(socialLinks);

    res.status(200).json({
      status: 'success',
      message: 'Social links updated successfully',
      data: { socialLinks: createdLinks }
    });
  } catch (error) {
    next(error);
  }
};

// Review Management
export const getAllReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // 'approved', 'pending', 'all'
    const skip = (page - 1) * limit;

    let query = {};
    if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'pending') {
      query.isApproved = false;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        reviews,
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

export const updateReviewStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isApproved, isFeatured } = req.body;

    const review = await Review.findByIdAndUpdate(
      id,
      { 
        ...(typeof isApproved !== 'undefined' && { isApproved }),
        ...(typeof isFeatured !== 'undefined' && { isFeatured })
      },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Review updated successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Gallery Management
export const getAllGalleryImages = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const updateGalleryImage = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const deleteGalleryImage = async (req, res, next) => {
  try {
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
  } catch (error) {
    next(error);
  }
};

export const updateGalleryOrder = async (req, res, next) => {
  try {
    const { imageOrders } = req.body; // Array of { id, order }

    const updatePromises = imageOrders.map(({ id, order }) =>
      Gallery.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      status: 'success',
      message: 'Gallery order updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
