import mongoose from 'mongoose';
import Admin from './src/models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const admin = await Admin.findOne({ email: 'info@thewhitebarnfl.com' });
    
    if (admin) {
      console.log('Admin user found:', {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        isLocked: admin.isLocked
      });
    } else {
      console.log('Admin user not found. Creating default admin...');
      
      const newAdmin = new Admin({
        name: 'Admin',
        email: 'info@thewhitebarnfl.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true
      });
      
      await newAdmin.save();
      console.log('Default admin created successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
