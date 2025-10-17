import { body, validationResult } from 'express-validator';
import Contact from '../models/Contact.js';
import Partner from '../models/Partner.js';
import { sendContactEmail, sendAutoReplyEmail } from '../utils/email.js';

// Validation rules for contact form
export const validateContactForm = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  // Optional referral tracking fields
  body('eventType')
    .optional()
    .isIn(['wedding', 'corporate', 'shower', 'family', 'other'])
    .withMessage('Invalid event type'),
  
  body('refCode')
    .optional()
    .trim()
    .matches(/^TWBFL-[A-Z0-9]{4,10}$/)
    .withMessage('Invalid referral code format'),
  
  body('utmSource')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM source too long'),
  
  body('utmMedium')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM medium too long'),
  
  body('utmCampaign')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('UTM campaign too long')
];

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      name, 
      email, 
      phone, 
      address, 
      message,
      eventType,
      eventDate,
      guestCount,
      budget,
      refCode,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm
    } = req.body;

    // Determine referral source if refCode is provided
    let refSource = null;
    if (refCode) {
      try {
        const partner = await Partner.findByCode(refCode);
        if (partner) {
          refSource = partner.type;
          // Update partner stats
          await partner.updateStats('lead');
        }
      } catch (error) {
        console.error('Error looking up partner:', error);
        // Continue with contact creation even if partner lookup fails
      }
    }

    // Create contact record with referral tracking
    const contactData = {
      name,
      email,
      phone,
      address,
      message,
      eventType: eventType || 'other',
      eventDate: eventDate ? new Date(eventDate) : null,
      guestCount: guestCount ? parseInt(guestCount) : null,
      budget: budget || 'not-specified',
      // Referral tracking fields
      refSource,
      refCode: refCode ? refCode.toUpperCase() : null,
      utm: {
        source: utmSource || null,
        medium: utmMedium || null,
        campaign: utmCampaign || null,
        content: utmContent || null,
        term: utmTerm || null
      },
      // Technical fields
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    const contact = await Contact.create(contactData);

    // Send emails (don't wait for them to complete)
    Promise.all([
      sendContactEmail(contactData),
      sendAutoReplyEmail(contactData)
    ]).catch(error => {
      console.error('Email sending failed:', error);
      // Log the error but don't fail the request
    });

    res.status(201).json({
      status: 'success',
      message: 'Thank you for your message! We will get back to you soon.',
      data: {
        id: contact._id,
        submittedAt: contact.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all contact submissions (admin only)
// @route   GET /api/contact
// @access  Private
export const getContactSubmissions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-ipAddress -userAgent'); // Exclude sensitive fields

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        contacts,
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

// @desc    Get single contact submission (admin only)
// @route   GET /api/contact/:id
// @access  Private
export const getContactSubmission = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found'
      });
    }

    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.status(200).json({
      status: 'success',
      data: { contact }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update contact submission status (admin only)
// @route   PUT /api/contact/:id
// @access  Private
export const updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    if (!['new', 'read', 'replied', 'archived'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: { contact }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete contact submission (admin only)
// @route   DELETE /api/contact/:id
// @access  Private
export const deleteContactSubmission = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact submission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get contacts by partner code (admin only)
// @route   GET /api/admin/contacts/by-partner
// @access  Private
export const getContactsByPartner = async (req, res, next) => {
  try {
    const { code } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!code) {
      return res.status(400).json({
        status: 'error',
        message: 'Partner code is required'
      });
    }

    // Verify partner exists
    const partner = await Partner.findByCode(code);
    if (!partner) {
      return res.status(404).json({
        status: 'error',
        message: 'Partner not found'
      });
    }

    // Build query for contacts with this referral code
    const query = { refCode: code.toUpperCase() };

    // Get contacts with pagination
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-ipAddress -userAgent'); // Exclude sensitive fields

    const total = await Contact.countDocuments(query);

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

// @desc    Update contact tour/booking status (admin only)
// @route   PUT /api/contact/:id/status
// @access  Private
export const updateContactLeadStatus = async (req, res, next) => {
  try {
    const { tourScheduled, tourDate, booked, bookingDate, bookingAmount } = req.body;
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact submission not found'
      });
    }

    // Update tour status
    if (tourScheduled !== undefined) {
      contact.tourScheduled = tourScheduled;
      if (tourDate) {
        contact.tourDate = new Date(tourDate);
      }
      
      // Update partner stats if this is a new tour
      if (tourScheduled && !contact.tourScheduled && contact.refCode) {
        try {
          const partner = await Partner.findByCode(contact.refCode);
          if (partner) {
            await partner.updateStats('tour');
          }
        } catch (error) {
          console.error('Error updating partner tour stats:', error);
        }
      }
    }

    // Update booking status
    if (booked !== undefined) {
      contact.booked = booked;
      if (bookingDate) {
        contact.bookingDate = new Date(bookingDate);
      }
      if (bookingAmount) {
        contact.bookingAmount = parseFloat(bookingAmount);
      }
      
      // Update partner stats if this is a new booking
      if (booked && !contact.booked && contact.refCode) {
        try {
          const partner = await Partner.findByCode(contact.refCode);
          if (partner) {
            await partner.updateStats('booking');
          }
        } catch (error) {
          console.error('Error updating partner booking stats:', error);
        }
      }
    }

    await contact.save();

    res.status(200).json({
      status: 'success',
      data: { contact }
    });
  } catch (error) {
    next(error);
  }
};
