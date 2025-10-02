import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import { seedDatabase } from '../utils/seedData.js';

// Load environment variables
dotenv.config();

const runSeed = async () => {
  try {
    console.log('🌱 Starting database seeding process...');
    
    // Connect to database
    await connectDB();
    
    // Seed the database
    await seedDatabase();
    
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

runSeed();
