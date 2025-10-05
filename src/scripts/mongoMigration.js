import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import models
import Admin from '../models/Admin.js';
import Contact from '../models/Contact.js';
import Gallery from '../models/Gallery.js';
import Review from '../models/Review.js';
import Settings, { defaultSettings } from '../models/Settings.js';
import { 
  ContactDetails, 
  AboutDetails, 
  HomeDetails, 
  SocialLinks, 
  PropertyDetails 
} from '../models/Content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration data based on MySQL backup analysis
const migrationData = {
  // Admin user (from admin_details table)
  admin: {
    email: 'info@thewhitebarnfl.com',
    password: 'admin123', // Will be hashed
    name: 'Administrator',
    role: 'super_admin',
    isActive: true
  },

  // Contact details (from contact_details table)
  contactDetails: {
    phone: '(954) 123-4567',
    email: 'info@thewhitebarnfl.com',
    address: '4680 SW 148th Ave, Fort Lauderdale, FL 33330',
    hours: 'Monday - Friday: 9:00 AM - 6:00 PM\nSaturday - Sunday: 10:00 AM - 4:00 PM',
    emergencyContact: '(954) 123-4567'
  },

  // About details (from about_details table)
  aboutDetails: {
    title: 'About The White Barn FL',
    subtitle: 'Your Dream Wedding Venue in Fort Lauderdale',
    description: `The White Barn FL is a premier wedding and event venue located in the heart of Fort Lauderdale, Florida. 
    Our stunning rustic-elegant barn provides the perfect backdrop for your special day, combining natural beauty with 
    modern amenities to create unforgettable memories.`,
    mission: `To provide couples with an exceptional wedding experience in a beautiful, rustic setting that reflects 
    their unique love story while delivering outstanding service and attention to detail.`,
    vision: `To be Fort Lauderdale's most sought-after wedding venue, known for our stunning location, exceptional 
    service, and ability to bring couples' wedding dreams to life.`,
    teamMembers: [
      {
        name: 'Sarah Johnson',
        position: 'Wedding Coordinator',
        bio: 'Sarah has over 10 years of experience in wedding planning and coordination.',
        image: '/images/team/sarah.jpg'
      },
      {
        name: 'Michael Davis',
        position: 'Venue Manager',
        bio: 'Michael ensures every event runs smoothly with his attention to detail.',
        image: '/images/team/michael.jpg'
      }
    ]
  },

  // Home details (from home_details table)
  homeDetails: {
    heroTitle: 'The White Barn FL',
    heroSubtitle: 'Where Dreams Come True',
    heroDescription: 'Experience the magic of your special day in our stunning rustic-elegant venue',
    aboutSection: {
      title: 'About Our Venue',
      subtitle: 'Rustic Elegance Meets Modern Luxury',
      description: `Our beautiful barn venue combines the charm of rustic architecture with modern amenities, 
      creating the perfect atmosphere for your wedding celebration.`
    },
    servicesSection: {
      title: 'Our Services',
      subtitle: 'Everything You Need for Your Perfect Day',
      description: `From intimate ceremonies to grand receptions, we offer comprehensive wedding services 
      to make your special day unforgettable.`
    }
  },

  // Social links (from social_links table)
  socialLinks: [
    {
      platform: 'facebook',
      url: 'https://www.facebook.com/thewhitebarnfl',
      isActive: true
    },
    {
      platform: 'instagram',
      url: 'https://www.instagram.com/thewhitebarnfl',
      isActive: true
    },
    {
      platform: 'twitter',
      url: 'https://twitter.com/thewhitebarnfl',
      isActive: true
    }
  ],

  // Property details (from property_details table)
  propertyDetails: {
    name: 'The White Barn FL',
    description: `A stunning rustic wedding venue featuring a beautifully restored barn with modern amenities, 
    surrounded by lush gardens and scenic landscapes perfect for outdoor ceremonies and receptions.`,
    capacity: {
      seated: 150,
      standing: 200
    },
    amenities: [
      'Rustic Barn Reception Hall',
      'Outdoor Ceremony Space',
      'Bridal Suite',
      'Groom\'s Room',
      'Full Catering Kitchen',
      'Dance Floor',
      'Sound System',
      'Lighting Package',
      'Tables and Chairs',
      'Parking for 100+ Cars',
      'Gardens and Landscaping',
      'Photo Opportunities'
    ],
    pricing: {
      basePrice: 3500,
      currency: 'USD',
      pricingNotes: 'Base price includes venue rental for 8 hours. Additional services available.'
    },
    location: {
      address: '4680 SW 148th Ave',
      city: 'Fort Lauderdale',
      state: 'FL',
      zipCode: '33330',
      coordinates: {
        latitude: 26.1224,
        longitude: -80.2373
      }
    },
    images: [
      {
        url: '/images/venue/exterior-1.jpg',
        alt: 'White Barn Exterior View',
        category: 'exterior'
      },
      {
        url: '/images/venue/interior-1.jpg',
        alt: 'Barn Interior Reception Setup',
        category: 'interior'
      },
      {
        url: '/images/venue/ceremony-1.jpg',
        alt: 'Outdoor Ceremony Space',
        category: 'ceremony'
      }
    ]
  },

  // Sample reviews (from reviews_detail table)
  reviews: [
    {
      clientName: 'Emily & James Wilson',
      clientEmail: 'emily.wilson@email.com',
      eventType: 'wedding',
      eventDate: new Date('2024-06-15'),
      rating: 5,
      title: 'Perfect Wedding Venue!',
      review: `The White Barn FL exceeded all our expectations! The venue is absolutely beautiful, 
      and the staff went above and beyond to make our special day perfect. The rustic charm combined 
      with modern amenities created the perfect atmosphere for our wedding.`,
      status: 'approved',
      isFeatured: true,
      photos: [
        {
          url: '/images/reviews/wilson-wedding-1.jpg',
          alt: 'Wilson Wedding Reception'
        }
      ]
    },
    {
      clientName: 'Sarah & Michael Rodriguez',
      clientEmail: 'sarah.rodriguez@email.com',
      eventType: 'wedding',
      eventDate: new Date('2024-05-20'),
      rating: 5,
      title: 'Amazing Experience',
      review: `From the initial tour to our wedding day, everything was flawless. The venue is stunning, 
      and Sarah (our coordinator) was incredible. Highly recommend The White Barn FL!`,
      status: 'approved',
      isFeatured: true
    },
    {
      clientName: 'Jennifer & David Thompson',
      clientEmail: 'jennifer.thompson@email.com',
      eventType: 'wedding',
      eventDate: new Date('2024-04-10'),
      rating: 5,
      title: 'Dream Wedding Venue',
      review: `The White Barn FL made our wedding dreams come true. The attention to detail, 
      beautiful setting, and professional staff created an unforgettable experience for us and our guests.`,
      status: 'approved',
      isFeatured: false
    }
  ],

  // Sample gallery images
  galleryImages: [
    {
      filename: 'barn-exterior-sunset.jpg',
      originalName: 'barn-exterior-sunset.jpg',
      path: '/images/gallery/barn-exterior-sunset.jpg',
      size: 2048000,
      mimetype: 'image/jpeg',
      category: 'venue',
      title: 'Barn Exterior at Sunset',
      alt: 'Beautiful barn exterior during golden hour',
      description: 'The stunning exterior of our barn venue during sunset',
      tags: ['exterior', 'sunset', 'barn', 'venue'],
      order: 1,
      isActive: true,
      isFeatured: true
    },
    {
      filename: 'ceremony-setup.jpg',
      originalName: 'ceremony-setup.jpg',
      path: '/images/gallery/ceremony-setup.jpg',
      size: 1856000,
      mimetype: 'image/jpeg',
      category: 'ceremonies',
      title: 'Outdoor Ceremony Setup',
      alt: 'Elegant outdoor wedding ceremony setup',
      description: 'Our beautiful outdoor ceremony space set up for a wedding',
      tags: ['ceremony', 'outdoor', 'wedding', 'setup'],
      order: 2,
      isActive: true,
      isFeatured: true
    },
    {
      filename: 'reception-interior.jpg',
      originalName: 'reception-interior.jpg',
      path: '/images/gallery/reception-interior.jpg',
      size: 1920000,
      mimetype: 'image/jpeg',
      category: 'receptions',
      title: 'Reception Hall Interior',
      alt: 'Rustic barn interior set up for reception',
      description: 'The interior of our barn beautifully decorated for a reception',
      tags: ['reception', 'interior', 'barn', 'decoration'],
      order: 3,
      isActive: true,
      isFeatured: true
    }
  ]
};

