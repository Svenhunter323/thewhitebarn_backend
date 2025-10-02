import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Gallery from '../models/Gallery.js';

// Load environment variables
dotenv.config();

// Hardcoded gallery data from routes/gallery.js
const galleryData = [
  {
    filename: 'gallery1.jpg',
    originalName: 'gallery1.jpg',
    path: '/images/gallery/gallery1.jpg',
    url: '/images/gallery/gallery1.jpg',
    size: 0, // Will be updated with actual file size if needed
    mimetype: 'image/jpeg',
    category: 'weddings',
    title: 'Beautiful Wedding Ceremony',
    alt: 'Wedding ceremony at The White Barn FL',
    isActive: true,
    isFeatured: true,
    order: 1
  },
  {
    filename: 'gallery2.jpg',
    originalName: 'gallery2.jpg',
    path: '/images/gallery/gallery2.jpg',
    url: '/images/gallery/gallery2.jpg',
    size: 0,
    mimetype: 'image/jpeg',
    category: 'ceremonies',
    title: 'Outdoor Ceremony Setup',
    alt: 'Outdoor ceremony setup',
    isActive: true,
    isFeatured: true,
    order: 2
  },
  {
    filename: 'gallery3.jpg',
    originalName: 'gallery3.jpg',
    path: '/images/gallery/gallery3.jpg',
    url: '/images/gallery/gallery3.jpg',
    size: 0,
    mimetype: 'image/jpeg',
    category: 'receptions',
    title: 'Reception Hall',
    alt: 'Reception hall setup',
    isActive: true,
    isFeatured: true,
    order: 3
  },
  {
    filename: 'gallery4.jpg',
    originalName: 'gallery4.jpg',
    path: '/images/gallery/gallery4.jpg',
    url: '/images/gallery/gallery4.jpg',
    size: 0,
    mimetype: 'image/jpeg',
    category: 'venue',
    title: 'Venue Overview',
    alt: 'Overview of the venue',
    isActive: true,
    isFeatured: true,
    order: 4
  },
  {
    filename: 'gallery5.jpg',
    originalName: 'gallery5.jpg',
    path: '/images/gallery/gallery5.jpg',
    url: '/images/gallery/gallery5.jpg',
    size: 0,
    mimetype: 'image/jpeg',
    category: 'gardens',
    title: 'Garden Pathway',
    alt: 'Beautiful garden pathway',
    isActive: true,
    isFeatured: true,
    order: 5
  },
  {
    filename: 'gallery6.jpg',
    originalName: 'gallery6.jpg',
    path: '/images/gallery/gallery6.jpg',
    url: '/images/gallery/gallery6.jpg',
    size: 0,
    mimetype: 'image/jpeg',
    category: 'weddings',
    title: 'Wedding Photography',
    alt: 'Wedding photography session',
    isActive: true,
    isFeatured: true,
    order: 6
  }
];

async function migrateGallery() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing gallery data
    await Gallery.deleteMany({});
    console.log('Cleared existing gallery data');

    // Insert new gallery data
    const result = await Gallery.insertMany(galleryData);
    console.log(`Successfully inserted ${result.length} gallery items`);

    // Close the connection
    await mongoose.connection.close();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateGallery();
