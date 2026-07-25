export type CategoryId = 'history' | 'culture' | 'nature' | 'architecture' | 'legends' | 'people' | 'general';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: 'general', label: 'Surprise Me', icon: '✨' },
  { id: 'history', label: 'History', icon: '🏛️' },
  { id: 'culture', label: 'Culture & Traditions', icon: '🎭' },
  { id: 'nature', label: 'Nature & Geology', icon: '🌿' },
  { id: 'architecture', label: 'Architecture', icon: '🏗️' },
  { id: 'legends', label: 'Legends & Folklore', icon: '🌙' },
  { id: 'people', label: 'Notable People', icon: '👤' },
];
