export type CategoryId = 'history' | 'culture' | 'nature' | 'architecture' | 'legends' | 'people';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'culture', label: 'Culture & Traditions', icon: '🎭' },
  { id: 'nature', label: 'Nature & Geology', icon: '🌿' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'legends', label: 'Legends & Folklore', icon: '🌙' },
  { id: 'people', label: 'Notable People', icon: '👤' },
];
