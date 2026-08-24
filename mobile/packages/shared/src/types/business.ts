export interface BusinessIdentity {
  id: string;
  name: string;
  type: 'restaurant' | 'stay' | 'rental' | 'trip' | 'shop' | 'bar' | 'beauty' | 'service';
  primaryColor: string;
  gradientStart: string;
  gradientEnd: string;
  accentColor: string;
  logo: string;
  verified: boolean;
}

export const BUSINESSES: BusinessIdentity[] = [
  {
    id: 'cajori',
    name: 'Cajori Restaurant',
    type: 'restaurant',
    primaryColor: '#C1272D',
    gradientStart: '#5E0E12',
    gradientEnd: '#C1272D',
    accentColor: '#E5484D',
    logo: '\ud83e\udd90',
    verified: true,
  },
  {
    id: 'baobab',
    name: 'Baobab Kitchen',
    type: 'restaurant',
    primaryColor: '#B45309',
    gradientStart: '#5F2E08',
    gradientEnd: '#D97706',
    accentColor: '#F59E0B',
    logo: '\ud83c\udf72',
    verified: true,
  },
  {
    id: 'mamas',
    name: "Mama's Pizza",
    type: 'restaurant',
    primaryColor: '#EA580C',
    gradientStart: '#6B2306',
    gradientEnd: '#F97316',
    accentColor: '#FB923C',
    logo: '\ud83c\udf55',
    verified: true,
  },
  {
    id: 'flame',
    name: 'Kruger Flame Grill',
    type: 'restaurant',
    primaryColor: '#0F766E',
    gradientStart: '#083B37',
    gradientEnd: '#0D9488',
    accentColor: '#14B8A6',
    logo: '\ud83e\udd69',
    verified: false,
  },
  {
    id: 'coop',
    name: 'The Coop',
    type: 'restaurant',
    primaryColor: '#CA8A04',
    gradientStart: '#6B4A05',
    gradientEnd: '#EAB308',
    accentColor: '#FACC15',
    logo: '\ud83c\udf57',
    verified: false,
  },
  {
    id: 'cu',
    name: 'CU Guesthouse',
    type: 'stay',
    primaryColor: '#0E9488',
    gradientStart: '#083B37',
    gradientEnd: '#14B8A6',
    accentColor: '#2DD4BF',
    logo: '\ud83d\udcde',
    verified: true,
  },
  {
    id: 'phlodge',
    name: 'Phalaborwa Lodge',
    type: 'stay',
    primaryColor: '#B45309',
    gradientStart: '#4A2A06',
    gradientEnd: '#B45309',
    accentColor: '#D97706',
    logo: '\ud83c\udf3f',
    verified: true,
  },
  {
    id: 'bheights',
    name: 'Baobab Heights',
    type: 'rental',
    primaryColor: '#4F46E5',
    gradientStart: '#1E1B4B',
    gradientEnd: '#6366F1',
    accentColor: '#818CF8',
    logo: '\ud83c\udfe2',
    verified: false,
  },
  {
    id: 'krugategate',
    name: 'Kruger Gate Hotel',
    type: 'stay',
    primaryColor: '#166534',
    gradientStart: '#052E16',
    gradientEnd: '#16A34A',
    accentColor: '#22C55E',
    logo: '\ud83c\udfe5',
    verified: true,
  },
  {
    id: 'marula',
    name: 'Marula B&B',
    type: 'stay',
    primaryColor: '#9333EA',
    gradientStart: '#3B0764',
    gradientEnd: '#A855F7',
    accentColor: '#C084FC',
    logo: '\ud83c\udfe1',
    verified: true,
  },
];

export function getBusinessById(id: string): BusinessIdentity | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

export function getBusinessesByType(type: BusinessIdentity['type']): BusinessIdentity[] {
  return BUSINESSES.filter((b) => b.type === type);
}
