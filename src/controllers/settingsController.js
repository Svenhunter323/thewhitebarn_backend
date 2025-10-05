import asyncHandler from 'express-async-handler';
import { validationResult } from 'express-validator';
import Settings, { defaultSettings } from '../models/Settings.js';

// @desc    Get all settings grouped by category
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getAllSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getAllGrouped();
  
  res.json({
    status: 'success',
    data: { settings }
  });
});

// @desc    Get settings by category
// @route   GET /api/admin/settings/:category
// @access  Private/Admin
export const getSettingsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  
  const validCategories = ['general', 'email', 'security', 'notifications', 'backup', 'analytics'];
  
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid category'
    });
  }
  
  const settings = await Settings.getByCategory(category);
  
  res.json({
    status: 'success',
    data: { settings }
  });
});

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSettings = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  
  const { settings } = req.body;
  const adminId = req.admin.id;
  
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({
      status: 'error',
      message: 'Settings object is required'
    });
  }
  
  const updatedSettings = {};
  const errors_list = [];
  
  // Process each category
  for (const [category, categorySettings] of Object.entries(settings)) {
    updatedSettings[category] = {};
    
    // Process each setting in the category
    for (const [key, value] of Object.entries(categorySettings)) {
      try {
        // Get existing setting for validation
        const existingSetting = await Settings.findOne({ category, key });
        
        if (existingSetting) {
          // Validate the new value
          const validation = existingSetting.validateValue(value);
          if (!validation.isValid) {
            errors_list.push({
              category,
              key,
              error: validation.error
            });
            continue;
          }
        }
        
        // Update or create the setting
        const updatedSetting = await Settings.setSetting(
          category,
          key,
          value,
          adminId,
          existingSetting ? {
            type: existingSetting.type,
            description: existingSetting.description,
            isPublic: existingSetting.isPublic,
            isRequired: existingSetting.isRequired,
            validation: existingSetting.validation
          } : {}
        );
        
        updatedSettings[category][key] = updatedSetting.value;
        
      } catch (error) {
        errors_list.push({
          category,
          key,
          error: error.message
        });
      }
    }
  }
  
  if (errors_list.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Some settings could not be updated',
      errors: errors_list,
      data: { updatedSettings }
    });
  }
  
  res.json({
    status: 'success',
    message: 'Settings updated successfully',
    data: { settings: updatedSettings }
  });
});

// @desc    Update single setting
// @route   PUT /api/admin/settings/:category/:key
// @access  Private/Admin
export const updateSingleSetting = asyncHandler(async (req, res) => {
  const { category, key } = req.params;
  const { value } = req.body;
  const adminId = req.admin.id;
  
  const validCategories = ['general', 'email', 'security', 'notifications', 'backup', 'analytics'];
  
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid category'
    });
  }
  
  if (value === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Value is required'
    });
  }
  
  try {
    // Get existing setting for validation
    const existingSetting = await Settings.findOne({ category, key });
    
    if (existingSetting) {
      // Validate the new value
      const validation = existingSetting.validateValue(value);
      if (!validation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: validation.error
        });
      }
    }
    
    // Update or create the setting
    const updatedSetting = await Settings.setSetting(
      category,
      key,
      value,
      adminId,
      existingSetting ? {
        type: existingSetting.type,
        description: existingSetting.description,
        isPublic: existingSetting.isPublic,
        isRequired: existingSetting.isRequired,
        validation: existingSetting.validation
      } : {}
    );
    
    res.json({
      status: 'success',
      message: 'Setting updated successfully',
      data: { setting: updatedSetting }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Get public settings (for frontend)
// @route   GET /api/settings/public
// @access  Public
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getPublicSettings();
  
  res.json({
    status: 'success',
    data: { settings }
  });
});

