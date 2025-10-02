import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import {
  ContactDetails,
  AboutDetails,
  HomeDetails,
  SocialLinks,
  PropertyDetails,
  Review
} from '../models/Content.js';
import Contact from '../models/Contact.js';
import Admin from '../models/Admin.js';
import Gallery from '../models/Gallery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Function to parse MySQL backup file
const parseMySQLBackup = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const tables = {};
  
  // Extract INSERT statements
  const insertRegex = /INSERT INTO `(\w+)`[^;]+;/g;
  let match;
  
  while ((match = insertRegex.exec(content)) !== null) {
    const tableName = match[1];
    const insertStatement = match[0];
    
    if (!tables[tableName]) {
      tables[tableName] = [];
    }
    
    // Parse values from INSERT statement
    const valuesRegex = /VALUES\s*\(([^)]+)\)/g;
    let valueMatch;
    
    while ((valueMatch = valuesRegex.exec(insertStatement)) !== null) {
      const values = valueMatch[1];
      // Simple parsing - in production, use a proper SQL parser
      const parsedValues = values.split(',').map(v => v.trim().replace(/^'|'$/g, ''));
      tables[tableName].push(parsedValues);
    }
  }
  
  return tables;
};

// Migration functions
const migrateAdminData = async (tables) => {
  console.log('🔐 Migrating admin data...');
  
  if (tables.login_details) {
    await Admin.deleteMany({});
    
    for (const row of tables.login_details) {
      const [admin_id, user_name, user_pass, last_login, admin_ip, type, name] = row;
      
      await Admin.create({
        email: user_name,
        // Note: Original password is MD5 hashed as '21232f297a57a5a743894a0e4a801fc3' = 'admin'
        // We'll set a default password and require change on first login
        password: 'admin123', // Will be hashed by pre-save middleware
        name: name || 'Administrator',
        role: type || 'admin',
        isActive: true,
        lastLogin: last_login ? new Date(last_login) : null,
        requirePasswordChange: true
      });
    }
    
    console.log(`✅ Migrated ${tables.login_details.length} admin records`);
  }
};

const migrateContactDetails = async (tables) => {
  console.log('📞 Migrating contact details...');
  
  if (tables.contact_details) {
    await ContactDetails.deleteMany({});
    
    for (const row of tables.contact_details) {
      const [contact_id, admin_id, contact_name, contact_email, contact_phone, 
             contact_address, contact_map, contact_inst_date, contact_update_date, contact_ip] = row;
      
      // Skip if required fields are missing
      if (!contact_email || !contact_address) {
        console.warn(`⚠️  Skipping contact details - missing required fields for row:`, row);
        continue;
      }
      
      // Use a default phone number if not provided
      const phone = contact_phone && contact_phone !== 'NULL' ? contact_phone : '';
      
      await ContactDetails.create({
        phone: phone,
        email: contact_email,
        address: contact_address,
        hours: 'Mon - Fri: 9:00 AM - 6:00 PM, Sat - Sun: By Appointment',
        emergencyContact: phone || 'Not provided' // Provide a fallback for emergency contact
      });
    }
    
    console.log(`✅ Migrated ${tables.contact_details.length} contact detail records`);
  }
};

const migrateHomeDetails = async (tables) => {
  console.log('🏠 Migrating home details...');
  
  if (tables.home_details) {
    await HomeDetails.deleteMany({});
    
    for (const row of tables.home_details) {
      const [home_id, admin_id, home_heading, home_content, home_short_content,
             home_inst_date, home_update_date, home_ip] = row;
      
      await HomeDetails.create({
        heroTitle: home_heading,
        heroSubtitle: 'Your Perfect Day, Our Beautiful Space',
        heroDescription: home_short_content,
        aboutSection: {
          title: 'Host Your Beautiful Event with Us',
          subtitle: 'WELCOME TO THE WHITE BARN FL',
          description: home_content
        },
        servicesSection: {
          title: 'Create Unforgettable Moments at Our Venue',
          subtitle: 'WEDDING SERVICES FOR YOU',
          description: 'Your Perfect Day, Our Beautiful Space'
        }
      });
    }
    
    console.log(`✅ Migrated ${tables.home_details.length} home detail records`);
  }
};

const migrateAboutDetails = async (tables) => {
  console.log('ℹ️ Migrating about details...');
  
  if (tables.about_details) {
    await AboutDetails.deleteMany({});
    
    for (const row of tables.about_details) {
      const [about_id, admin_id, about_profile_img, about_video_url, about_heading,
             about_content, about_short_content, about_news, about_inst_date, 
             about_update_date, about_ip] = row;
      
      await AboutDetails.create({
        title: about_heading,
        subtitle: 'Your Dream Venue Awaits',
        description: about_content,
        mission: about_short_content,
        vision: about_news,
        teamMembers: [
          {
            name: 'Gina Rodriguez',
            position: 'Event Coordinator',
            bio: 'Working alongside Mike, Gina ensures that every event at The White Barn FL is unique and enchanting.',
            image: about_profile_img || '/images/event-1.jpg'
          }
        ]
      });
    }
    
    console.log(`✅ Migrated ${tables.about_details.length} about detail records`);
  }
};

