import type { CategoryId } from '@/constants/categories';

// Mirrors the server's keyword matching (server/src/services/wikipedia.ts) so the
// nearby-articles list can be filtered by category instantly, client-side, without
// a round trip — the article list already carries enough text (title + snippet) to
// match against.
const CATEGORY_KEYWORDS: Record<Exclude<CategoryId, 'general'>, string[]> = {
  history: ['history', 'historic', 'founded', 'war', 'battle', 'century', 'established', 'colonial', 'ancient'],
  culture: ['culture', 'festival', 'tradition', 'cuisine', 'music', 'art', 'religion', 'community', 'custom'],
  nature: ['park', 'river', 'mountain', 'lake', 'forest', 'wildlife', 'geology', 'reserve', 'nature', 'species', 'coast'],
  architecture: ['building', 'architecture', 'tower', 'bridge', 'cathedral', 'designed', 'constructed', 'landmark', 'monument'],
  legends: ['legend', 'myth', 'folklore', 'ghost', 'haunted', 'supernatural', 'tale'],
  people: ['born', 'died', 'politician', 'artist', 'writer', 'athlete', 'musician', 'actor', 'scientist'],
  attractions: ['attraction', 'landmark', 'tourist', 'scenic', 'viewpoint', 'lookout', 'overlook', 'vista', 'sightseeing', 'must-see'],
};

export function matchesCategory(text: string, category: CategoryId): boolean {
  if (category === 'general') return false;
  const lower = text.toLowerCase();
  return CATEGORY_KEYWORDS[category].some((keyword) => lower.includes(keyword));
}