// @desc    Reset settings to default
// @route   POST /api/admin/settings/reset
// @access  Private/Admin
export const resetSettings = asyncHandler(async (req, res) => {
  const { category } = req.body;
  const adminId = req.admin.id;
  
  if (category && !['general', 'email', 'security', 'notifications', 'backup', 'analytics'].includes(category)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid category'
    });
  }
  
  try {
    if (category) {
      // Reset specific category
      await Settings.deleteMany({ category });
      
      // Recreate default settings for the category
      const categoryDefaults = defaultSettings[category];
      for (const [key, config] of Object.entries(categoryDefaults)) {
        await Settings.setSetting(
          category,
          key,
          config.value,
          adminId,
          {
            type: config.type,
            description: config.description,
            isPublic: config.isPublic,
            isRequired: config.isRequired,
            validation: config.validation
          }
        );
      }
      
      const resetSettings = await Settings.getByCategory(category);
      
      res.json({
        status: 'success',
        message: `${category} settings reset to default`,
        data: { settings: { [category]: resetSettings } }
      });
      
    } else {
      // Reset all settings
      await Settings.deleteMany({});
      
      // Recreate all default settings
      for (const [cat, categoryDefaults] of Object.entries(defaultSettings)) {
        for (const [key, config] of Object.entries(categoryDefaults)) {
          await Settings.setSetting(
            cat,
            key,
            config.value,
            adminId,
            {
              type: config.type,
              description: config.description,
              isPublic: config.isPublic,
              isRequired: config.isRequired,
              validation: config.validation
            }
          );
        }
      }
      
      const allSettings = await Settings.getAllGrouped();
      
      res.json({
        status: 'success',
        message: 'All settings reset to default',
        data: { settings: allSettings }
      });
    }
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Initialize default settings
// @route   POST /api/admin/settings/initialize
// @access  Private/Admin
export const initializeSettings = asyncHandler(async (req, res) => {
  const adminId = req.admin.id;
  
  try {
    // Check if settings already exist
    const existingCount = await Settings.countDocuments();
    
    if (existingCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Settings already initialized'
      });
    }
    
    // Create all default settings
    for (const [category, categoryDefaults] of Object.entries(defaultSettings)) {
      for (const [key, config] of Object.entries(categoryDefaults)) {
        await Settings.setSetting(
          category,
          key,
          config.value,
          adminId,
          {
            type: config.type,
            description: config.description,
            isPublic: config.isPublic,
            isRequired: config.isRequired,
            validation: config.validation
          }
        );
      }
    }
    
    const allSettings = await Settings.getAllGrouped();
    
    res.json({
      status: 'success',
      message: 'Settings initialized successfully',
      data: { settings: allSettings }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// @desc    Export settings
// @route   GET /api/admin/settings/export
// @access  Private/Admin
export const exportSettings = asyncHandler(async (req, res) => {
  const { format = 'json' } = req.query;
  
  const settings = await Settings.find().lean();
  
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=settings-${new Date().toISOString().split('T')[0]}.json`);
    res.json({
      exportDate: new Date().toISOString(),
      settings
    });
  } else {
    res.status(400).json({
      status: 'error',
      message: 'Unsupported export format'
    });
  }
});

// @desc    Import settings
// @route   POST /api/admin/settings/import
// @access  Private/Admin
export const importSettings = asyncHandler(async (req, res) => {
  const { settings, overwrite = false } = req.body;
  const adminId = req.admin.id;
  
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({
      status: 'error',
      message: 'Settings array is required'
    });
  }
  
  try {
    let imported = 0;
    let skipped = 0;
    let errors_list = [];
    
    for (const setting of settings) {
      try {
        const { category, key, value, type, description, isPublic, isRequired, validation } = setting;
        
        if (!category || !key || value === undefined) {
          errors_list.push({
            setting,
            error: 'Missing required fields (category, key, value)'
          });
          continue;
        }
        
        // Check if setting exists
        const existingSetting = await Settings.findOne({ category, key });
        
        if (existingSetting && !overwrite) {
          skipped++;
          continue;
        }
        
        await Settings.setSetting(
          category,
          key,
          value,
          adminId,
          {
            type: type || 'string',
            description,
            isPublic: isPublic || false,
            isRequired: isRequired || false,
            validation
          }
        );
        
        imported++;
        
      } catch (error) {
        errors_list.push({
          setting,
          error: error.message
        });
      }
    }
    
    res.json({
      status: 'success',
      message: 'Settings import completed',
      data: {
        imported,
        skipped,
        errors: errors_list.length,
        errorDetails: errors_list
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
