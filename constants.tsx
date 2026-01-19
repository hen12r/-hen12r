
import React from 'react';
import { Gender, Occasion, Style, Budget, Weather, Outfit } from './types';

export const OUTFITS: Outfit[] = [
  // --- EXISTING OUTFITS (RETAINED & UPDATED) ---
  {
    id: 'm-cas-sim-30-1',
    name: 'Essential Amazon Hoodie',
    gender: Gender.MALE,
    occasion: Occasion.CASUAL,
    style: Style.SIMPLE,
    weather: Weather.MILD,
    budget: Budget.MEDIUM,
    brand: 'Amazon Essentials',
    store: 'Amazon',
    totalPrice: 34.99,
    explanation: 'A clean, high-quality essential hoodie that works with everything. Perfect for mild weather layering.',
    imageUrls: [
      'https://images.unsplash.com/photo-1578932750294-f5075e85f44a?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://amzn.eu/d/example-hoodie',
    items: [
      { name: 'Casual Hoodie', price: 34.99, category: 'Top', link: 'https://amzn.eu/d/example-hoodie' }
    ]
  },
  {
    id: 'm-sch-sim-30-1',
    name: 'Campus Basic',
    gender: Gender.MALE,
    occasion: Occasion.SCHOOL,
    style: Style.SIMPLE,
    weather: Weather.MILD,
    budget: Budget.LOW,
    brand: 'Amazon Basics',
    store: 'Amazon',
    totalPrice: 28,
    explanation: 'Essential white tee and charcoal chinos. The ultimate clean look for morning lectures.',
    imageUrls: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Crewneck Tee', price: 7, category: 'Top', link: '#' },
      { name: 'Slim Chinos', price: 15, category: 'Bottom', link: '#' },
      { name: 'Canvas Plimsolls', price: 6, category: 'Shoes', link: '#' }
    ]
  },

  // --- NEW AMAZON CURATIONS ---
  {
    id: 'f-wrk-sim-50-1',
    name: 'Amazon Executive Mini',
    gender: Gender.FEMALE,
    occasion: Occasion.WORK,
    style: Style.SIMPLE,
    weather: Weather.MILD,
    budget: Budget.MEDIUM,
    brand: 'Grace Karin',
    store: 'Amazon',
    totalPrice: 48.50,
    explanation: 'A sophisticated blazer and high-waisted trousers set. Sharp, professional, and breathable for the office.',
    imageUrls: [
      'https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://amzn.to/example-blazer',
    items: [
      { name: 'Structured Blazer', price: 28.50, category: 'Jacket', link: '#' },
      { name: 'Straight Trousers', price: 20.00, category: 'Bottom', link: '#' }
    ]
  },
  {
    id: 'm-cas-str-50-1',
    name: 'Amazon Street Tech',
    gender: Gender.MALE,
    occasion: Occasion.CASUAL,
    style: Style.STREET,
    weather: Weather.COLD,
    budget: Budget.MEDIUM,
    brand: 'Match',
    store: 'Amazon',
    totalPrice: 55.00,
    explanation: 'Heavyweight cargo joggers and a windproof bomber. Essential for urban exploration in cold weather.',
    imageUrls: [
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://amzn.to/example-cargo',
    items: [
      { name: 'Tech Joggers', price: 30.00, category: 'Bottom', link: '#' },
      { name: 'Bomber Jacket', price: 25.00, category: 'Jacket', link: '#' }
    ]
  },

  // --- NEW SHEIN CURATIONS ---
  {
    id: 'f-pty-cla-30-1',
    name: 'Shein Midnight Velvet',
    gender: Gender.FEMALE,
    occasion: Occasion.PARTY,
    style: Style.CLASSY,
    weather: Weather.MILD,
    budget: Budget.LOW,
    brand: 'SHEIN SXY',
    store: 'Shein',
    totalPrice: 22.99,
    explanation: 'Elegant velvet bodycon dress. A high-impact look for nights out that stays well under budget.',
    imageUrls: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://shein.top/example-velvet',
    items: [
      { name: 'Velvet Dress', price: 15.99, category: 'Top', link: '#' },
      { name: 'Hoop Earrings', price: 7.00, category: 'Accessory', link: '#' }
    ]
  },
  {
    id: 'm-wed-cla-100-1',
    name: 'Shein Summer Wedding',
    gender: Gender.MALE,
    occasion: Occasion.WEDDING,
    style: Style.CLASSY,
    weather: Weather.HOT,
    budget: Budget.HIGH,
    brand: 'SHEIN Men',
    store: 'Shein',
    totalPrice: 65.00,
    explanation: 'Linen blend suit jacket and matching shorts. Stay cool and formal during summer ceremonies.',
    imageUrls: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://shein.top/example-linen',
    items: [
      { name: 'Linen Blazer', price: 40.00, category: 'Jacket', link: '#' },
      { name: 'Linen Shorts', price: 25.00, category: 'Bottom', link: '#' }
    ]
  },
  {
    id: 'f-cas-str-50-2',
    name: 'Shein Cyber Street',
    gender: Gender.FEMALE,
    occasion: Occasion.CASUAL,
    style: Style.STREET,
    weather: Weather.MILD,
    budget: Budget.MEDIUM,
    brand: 'ROMWE',
    store: 'Shein',
    totalPrice: 42.00,
    explanation: 'Oversized graphic sweatshirt and wide-leg denim. The definitive Gen-Z casual aesthetic.',
    imageUrls: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://shein.top/example-street',
    items: [
      { name: 'Graphic Sweatshirt', price: 18.00, category: 'Top', link: '#' },
      { name: 'Wide Leg Jeans', price: 24.00, category: 'Bottom', link: '#' }
    ]
  },

  // --- NEW TEMU CURATIONS ---
  {
    id: 'm-sch-sim-30-2',
    name: 'Temu Campus Essentials',
    gender: Gender.MALE,
    occasion: Occasion.SCHOOL,
    style: Style.SIMPLE,
    weather: Weather.HOT,
    budget: Budget.LOW,
    brand: 'Temu Basics',
    store: 'Temu',
    totalPrice: 19.50,
    explanation: 'Breathable linen-look shirt and cotton shorts. Minimalist and ultra-affordable for long school days.',
    imageUrls: [
      'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://temu.to/m/example-linen',
    items: [
      { name: 'Summer Linen Shirt', price: 9.50, category: 'Top', link: '#' },
      { name: 'Canvas Shorts', price: 10.00, category: 'Bottom', link: '#' }
    ]
  },
  {
    id: 'f-cas-sim-30-3',
    name: 'Temu Garden Breeze',
    gender: Gender.FEMALE,
    occasion: Occasion.CASUAL,
    style: Style.SIMPLE,
    weather: Weather.HOT,
    budget: Budget.LOW,
    brand: 'Temu Fashion',
    store: 'Temu',
    totalPrice: 24.00,
    explanation: 'A floral sundress and woven straw hat. Classic summer silhouette optimized for extreme value.',
    imageUrls: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: 'https://temu.to/m/example-dress',
    items: [
      { name: 'Floral Sundress', price: 18.00, category: 'Top', link: '#' },
      { name: 'Straw Hat', price: 6.00, category: 'Accessory', link: '#' }
    ]
  },
  {
    id: 'm-wrk-sim-50-2',
    name: 'Temu Modern Office',
    gender: Gender.MALE,
    occasion: Occasion.WORK,
    style: Style.SIMPLE,
    weather: Weather.MILD,
    budget: Budget.MEDIUM,
    brand: 'Temu Men',
    store: 'Temu',
    totalPrice: 38.00,
    explanation: 'Stretch-fit polo and tapered slacks. The perfect entry-level professional wardrobe.',
    imageUrls: [
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Performance Polo', price: 15.00, category: 'Top', link: '#' },
      { name: 'Tapered Slacks', price: 23.00, category: 'Bottom', link: '#' }
    ]
  },

  // --- ADDITIONAL CURATIONS (VARIOUS) ---
  {
    id: 'f-sch-cla-50-1',
    name: 'Amazon Academic Core',
    gender: Gender.FEMALE,
    occasion: Occasion.SCHOOL,
    style: Style.CLASSY,
    weather: Weather.MILD,
    budget: Budget.MEDIUM,
    brand: 'Amazon Basics',
    store: 'Amazon',
    totalPrice: 45.00,
    explanation: 'Knit cardigan layered over a pleated skirt. The timeless dark academia look.',
    imageUrls: [
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Button Cardigan', price: 25.00, category: 'Top', link: '#' },
      { name: 'Pleated Skirt', price: 20.00, category: 'Bottom', link: '#' }
    ]
  },
  {
    id: 'm-pty-str-50-2',
    name: 'Shein Rave Ready',
    gender: Gender.MALE,
    occasion: Occasion.PARTY,
    style: Style.STREET,
    weather: Weather.HOT,
    budget: Budget.MEDIUM,
    brand: 'SHEIN VCAY',
    store: 'Shein',
    totalPrice: 32.00,
    explanation: 'Mesh tank top and oversized denim. High-fashion street vibes for summer parties.',
    imageUrls: [
      'https://images.unsplash.com/photo-1520975661595-6453be3f7070?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Mesh Tank', price: 12.00, category: 'Top', link: '#' },
      { name: 'Baggy Denim', price: 20.00, category: 'Bottom', link: '#' }
    ]
  },
  {
    id: 'f-wed-cla-100-2',
    name: 'Amazon Regal Guest',
    gender: Gender.FEMALE,
    occasion: Occasion.WEDDING,
    style: Style.CLASSY,
    weather: Weather.MILD,
    budget: Budget.HIGH,
    brand: 'Ever-Pretty',
    store: 'Amazon',
    totalPrice: 79.00,
    explanation: 'A floor-length chiffon dress with lace detailing. Sophisticated and high-quality for guest attire.',
    imageUrls: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Chiffon Gown', price: 79.00, category: 'Top', link: '#' }
    ]
  },
  {
    id: 'm-cas-sim-100-1',
    name: 'Amazon Wool Winter',
    gender: Gender.MALE,
    occasion: Occasion.CASUAL,
    style: Style.SIMPLE,
    weather: Weather.COLD,
    budget: Budget.HIGH,
    brand: 'Amazon Essentials',
    store: 'Amazon',
    totalPrice: 85.00,
    explanation: 'Heavy wool blend peacoat. A durable, classy investment for the winter season.',
    imageUrls: [
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Wool Peacoat', price: 85.00, category: 'Jacket', link: '#' }
    ]
  },
  {
    id: 'f-cas-str-30-4',
    name: 'Temu Street Cargo',
    gender: Gender.FEMALE,
    occasion: Occasion.CASUAL,
    style: Style.STREET,
    weather: Weather.MILD,
    budget: Budget.LOW,
    brand: 'Temu Style',
    store: 'Temu',
    totalPrice: 26.00,
    explanation: 'Baggy multi-pocket cargo pants and a tight crop top. The trending streetwear silhouette.',
    imageUrls: [
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Cargo Pants', price: 18.00, category: 'Bottom', link: '#' },
      { name: 'Ribbed Crop Top', price: 8.00, category: 'Top', link: '#' }
    ]
  },
  {
    id: 'm-sch-str-50-3',
    name: 'Shein Varsity Vibe',
    gender: Gender.MALE,
    occasion: Occasion.SCHOOL,
    style: Style.STREET,
    weather: Weather.COLD,
    budget: Budget.MEDIUM,
    brand: 'SHEIN EZwear',
    store: 'Shein',
    totalPrice: 44.00,
    explanation: 'Classic varsity jacket over a simple tee. High school/college cool at a fraction of the cost.',
    imageUrls: [
      'https://images.unsplash.com/photo-1543132220-4bf3de6e10ae?q=80&w=800&auto=format&fit=crop'
    ],
    affiliateLink: '#',
    items: [
      { name: 'Varsity Jacket', price: 32.00, category: 'Jacket', link: '#' },
      { name: 'Basic White Tee', price: 12.00, category: 'Top', link: '#' }
    ]
  }
];

export const ICONS = {
  Male: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Female: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Arrow: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Filter: (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  )
};