const migrateSocialLinks = async (tables) => {
  console.log('🔗 Migrating social links...');
  
  if (tables.social_links) {
    await SocialLinks.deleteMany({});
    
    for (const row of tables.social_links) {
      const [social_id, admin_id, facebook, twitter, google_plus, instagram,
             youtube, linkedin, social_inst_date, social_update_date, social_ip] = row;
      
      const socialPlatforms = [
        { platform: 'facebook', url: facebook },
        { platform: 'twitter', url: twitter },
        { platform: 'instagram', url: instagram },
        { platform: 'youtube', url: youtube },
        { platform: 'linkedin', url: linkedin }
      ];
      
      for (const social of socialPlatforms) {
        if (social.url && social.url !== '' && social.url !== 'NULL') {
          await SocialLinks.create({
            platform: social.platform,
            url: social.url,
            isActive: true
          });
        }
      }
    }
    
    console.log(`✅ Migrated social links`);
  }
};

const migratePropertyDetails = async (tables) => {
  console.log('🏢 Migrating property details...');
  
  if (tables.property_details) {
    await PropertyDetails.deleteMany({});
    
    for (const row of tables.property_details) {
      // Property details has many fields, we'll map the key ones
      const [property_id, admin_id, pro_name, pro_add, pro_city, pro_state, pro_country,
             pro_zip, pro_phone, pro_email, pro_website, pro_desc, pro_short_desc] = row.slice(0, 13);
      
      await PropertyDetails.create({
        name: pro_name || 'The White Barn FL',
        description: pro_desc || 'A stunning venue for weddings and special events',
        capacity: {
          seated: 150,
          standing: 200
        },
        amenities: [
          'Botanical Gardens',
          'Indoor Plant Showroom',
          'Bridal Suite',
          'Catering Kitchen',
          'Parking Area',
          'Ceremony Space',
          'Reception Hall',
          'Photography Areas'
        ],
        pricing: {
          basePrice: 2500,
          currency: 'USD',
          pricingNotes: 'Base price includes venue rental for 8 hours'
        },
        location: {
          address: pro_add || '4680 SW 148th Ave',
          city: pro_city || 'Fort Lauderdale',
          state: pro_state || 'FL',
          zipCode: pro_zip || '33330'
        },
        images: []
      });
    }
    
    console.log(`✅ Migrated ${tables.property_details.length} property detail records`);
  }
};

const migrateGalleryImages = async (tables) => {
  console.log('🖼️ Migrating gallery images...');
  
  if (tables.files) {
    await Gallery.deleteMany({});
    
    for (const row of tables.files) {
      const [image_id, property_id, admin_id, file_name, file_size, caption,
             menu_order, uploaded_img_date, updated_img_date] = row;
      
      await Gallery.create({
        filename: file_name,
        originalName: file_name,
        path: `/uploads/gallery/${file_name}`,
        size: parseInt(file_size) || 0,
        mimetype: 'image/jpeg',
        category: 'general',
        title: caption || `Gallery Image ${menu_order}`,
        alt: caption || `Gallery Image ${menu_order}`,
        order: parseInt(menu_order) || 0,
        isActive: true
      });
    }
    
    console.log(`✅ Migrated ${tables.files.length} gallery images`);
  }
};

const migrateContactSubmissions = async (tables) => {
  console.log('📧 Migrating contact submissions...');
  
  if (tables.contactus) {
    await Contact.deleteMany({});
    
    for (const row of tables.contactus) {
      const [id, venuebudget, guest, eventtype, eventdate, name, email, phone,
             message, add_date, ip] = row;
      
      await Contact.create({
        name: name,
        email: email,
        phone: phone,
        message: message || `Event Type: ${eventtype}, Budget: ${venuebudget}, Guests: ${guest}, Date: ${eventdate}`,
        status: 'new',
        ipAddress: ip
      });
    }
    
    console.log(`✅ Migrated ${tables.contactus.length} contact submissions`);
  }
};

const migrateReviews = async (tables) => {
  console.log('⭐ Migrating reviews...');
  
  if (tables.reviews_detail) {
    await Review.deleteMany({});
    
    for (const row of tables.reviews_detail) {
      const [review_id, admin_id, client_name, client_email, review_content,
             review_rating, review_inst_date, review_update_date, review_ip] = row;
      
      await Review.create({
        clientName: client_name,
        eventType: 'wedding',
        eventDate: new Date(),
        rating: parseInt(review_rating) || 5,
        title: `Review from ${client_name}`,
        review: review_content,
        isApproved: true,
        isFeatured: parseInt(review_rating) >= 5,
        clientEmail: client_email
      });
    }
    
    console.log(`✅ Migrated ${tables.reviews_detail.length} reviews`);
  }
};

// Main migration function
const runMigration = async () => {
  try {
    console.log('🚀 Starting MySQL to MongoDB migration...');
    
    // Connect to database
    await connectDB();
    
    // Parse MySQL backup file
    const backupPath = path.join(process.cwd(), '../../php/backup/backup_thewhitebarnfl_sfasfafaf_2025-10-01_10-47-29.sql');
    console.log(`📁 Reading backup file: ${backupPath}`);
    
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }
    
    const tables = parseMySQLBackup(backupPath);
    console.log(`📊 Found ${Object.keys(tables).length} tables with data`);
    
    // Run migrations
    await migrateAdminData(tables);
    await migrateContactDetails(tables);
    await migrateHomeDetails(tables);
    await migrateAboutDetails(tables);
    await migrateSocialLinks(tables);
    await migratePropertyDetails(tables);
    await migrateGalleryImages(tables);
    await migrateContactSubmissions(tables);
    await migrateReviews(tables);
    
    console.log('✅ Migration completed successfully!');
    console.log('🔐 Default admin credentials:');
    console.log('   Email: info@thewhitebarnfl.com');
    console.log('   Password: admin123');
    console.log('   (You will be required to change password on first login)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration().catch(console.error);
}

export default runMigration;