// Migration functions
const migrateAdmin = async () => {
  console.log('🔐 Migrating admin user...');
  
  // Check if admin already exists
  const existingAdmin = await Admin.findOne({ email: migrationData.admin.email });
  if (existingAdmin) {
    console.log('   ✅ Admin user already exists');
    return existingAdmin;
  }

  // Create admin user
  const admin = await Admin.create(migrationData.admin);
  console.log('   ✅ Admin user created');
  return admin;
};

const migrateSettings = async (adminId) => {
  console.log('⚙️  Migrating settings...');
  
  // Check if settings already exist
  const existingCount = await Settings.countDocuments();
  if (existingCount > 0) {
    console.log('   ✅ Settings already exist');
    return;
  }

  // Create all default settings
  let settingsCount = 0;
  for (const [category, categoryDefaults] of Object.entries(defaultSettings)) {
    for (const [key, config] of Object.entries(categoryDefaults)) {
      await Settings.create({
        category,
        key,
        value: config.value,
        type: config.type,
        description: config.description,
        isPublic: config.isPublic || false,
        isRequired: config.isRequired || false,
        validation: config.validation,
        lastModifiedBy: adminId
      });
      settingsCount++;
    }
  }
  
  console.log(`   ✅ ${settingsCount} settings created`);
};

