
export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum Occasion {
  SCHOOL = 'School',
  WORK = 'Work',
  PARTY = 'Party/Outing',
  WEDDING = 'Wedding',
  CASUAL = 'Casual'
}

export enum Style {
  SIMPLE = 'Simple',
  STREET = 'Street',
  CLASSY = 'Classy'
}

export enum Weather {
  HOT = 'Hot',
  COLD = 'Cold',
  MILD = 'Mild'
}

export type Budget = number;

export const Budget = {
  LOW: 30,
  MEDIUM: 50,
  HIGH: 100
} as const;

export interface User {
  id: string;
  email: string;
  isPro: boolean;
  name?: string;
  photosUsed: number;
  emailNotifications?: boolean;
  preferredOccasion?: Occasion;
  preferredBudget?: number;
}

export interface OutfitItem {
  name: string;
  price: number;
  category: 'Top' | 'Bottom' | 'Shoes' | 'Accessory' | 'Jacket';
  link: string;
}

export interface Outfit {
  id: string;
  name: string;
  gender: Gender;
  occasion: Occasion;
  style: Style;
  weather: Weather;
  budget: Budget;
  brand: string;
  store: string;
  items: OutfitItem[];
  totalPrice: number;
  explanation: string;
  imageUrls: string[]; 
  affiliateLink: string;
}

export type AppStep = 
  | 'welcome' 
  | 'auth' 
  | 'onboarding' 
  | 'discovery' 
  | 'gender' 
  | 'occasion' 
  | 'style' 
  | 'weather' 
  | 'budget' 
  | 'results' 
  | 'details' 
  | 'ai-mentor' 
  | 'virtual-mirror' 
  | 'subscription' 
  | 'profile' 
  | 'paywall' 
  | 'admin' 
  | 'monthly-preview' 
  | 'visual-scan'
  | 'how-it-works';
