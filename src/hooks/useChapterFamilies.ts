import { useChapterSetting } from '@/hooks/useChapterSettings';

/** Used when the president has not saved a custom family list yet. */
export const DEFAULT_CHAPTER_FAMILIES = ['Baggio', 'Corleone', 'Conway', 'Sinatra', 'Conrad'];

function cleanedFamilyNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

/** Defaults plus every family the president saved under custom_families. */
export function chapterFamilyOptions(saved: unknown): string[] {
  const merged = [...DEFAULT_CHAPTER_FAMILIES];
  for (const name of cleanedFamilyNames(saved)) {
    const alreadyListed = merged.some((existing) => existing.toLowerCase() === name.toLowerCase());
    if (!alreadyListed) merged.push(name);
  }
  return merged;
}

export function useChapterFamilies() {
  const query = useChapterSetting<string[]>('custom_families', {
    whenMissing: [],
  });

  return {
    ...query,
    families: chapterFamilyOptions(query.data),
  };
}
