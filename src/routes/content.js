import express from 'express';
import { body } from 'express-validator';
import {
  getContactDetails,
  getAboutDetails,
  getHomeDetails,
  getSocialLinks,
  getPropertyDetails,
  updateContactDetails,
  updateAboutDetails,
  updateHomeDetails,
  updatePropertyDetails
} from '../controllers/contentController.js';
import {
  ContactDetails,
  AboutDetails,
  HomeDetails,
  SocialLinks,
  PropertyDetails
} from '../models/Content.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/contact-details', getContactDetails);
router.get('/about-details', getAboutDetails);
router.get('/home-details', getHomeDetails);
router.get('/social-links', getSocialLinks);
router.get('/property-details', getPropertyDetails);

// @desc    Get all content for admin dashboard
// @route   GET /api/content/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    // Fetch all content (get latest records)
    const [contactDetails, aboutDetails, homeDetails, socialLinks, propertyDetails] = await Promise.all([
      ContactDetails.findOne().sort({ createdAt: -1 }),
      AboutDetails.findOne().sort({ createdAt: -1 }),
      HomeDetails.findOne().sort({ createdAt: -1 }),
      SocialLinks.find({ isActive: true }).sort({ createdAt: -1 }),
      PropertyDetails.findOne().sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        content: {
          contactDetails: contactDetails || {
            phone: '',
            email: 'info@thewhitebarnfl.com',
            address: '',
            hours: '',
            emergencyContact: ''
          },
          aboutDetails: aboutDetails || {
            title: 'About The White Barn FL',
            subtitle: '',
            description: '',
            mission: '',
            vision: '',
            teamMembers: []
          },
          homeDetails: homeDetails || {
            heroTitle: 'Welcome to The White Barn FL',
            heroSubtitle: '',
            heroDescription: '',
            aboutSection: { title: '', subtitle: '', description: '' },
            servicesSection: { title: '', subtitle: '', description: '' }
          },
          socialLinks: socialLinks || [],
          propertyDetails: propertyDetails || {
            name: 'The White Barn FL',
            description: '',
            capacity: { seated: 0, standing: 0 },
            amenities: [],
            pricing: { basePrice: 0, currency: 'USD', pricingNotes: '' },
            location: { address: '', city: '', state: '', zipCode: '', coordinates: {} },
            images: []
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all content:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch content'
    });
  }
});

// Protected Admin routes for updates
router.use(protect);
router.use(adminOnly);

// Content Management
router.post(
  '/contact-details',
  [
    body('phone').optional().isString(),
    body('email').optional().isEmail(),
    body('address').optional().isString(),
    body('mapEmbed').optional().isString()
  ],
  updateContactDetails
);

router.post(
  '/about-details',
  [
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('image').optional().isString(),
    body('videoUrl').optional().isString()
  ],
  updateAboutDetails
);

router.post(
  '/home-details',
  [
    body('welcomeTitle').optional().isString(),
    body('welcomeDescription').optional().isString(),
    body('featuredImage').optional().isString(),
    body('ctaButtonText').optional().isString(),
    body('ctaButtonLink').optional().isString()
  ],
  updateHomeDetails
);

router.post(
  '/property-details',
  [
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('capacity').optional().isNumeric(),
    body('amenities').optional().isArray(),
    body('pricing').optional().isObject()
  ],
  updatePropertyDetails
);

export default router;
