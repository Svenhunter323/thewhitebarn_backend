import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import Gallery from '../models/Gallery.js';

// Ensure upload directories exist
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/gallery',
    'uploads/gallery/thumbnails',
    'uploads/avatars',
    'uploads/temp'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = 'uploads/temp';
    
    if (req.route.path.includes('gallery')) {
      uploadPath = 'uploads/gallery';
    } else if (req.route.path.includes('avatar')) {
      uploadPath = 'uploads/avatars';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    files: 10 // Maximum 10 files at once
  },
  fileFilter: fileFilter
});

// Middleware for single file upload
export const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const singleUpload = upload.single(fieldName);
    
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'File too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple file upload
export const uploadMultiple = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    const multipleUpload = upload.array(fieldName, maxCount);
    
    multipleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'One or more files are too large. Maximum size is 5MB per file.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            status: 'error',
            message: `Too many files. Maximum ${maxCount} files allowed.`
          });
        }
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      } else if (err) {
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      next();
    });
  };
};

// Image processing middleware
export const processImages = async (req, res, next) => {
  try {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || [req.file];
    const processedFiles = [];

    for (const file of files) {
      try {
        // Get image metadata
        const metadata = await sharp(file.path).metadata();
        
        // Generate thumbnails for gallery images
        if (req.route.path.includes('gallery')) {
          const thumbnailDir = 'uploads/gallery/thumbnails';
          const fileNameWithoutExt = path.parse(file.filename).name;
          
          // Small thumbnail (150x150)
          const smallThumb = `${fileNameWithoutExt}_small.jpg`;
          await sharp(file.path)
            .resize(150, 150, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toFile(path.join(thumbnailDir, smallThumb));
          
          // Medium thumbnail (300x300)
          const mediumThumb = `${fileNameWithoutExt}_medium.jpg`;
          await sharp(file.path)
            .resize(300, 300, { fit: 'cover' })
            .jpeg({ quality: 85 })
            .toFile(path.join(thumbnailDir, mediumThumb));
          
          // Large thumbnail (600x600)
          const largeThumb = `${fileNameWithoutExt}_large.jpg`;
          await sharp(file.path)
            .resize(600, 600, { fit: 'cover' })
            .jpeg({ quality: 90 })
            .toFile(path.join(thumbnailDir, largeThumb));
          
          // Add thumbnail info to file object
          file.thumbnails = {
            small: {
              path: `/uploads/gallery/thumbnails/${smallThumb}`,
              width: 150,
              height: 150
            },
            medium: {
              path: `/uploads/gallery/thumbnails/${mediumThumb}`,
              width: 300,
              height: 300
            },
            large: {
              path: `/uploads/gallery/thumbnails/${largeThumb}`,
              width: 600,
              height: 600
            }
          };
        }
        
        // Add metadata to file object
        file.metadata = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          colorSpace: metadata.space,
          hasAlpha: metadata.hasAlpha,
          orientation: metadata.orientation
        };
        
        processedFiles.push(file);
      } catch (error) {
        console.error('Error processing image:', error);
        // Continue with other files if one fails
      }
    }
    
    // Update req object with processed files
    if (req.files) {
      req.files = processedFiles;
    } else {
      req.file = processedFiles[0];
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Gallery upload controller
export const uploadGalleryImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No files uploaded'
      });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const galleryImage = await Gallery.create({
        filename: file.filename,
        originalName: file.originalname,
        path: `/uploads/gallery/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
        category: req.body.category || 'general',
        title: req.body.title || file.originalname,
        alt: req.body.alt || file.originalname,
        description: req.body.description,
        tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
        uploadedBy: req.admin.id,
        metadata: file.metadata,
        thumbnails: file.thumbnails,
        isActive: true
      });

      uploadedImages.push(galleryImage);
    }

    res.status(201).json({
      status: 'success',
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: {
        images: uploadedImages
      }
    });
  } catch (error) {
    // Clean up uploaded files if database save fails
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          // Also clean up thumbnails
          if (file.thumbnails) {
            Object.values(file.thumbnails).forEach(thumb => {
              const thumbPath = thumb.path.replace('/', '');
              if (fs.existsSync(thumbPath)) {
                fs.unlinkSync(thumbPath);
              }
            });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
    }
    next(error);
  }
};

// Avatar upload controller
export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    // Process avatar image
    const avatarPath = `uploads/avatars/avatar_${req.admin.id}_${Date.now()}.jpg`;
    
    await sharp(req.file.path)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toFile(avatarPath);

    // Delete original uploaded file
    fs.unlinkSync(req.file.path);

    // Update admin avatar
    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { avatar: `/${avatarPath}` },
      { new: true }
    ).select('-password');

    res.status(200).json({
      status: 'success',
      message: 'Avatar uploaded successfully',
      data: {
        admin,
        avatarUrl: `/${avatarPath}`
      }
    });
  } catch (error) {
    // Clean up uploaded file if processing fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
