export type Bookmark = { url: string; slug: string };

export const STORAGE_KEY = 'mona-bookmarks';
export const SEPARATOR = ' :: ';
const SLUG_PREFIX = 'mona-';
const SLUG_LENGTH = 4;
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Normalises user input to an absolute http(s) URL, or returns null if invalid. */
export function normalizeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw);
  try {
    const parsed = new URL(hasScheme ? raw : `https://${raw}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname;
    if (!host || (!host.includes('.') && host !== 'localhost')) return null;
    const bare = parsed.pathname === '/' && !parsed.search && !parsed.hash;
    return bare ? `${parsed.protocol}//${parsed.host}` : parsed.href;
  } catch {
    return null;
  }
}

export function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { url, slug } = value as Record<string, unknown>;
  return (
    typeof url === 'string' &&
    typeof slug === 'string' &&
    normalizeUrl(url) !== null &&
    /^mona-[0-9a-zA-Z]+$/.test(slug)
  );
}

/** Validates untrusted parsed data; keeps only well-formed {url, slug} entries. */
export function sanitizeBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Bookmark[] = [];
  for (const item of value) {
    if (!isBookmark(item) || seen.has(item.slug)) continue;
    seen.add(item.slug);
    result.push({ url: normalizeUrl(item.url) as string, slug: item.slug });
  }
  return result;
}

/** Parses a raw localStorage string; never throws. */
export function parseStoredBookmarks(raw: unknown): Bookmark[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    return sanitizeBookmarks(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function serializeBookmarks(bookmarks: Bookmark[]): string {
  return JSON.stringify(sanitizeBookmarks(bookmarks));
}

export function generateSlug(random: () => number = Math.random): string {
  let id = '';
  for (let i = 0; i < SLUG_LENGTH; i++) {
    id += BASE62[Math.min(BASE62.length - 1, Math.floor(random() * BASE62.length))];
  }
  return SLUG_PREFIX + id;
}

export function generateUniqueSlug(existing: Bookmark[], random: () => number = Math.random): string {
  const taken = new Set(existing.map((b) => b.slug));
  for (let i = 0; i < 100; i++) {
    const slug = generateSlug(random);
    if (!taken.has(slug)) return slug;
  }
  let n = 0;
  while (taken.has(`${SLUG_PREFIX}${n.toString(36)}`)) n++;
  return `${SLUG_PREFIX}${n.toString(36)}`;
}

export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}

/** Returns the new list, or null when the URL is invalid. Duplicate URLs are not re-added. */
export function addBookmark(
  existing: Bookmark[],
  input: unknown,
  random: () => number = Math.random,
): Bookmark[] | null {
  const url = normalizeUrl(input);
  if (!url) return null;
  if (existing.some((b) => b.url === url)) return existing;
  return [...existing, { url, slug: generateUniqueSlug(existing, random) }];
}
