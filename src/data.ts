import type { Tint, Tone } from './theme';

// Sample data for the prototype; replace with real storage later.

export type ArtKey = 'apple' | 'capsule' | 'house' | 'pump' | 'jar' | 'add';

export type Category = {
  id: string;
  tint: Tint;
  name: string;
  sub: string;
  status?: { label: string; tone: Tone };
  art: ArtKey;
};

export const categories: Category[] = [
  { id: 'food', tint: 'food', name: 'Food', sub: '12 items', status: { label: '2 expiring', tone: 'amber' }, art: 'apple' },
  { id: 'medicine', tint: 'medicine', name: 'Medicine', sub: '5 items', status: { label: 'All good', tone: 'green' }, art: 'capsule' },
  { id: 'household', tint: 'household', name: 'Household', sub: '8 items', status: { label: 'All good', tone: 'green' }, art: 'house' },
  { id: 'skincare', tint: 'skincare', name: 'Skincare', sub: '4 items', status: { label: 'All good', tone: 'green' }, art: 'pump' },
  { id: 'pantry', tint: 'pantry', name: 'Pantry', sub: '6 items', status: { label: 'All good', tone: 'green' }, art: 'jar' },
  { id: 'add', tint: 'add', name: 'Add category', sub: 'Customize', art: 'add' },
];

export type UpcomingItem = {
  id: string;
  title: string;
  sub: string[];
  pill: string;
  tone: Tone;
  art: 'milk' | 'pill' | 'bread';
};

export const upcoming: UpcomingItem[] = [
  { id: 'oat', title: 'Oat milk', sub: ['Food', 'Expires tomorrow'], pill: '1 day', tone: 'amber', art: 'milk' },
  { id: 'ibu', title: 'Ibuprofen', sub: ['Medicine', 'Expires in 3 days'], pill: '3 days', tone: 'green', art: 'pill' },
  { id: 'bread', title: 'Bread', sub: ['Food', 'Expires in 5 days'], pill: '5 days', tone: 'green', art: 'bread' },
];
