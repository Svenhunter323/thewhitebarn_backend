import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Import routes
import contactRoutes from './routes/contact.js';
import contentRoutes from './routes/content.js';
import galleryRoutes from './routes/gallery.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/gallery', galleryRoutes);

// Handle undefined API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Serve static files from the React app
const staticPath = path.join(rootDir, 'dist');

// Serve static files
app.use(express.static(staticPath, {
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper MIME type for JavaScript modules
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only start the server if this file is run directly (not when imported for tests)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`Serving static files from: ${staticPath}`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
  });
}

export default app;
