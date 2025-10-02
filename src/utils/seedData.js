import {
  ContactDetails,
  AboutDetails,
  HomeDetails,
  SocialLinks,
  PropertyDetails,
  Review
} from '../models/Content.js';

export const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Seed Contact Details
    await ContactDetails.deleteMany({});
    await ContactDetails.create({
      phone: '(561) 376-2855',
      email: 'contact@thewhitebarnfl.com',
      address: '4680 SW 148th Ave, Fort Lauderdale, FL 33330',
      hours: 'Mon - Fri: 9:00 AM - 6:00 PM, Sat - Sun: By Appointment',
      emergencyContact: '954-324-1474'
    });

    // Seed About Details
    await AboutDetails.deleteMany({});
    await AboutDetails.create({
      title: 'About The White Barn FL',
      subtitle: 'Your Dream Venue Awaits',
      description: 'The White Barn FL is a premier wedding and event venue located in the heart of Southwest Ranches, Florida. Our family-owned business sits on 4.95 acres of botanical paradise, featuring colorful gardens with lush, beautiful flowers and trees that create the perfect backdrop for your special day.',
      mission: 'At The White Barn FL, our mission is to provide an exceptional venue experience that exceeds your expectations. We are committed to helping you create beautiful, memorable events in our stunning natural setting.',
      vision: 'To be the premier destination for unforgettable celebrations in South Florida, where natural beauty meets exceptional service.',
      teamMembers: [
        {
          name: 'Gina Rodriguez',
          position: 'Event Coordinator',
          bio: 'Working alongside Mike, Gina ensures that every event at The White Barn FL is unique and enchanting, providing visitors with unforgettable experiences in a beautifully serene setting.',
          image: '/images/event-1.jpg'
        }
      ]
    });

    // Seed Home Details
    await HomeDetails.deleteMany({});
    await HomeDetails.create({
      heroTitle: 'Welcome to The White Barn FL',
      heroSubtitle: 'Your Perfect Day, Our Beautiful Space',
      heroDescription: 'No matter your dreams, we are here to help you create the perfect event at our venue.',
      aboutSection: {
        title: 'Host Your Beautiful Event with Us',
        subtitle: 'WELCOME TO THE WHITE BARN FL',
        description: 'A family-owned business with 4.95 acres of botanical paradise immersed with colorful gardens with lush beautiful flowers and trees, in the heart of the equestrian town of sw ranches.'
      },
      servicesSection: {
        title: 'Create Unforgettable Moments at Our Venue',
        subtitle: 'WEDDING SERVICES FOR YOU',
        description: 'Your Perfect Day, Our Beautiful Space'
      }
    });

    // Seed Social Links
    await SocialLinks.deleteMany({});
    await SocialLinks.create([
      {
        platform: 'facebook',
        url: 'https://www.facebook.com/thewhitebarnfl',
        isActive: true
      },
      {
        platform: 'instagram',
        url: 'https://www.instagram.com/thewhitebarnfl',
        isActive: true
      }
    ]);

    // Seed Property Details
    await PropertyDetails.deleteMany({});
    await PropertyDetails.create({
      name: 'The White Barn FL',
      description: 'A stunning 4.95-acre botanical paradise perfect for weddings and special events. Our venue combines natural beauty with elegant facilities to create the perfect setting for your celebration.',
      capacity: {
        seated: 150,
        standing: 200
      },
      amenities: [
        'Botanical Gardens',
        'Indoor Plant Showroom',
        'Bridal Suite',
        'Catering Kitchen',
        'Parking Area',
        'Ceremony Space',
        'Reception Hall',
        'Photography Areas'
      ],
      pricing: {
        basePrice: 2500,
        currency: 'USD',
        pricingNotes: 'Base price includes venue rental for 8 hours. Additional services available.'
      },
      location: {
        address: '4680 SW 148th Ave',
        city: 'Fort Lauderdale',
        state: 'FL',
        zipCode: '33330',
        coordinates: {
          latitude: 26.0112,
          longitude: -80.2711
        }
      },
      images: [
        {
          url: '/images/frontimg.jpg',
          alt: 'Main venue exterior',
          category: 'exterior'
        },
        {
          url: '/images/frontimg2.jpg',
          alt: 'Garden view',
          category: 'gardens'
        }
      ]
    });

    // Seed Sample Reviews
    await Review.deleteMany({});
    await Review.create([
      {
        clientName: 'Sarah & Michael Johnson',
        eventType: 'wedding',
        eventDate: new Date('2024-06-15'),
        rating: 5,
        title: 'Perfect Wedding Venue!',
        review: 'The White Barn FL exceeded all our expectations! The botanical gardens provided the most beautiful backdrop for our ceremony, and the staff was incredibly helpful throughout the planning process. Our guests are still talking about how gorgeous the venue was.',
        isApproved: true,
        isFeatured: true,
        clientEmail: 'sarah.johnson@email.com'
      },
      {
        clientName: 'Jennifer & David Martinez',
        eventType: 'wedding',
        eventDate: new Date('2024-08-20'),
        rating: 5,
        title: 'Magical Experience',
        review: 'From the moment we visited The White Barn FL, we knew it was the perfect place for our wedding. The natural beauty of the gardens combined with the elegant facilities made our day absolutely magical. Highly recommend!',
        isApproved: true,
        isFeatured: true,
        clientEmail: 'jennifer.martinez@email.com'
      },
      {
        clientName: 'Corporate Events Inc.',
        eventType: 'corporate',
        eventDate: new Date('2024-09-10'),
        rating: 4,
        title: 'Great Corporate Event Venue',
        review: 'We hosted our annual company retreat at The White Barn FL and it was fantastic. The unique setting provided a refreshing change from typical corporate venues, and our team loved the beautiful surroundings.',
        isApproved: true,
        isFeatured: false,
        clientEmail: 'events@corporateevents.com'
      }
    ]);

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};
