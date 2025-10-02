import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

// Generate JWT Token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Verify JWT Token and protect routes
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header (primary method)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token from Authorization header:', token ? 'Found' : 'Not found');
    }
    // Check for token in cookies (fallback method)
    else if (req.cookies && (req.cookies.token || req.cookies.admin_token)) {
      token = req.cookies.token || req.cookies.admin_token;
      console.log('Token from cookies:', token ? 'Found' : 'Not found');
    }

    // No token found
    if (!token || token === 'null' || token === 'undefined') {
      console.log('No valid token provided');
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, no token provided'
      });
    }

    try {
      // Verify token
      console.log('Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded.id);
      
      // Get admin from token
      const admin = await Admin.findById(decoded.id).select('-password');
      
      if (!admin) {
        console.log('Admin not found for token');
        return res.status(401).json({
          status: 'error',
          message: 'Not authorized, admin not found'
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        console.log('Admin account is deactivated');
        return res.status(401).json({
          status: 'error',
          message: 'Account is deactivated'
        });
      }

      // Check if admin account is locked
      if (admin.isLocked) {
        console.log('Admin account is locked');
        return res.status(423).json({
          status: 'error',
          message: 'Account is temporarily locked due to multiple failed login attempts'
        });
      }

      console.log('Authentication successful for:', admin.email);
      // Add admin to request object
      req.admin = admin;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized, invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Server error in authentication'
    });
  }
};

// Check for specific permissions
export const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin has required permissions
    const hasPermission = permissions.some(permission => {
      const [resource, action] = permission.split(':');
      return req.admin.hasPermission(resource, action);
    });

    if (!hasPermission) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to access this resource'
      });
    }

    next();
  };
};

// Check if admin role matches required roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

// Optional authentication (for routes that can work with or without auth)
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && (req.cookies.token || req.cookies.admin_token)) {
      token = req.cookies.token || req.cookies.admin_token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (admin && admin.isActive && !admin.isLocked) {
          req.admin = admin;
        }
      } catch (error) {
        // Token is invalid, but that's okay for optional auth
        console.log('Optional auth token invalid:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
};

// Rate limiting for login attempts
export const loginRateLimit = (req, res, next) => {
  // This would typically use Redis or a more sophisticated rate limiting solution
  // For now, we'll rely on the account locking mechanism in the Admin model
  next();
};
