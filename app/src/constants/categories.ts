import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type CategoryId = 'history' | 'culture' | 'nature' | 'architecture' | 'legends' | 'people' | 'general';
export type CategorySelection = CategoryId | 'all';

export interface Category {
  id: CategorySelection;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

// The filterable categories — used both as story-mode topics and as filter
// chips over the nearby-articles list in wiki mode. 'general' (Surprise Me)
// is intentionally excluded: it's a dedicated action button, not a filter.
export const CATEGORIES: Category[] = [
  { id: 'history', label: 'History', icon: 'time-outline' },
  { id: 'culture', label: 'Culture', icon: 'color-palette-outline' },
  { id: 'nature', label: 'Nature', icon: 'leaf-outline' },
  { id: 'architecture', label: 'Architecture', icon: 'business-outline' },
  { id: 'legends', label: 'Legends', icon: 'moon-outline' },
  { id: 'people', label: 'People', icon: 'person-outline' },
];

export const ALL_CATEGORY: Category = { id: 'all', label: 'All', icon: 'apps-outline' };
