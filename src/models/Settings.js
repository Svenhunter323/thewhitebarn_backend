import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'email', 'security', 'notifications', 'backup', 'analytics'],
    index: true
  },
  key: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  description: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    options: [String]
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Compound index for category and key
settingsSchema.index({ category: 1, key: 1 }, { unique: true });

// Static method to get settings by category
settingsSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category }).lean();
  const result = {};
  
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  
  return result;
};

// Static method to get all settings grouped by category
settingsSchema.statics.getAllGrouped = async function() {
  const settings = await this.find().lean();
  const result = {};
  
  settings.forEach(setting => {
    if (!result[setting.category]) {
      result[setting.category] = {};
    }
    result[setting.category][setting.key] = {
      value: setting.value,
      type: setting.type,
      description: setting.description,
      isPublic: setting.isPublic,
      isRequired: setting.isRequired,
      validation: setting.validation,
      updatedAt: setting.updatedAt
    };
  });
  
  return result;
};

// Static method to update or create setting
settingsSchema.statics.setSetting = async function(category, key, value, adminId, options = {}) {
  const { type = 'string', description, isPublic = false, isRequired = false, validation } = options;
  
  return this.findOneAndUpdate(
    { category, key },
    {
      value,
      type,
      description,
      isPublic,
      isRequired,
      validation,
      lastModifiedBy: adminId
    },
    { upsert: true, new: true }
  );
};

// Static method to get public settings (for frontend)
settingsSchema.statics.getPublicSettings = async function() {
  const settings = await this.find({ isPublic: true }).lean();
  const result = {};
  
  settings.forEach(setting => {
    if (!result[setting.category]) {
      result[setting.category] = {};
    }
    result[setting.category][setting.key] = setting.value;
  });
  
  return result;
};

// Method to validate setting value
settingsSchema.methods.validateValue = function(value) {
  const { validation, type } = this;
  
  if (!validation) return { isValid: true };
  
  // Type validation
  if (type === 'number' && typeof value !== 'number') {
    return { isValid: false, error: 'Value must be a number' };
  }
  
  if (type === 'boolean' && typeof value !== 'boolean') {
    return { isValid: false, error: 'Value must be a boolean' };
  }
  
  // Range validation for numbers
  if (type === 'number') {
    if (validation.min !== undefined && value < validation.min) {
      return { isValid: false, error: `Value must be at least ${validation.min}` };
    }
    if (validation.max !== undefined && value > validation.max) {
      return { isValid: false, error: `Value must be at most ${validation.max}` };
    }
  }
  
  // Pattern validation for strings
  if (type === 'string' && validation.pattern) {
    const regex = new RegExp(validation.pattern);
    if (!regex.test(value)) {
      return { isValid: false, error: 'Value does not match required pattern' };
    }
  }
  
  // Options validation
  if (validation.options && !validation.options.includes(value)) {
    return { isValid: false, error: `Value must be one of: ${validation.options.join(', ')}` };
  }
  
  return { isValid: true };
};

// Default settings data
export const defaultSettings = {
  general: {
    siteName: {
      value: 'The White Barn FL',
      type: 'string',
      description: 'Website name',
      isPublic: true,
      isRequired: true
    },
    siteDescription: {
      value: 'Premier wedding and event venue in Fort Lauderdale',
      type: 'string',
      description: 'Website description',
      isPublic: true
    },
    contactEmail: {
      value: 'info@thewhitebarnfl.com',
      type: 'string',
      description: 'Primary contact email',
      isPublic: true,
      isRequired: true,
      validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
    },
    contactPhone: {
      value: '(954) 123-4567',
      type: 'string',
      description: 'Primary contact phone',
      isPublic: true
    },
    address: {
      value: '4680 SW 148th Ave, Fort Lauderdale, FL 33330',
      type: 'string',
      description: 'Business address',
      isPublic: true,
      isRequired: true
    },
    timezone: {
      value: 'America/New_York',
      type: 'string',
      description: 'Website timezone',
      validation: { 
        options: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'] 
      }
    }
  },
  email: {
    smtpHost: {
      value: 'smtpout.asia.secureserver.net',
      type: 'string',
      description: 'SMTP server host',
      isRequired: true
    },
    smtpPort: {
      value: 465,
      type: 'number',
      description: 'SMTP server port',
      isRequired: true,
      validation: { min: 1, max: 65535 }
    },
    smtpUsername: {
      value: 'info@thewhitebarnfl.com',
      type: 'string',
      description: 'SMTP username',
      isRequired: true
    },
    smtpPassword: {
      value: '',
      type: 'string',
      description: 'SMTP password',
      isRequired: true
    },
    fromEmail: {
      value: 'info@thewhitebarnfl.com',
      type: 'string',
      description: 'From email address',
      isRequired: true,
      validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
    },
    fromName: {
      value: 'The White Barn FL',
      type: 'string',
      description: 'From name',
      isRequired: true
    }
  },
  security: {
    enableTwoFactor: {
      value: false,
      type: 'boolean',
      description: 'Enable two-factor authentication'
    },
    sessionTimeout: {
      value: 30,
      type: 'number',
      description: 'Session timeout in minutes',
      validation: { min: 5, max: 1440 }
    },
    maxLoginAttempts: {
      value: 5,
      type: 'number',
      description: 'Maximum login attempts before lockout',
      validation: { min: 3, max: 10 }
    },
    passwordMinLength: {
      value: 8,
      type: 'number',
      description: 'Minimum password length',
      validation: { min: 6, max: 50 }
    },
    requireSpecialChars: {
      value: true,
      type: 'boolean',
      description: 'Require special characters in passwords'
    }
  },
  notifications: {
    emailNotifications: {
      value: true,
      type: 'boolean',
      description: 'Enable email notifications'
    },
    contactFormAlerts: {
      value: true,
      type: 'boolean',
      description: 'Send alerts for new contact forms'
    },
    reviewAlerts: {
      value: true,
      type: 'boolean',
      description: 'Send alerts for new reviews'
    },
    systemAlerts: {
      value: true,
      type: 'boolean',
      description: 'Send system alerts'
    },
    weeklyReports: {
      value: false,
      type: 'boolean',
      description: 'Send weekly analytics reports'
    }
  },
  backup: {
    autoBackup: {
      value: false,
      type: 'boolean',
      description: 'Enable automatic backups'
    },
    backupFrequency: {
      value: 'weekly',
      type: 'string',
      description: 'Backup frequency',
      validation: { options: ['daily', 'weekly', 'monthly'] }
    },
    backupRetention: {
      value: 30,
      type: 'number',
      description: 'Backup retention in days',
      validation: { min: 7, max: 365 }
    }
  },
  analytics: {
    enableTracking: {
      value: true,
      type: 'boolean',
      description: 'Enable analytics tracking',
      isPublic: true
    },
    trackingCode: {
      value: '',
      type: 'string',
      description: 'Google Analytics tracking code'
    },
    enableHeatmaps: {
      value: false,
      type: 'boolean',
      description: 'Enable heatmap tracking'
    }
  }
};

// Prevent model overwrite error
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
