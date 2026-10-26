import type { Tint, Tone } from './theme';

// Sample categories for the prototype. Items live in src/items.tsx.

export type ArtKey = 'apple' | 'capsule' | 'house' | 'pump' | 'jar' | 'add';

export type Category = {
  id: string;
  tint: Tint;
  name: string;
  sub?: string;
  // Sample item count; items added in the app are counted on top.
  count?: number;
  status?: { label: string; tone: Tone };
  art: ArtKey;
};

export const categories: Category[] = [
  { id: 'food', tint: 'food', name: 'Food', sub: '12 items', count: 12, status: { label: '2 expiring', tone: 'amber' }, art: 'apple' },
  { id: 'medicine', tint: 'medicine', name: 'Medicine', sub: '5 items', count: 5, status: { label: 'All good', tone: 'green' }, art: 'capsule' },
  { id: 'household', tint: 'household', name: 'Household', sub: '8 items', count: 8, status: { label: 'All good', tone: 'green' }, art: 'house' },
  { id: 'skincare', tint: 'skincare', name: 'Skincare', sub: '4 items', count: 4, status: { label: 'All good', tone: 'green' }, art: 'pump' },
  { id: 'pantry', tint: 'pantry', name: 'Pantry', sub: '6 items', count: 6, status: { label: 'All good', tone: 'green' }, art: 'jar' },
  { id: 'add', tint: 'add', name: 'Add category', art: 'add' },
];
