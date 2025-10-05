import mongoose from 'mongoose';

// Contact Details Schema (equivalent to contact_details table)
const contactDetailsSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: false, // Made optional to handle cases where phone might be empty
    trim: true,
    default: ''
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  hours: {
    type: String,
    trim: true
  },
  emergencyContact: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// About Details Schema (equivalent to about_details table)
const aboutDetailsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  mission: {
    type: String,
    trim: true
  },
  vision: {
    type: String,
    trim: true
  },
  teamMembers: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    position: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    }
  }]
}, {
  timestamps: true
});

// Home Details Schema (equivalent to home_details table)
const homeDetailsSchema = new mongoose.Schema({
  heroTitle: {
    type: String,
    required: true,
    trim: true
  },
  heroSubtitle: {
    type: String,
    trim: true
  },
  heroDescription: {
    type: String,
    trim: true
  },
  aboutSection: {
    title: {
      type: String,
      trim: true
    },
    subtitle: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  },
  servicesSection: {
    title: {
      type: String,
      trim: true
    },
    subtitle: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true
});

// Social Links Schema (equivalent to social_links table)
const socialLinksSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    trim: true,
    enum: ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok']
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Property Details Schema (equivalent to property_details table)
const propertyDetailsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    seated: {
      type: Number,
      min: 0
    },
    standing: {
      type: Number,
      min: 0
    }
  },
  amenities: [{
    type: String,
    trim: true
  }],
  pricing: {
    basePrice: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    pricingNotes: {
      type: String,
      trim: true
    }
  },
  location: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['exterior', 'interior', 'ceremony', 'reception', 'gardens', 'amenities'],
      default: 'general'
    }
  }]
}, {
  timestamps: true
});

// Create models with overwrite protection
export const ContactDetails = mongoose.models.ContactDetails || mongoose.model('ContactDetails', contactDetailsSchema);
export const AboutDetails = mongoose.models.AboutDetails || mongoose.model('AboutDetails', aboutDetailsSchema);
export const HomeDetails = mongoose.models.HomeDetails || mongoose.model('HomeDetails', homeDetailsSchema);
export const SocialLinks = mongoose.models.SocialLinks || mongoose.model('SocialLinks', socialLinksSchema);
export const PropertyDetails = mongoose.models.PropertyDetails || mongoose.model('PropertyDetails', propertyDetailsSchema);