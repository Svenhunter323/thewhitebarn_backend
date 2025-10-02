import express from 'express';
import {
  login,
  register,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  validateLogin,
  validateRegister,
  validatePasswordChange
} from '../controllers/authController.js';
import { protect, restrictTo, loginRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', loginRateLimit, validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resettoken', resetPassword);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/me', getMe);
router.get('/verify-token', getMe); // Add verify-token route that uses same logic as /me
router.post('/logout', logout);
router.put('/profile', updateProfile);
router.put('/change-password', validatePasswordChange, changePassword);

// Super admin only routes
router.post('/register', restrictTo('super_admin'), validateRegister, register);

export default router;
