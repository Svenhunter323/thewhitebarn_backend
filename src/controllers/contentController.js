import {
  ContactDetails,
  AboutDetails,
  HomeDetails,
  SocialLinks,
  PropertyDetails,
  Review
} from '../models/Content.js';

// @desc    Get contact details
// @route   GET /api/content/contact-details
// @access  Public
export const getContactDetails = async (req, res, next) => {
  try {
    const contactDetails = await ContactDetails.findOne().sort({ createdAt: -1 });
    
    if (!contactDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact details not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { contactDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get about details
// @route   GET /api/content/about-details
// @access  Public
export const getAboutDetails = async (req, res, next) => {
  try {
    const aboutDetails = await AboutDetails.findOne().sort({ createdAt: -1 });
    
    if (!aboutDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'About details not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { aboutDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get home details
// @route   GET /api/content/home-details
// @access  Public
export const getHomeDetails = async (req, res, next) => {
  try {
    const homeDetails = await HomeDetails.findOne().sort({ createdAt: -1 });
    
    if (!homeDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'Home details not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { homeDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get social links
// @route   GET /api/content/social-links
// @access  Public
export const getSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLinks.find({ isActive: true }).sort({ platform: 1 });

    res.status(200).json({
      status: 'success',
      data: { socialLinks }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get property details
// @route   GET /api/content/property-details
// @access  Public
export const getPropertyDetails = async (req, res, next) => {
  try {
    const propertyDetails = await PropertyDetails.findOne().sort({ createdAt: -1 });
    
    if (!propertyDetails) {
      return res.status(404).json({
        status: 'error',
        message: 'Property details not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { propertyDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews
// @route   GET /api/content/reviews
// @access  Public
export const getReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const featured = req.query.featured === 'true';
    const skip = (page - 1) * limit;

    // Build query
    const query = { isApproved: true };
    if (featured) {
      query.isFeatured = true;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-clientEmail'); // Exclude email for privacy

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

// @desc    Get single review
// @route   GET /api/content/reviews/:id
// @access  Public
export const getReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      isApproved: true
    }).select('-clientEmail');

    if (!review) {
      return res.status(404).json({
        status: 'error',
        message: 'Review not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update contact details (admin only)
// @route   POST /api/content/contact-details
// @access  Private
export const updateContactDetails = async (req, res, next) => {
  try {
    const contactDetails = await ContactDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { contactDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update about details (admin only)
// @route   POST /api/content/about-details
// @access  Private
export const updateAboutDetails = async (req, res, next) => {
  try {
    const aboutDetails = await AboutDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { aboutDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update home details (admin only)
// @route   POST /api/content/home-details
// @access  Private
export const updateHomeDetails = async (req, res, next) => {
  try {
    const homeDetails = await HomeDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { homeDetails }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update property details (admin only)
// @route   POST /api/content/property-details
// @access  Private
export const updatePropertyDetails = async (req, res, next) => {
  try {
    const propertyDetails = await PropertyDetails.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { propertyDetails }
    });
  } catch (error) {
    next(error);
  }
};
