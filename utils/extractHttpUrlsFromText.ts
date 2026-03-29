/**
 * Pulls http(s) URLs from free-form thought text for the read sheet “Open” action.
 * Conservative: no preview fetching; list/stream use plain text only.
 */

const HTTP_URL_IN_TEXT_RE = /https?:\/\/[^\s<>[\](){}"]+/gi;

function stripLooseTrailingPunctuation(s: string): string {
  return s.replace(/[.,;:!?)]+$/g, '');
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Unique URLs in first-seen order. Trims common trailing punctuation from matches.
 */
export function extractHttpUrlsFromText(text: string): string[] {
  if (!text.trim()) {
    return [];
  }
  const raw = text.match(HTTP_URL_IN_TEXT_RE) ?? [];
  const cleaned = raw
    .map((m) => stripLooseTrailingPunctuation(m.trim()))
    .filter((s) => s.length > 0 && isValidHttpUrl(s));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of cleaned) {
    const k = u.toLowerCase();
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(u);
  }
  return out;
}

/** Host for subtle read-sheet metadata (e.g. `wikipedia.org`). */
export function displayHostForUrl(urlString: string): string | null {
  try {
    const u = new URL(urlString);
    let h = u.hostname;
    if (h.toLowerCase().startsWith('www.')) {
      h = h.slice(4);
    }
    return h || null;
  } catch {
    return null;
  }
}