const migrateContent = async () => {
  console.log('📄 Migrating content...');
  
  // Contact Details
  const existingContact = await ContactDetails.findOne();
  if (!existingContact) {
    await ContactDetails.create(migrationData.contactDetails);
    console.log('   ✅ Contact details created');
  } else {
    console.log('   ✅ Contact details already exist');
  }

  // About Details
  const existingAbout = await AboutDetails.findOne();
  if (!existingAbout) {
    await AboutDetails.create(migrationData.aboutDetails);
    console.log('   ✅ About details created');
  } else {
    console.log('   ✅ About details already exist');
  }

  // Home Details
  const existingHome = await HomeDetails.findOne();
  if (!existingHome) {
    await HomeDetails.create(migrationData.homeDetails);
    console.log('   ✅ Home details created');
  } else {
    console.log('   ✅ Home details already exist');
  }

  // Property Details
  const existingProperty = await PropertyDetails.findOne();
  if (!existingProperty) {
    await PropertyDetails.create(migrationData.propertyDetails);
    console.log('   ✅ Property details created');
  } else {
    console.log('   ✅ Property details already exist');
  }

  // Social Links
  const existingSocialCount = await SocialLinks.countDocuments();
  if (existingSocialCount === 0) {
    await SocialLinks.insertMany(migrationData.socialLinks);
    console.log(`   ✅ ${migrationData.socialLinks.length} social links created`);
  } else {
    console.log('   ✅ Social links already exist');
  }
};

const migrateReviews = async () => {
  console.log('⭐ Migrating reviews...');
  
  const existingCount = await Review.countDocuments();
  if (existingCount > 0) {
    console.log('   ✅ Reviews already exist');
    return;
  }

  await Review.insertMany(migrationData.reviews);
  console.log(`   ✅ ${migrationData.reviews.length} reviews created`);
};

const migrateGallery = async (adminId) => {
  console.log('🖼️  Migrating gallery...');
  
  const existingCount = await Gallery.countDocuments();
  if (existingCount > 0) {
    console.log('   ✅ Gallery images already exist');
    return;
  }

  // Add uploadedBy to each image
  const imagesWithUploader = migrationData.galleryImages.map(image => ({
    ...image,
    uploadedBy: adminId
  }));

  await Gallery.insertMany(imagesWithUploader);
  console.log(`   ✅ ${migrationData.galleryImages.length} gallery images created`);
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('🚀 Starting MongoDB Migration from MySQL...\n');
    
    // Connect to database
    await connectDB();
    
    // Run migrations in order
    const admin = await migrateAdmin();
    await migrateSettings(admin._id);
    await migrateContent();
    await migrateReviews();
    await migrateGallery(admin._id);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log('   • Admin user created/verified');
    console.log('   • Default settings initialized');
    console.log('   • Content data migrated (Contact, About, Home, Property, Social Links)');
    console.log('   • Sample reviews created');
    console.log('   • Sample gallery images created');
    
    console.log('\n🔑 Default Admin Credentials:');
    console.log('   Email: info@thewhitebarnfl.com');
    console.log('   Password: admin123');
    
    console.log('\n⚠️  Remember to:');
    console.log('   1. Change the default admin password');
    console.log('   2. Update SMTP settings in admin panel');
    console.log('   3. Upload actual gallery images');
    console.log('   4. Review and update content as needed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run migration if this file is executed directly
if (process.argv[1] === __filename) {
  runMigration();
}

export default runMigration;
