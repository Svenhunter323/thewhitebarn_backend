import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import { generateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/email.js';

// Validation rules for login
export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for registration
export const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation rules for password change
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Helper function to send token response
const sendTokenResponse = (admin, statusCode, res, message = 'Success') => {
  // Create token
  const token = generateToken(admin._id);

  // Cookie options
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  const response = {
    status: 'success',
    message,
    token,
    data: {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
        requirePasswordChange: admin.requirePasswordChange,
        preferences: admin.preferences
      }
    }
  };

  console.log('Sending login response:', JSON.stringify(response, null, 2));

  res.status(statusCode)
    .cookie('token', token, options)
    .json(response);
};

// @desc    Login admin
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
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

    const { email, password } = req.body;

    // Find admin by email and include password for comparison
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        status: 'error',
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Send token response
    sendTokenResponse(admin, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Register new admin (super admin only)
// @route   POST /api/auth/register
// @access  Private (Super Admin)
export const register = async (req, res, next) => {
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

    const { name, email, password, role = 'admin' } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        status: 'error',
        message: 'Admin with this email already exists'
      });
    }

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password,
      role,
      requirePasswordChange: true
    });

    // Send welcome email
    try {
      await sendWelcomeEmail({
        name: admin.name,
        email: admin.email,
        tempPassword: password
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.status(201).json({
      status: 'success',
      message: 'Admin created successfully',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current admin profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    res.status(200).json({
      status: 'success',
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          avatar: admin.avatar,
          phone: admin.phone,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          requirePasswordChange: admin.requirePasswordChange,
          preferences: admin.preferences,
          permissions: admin.permissions,
          createdAt: admin.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, preferences } = req.body;

    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(preferences && { preferences })
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { admin }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res, next) => {
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

    const { currentPassword, newPassword } = req.body;

    // Get admin with password
    const admin = await Admin.findById(req.admin.id).select('+password');

    // Check current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    admin.requirePasswordChange = false;
    await admin.save();

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'No admin found with this email address'
      });
    }

    // Generate reset token
    const resetToken = admin.getResetPasswordToken();
    await admin.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail({
        name: admin.name,
        email: admin.email,
        resetUrl
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset email sent'
      });
    } catch (error) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    admin.password = req.body.password;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    admin.requirePasswordChange = false;
    await admin.save();

    // Send token response
    sendTokenResponse(admin, 200, res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout admin
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};
