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

/**
 * Replaces http(s) spans in stream preview text with host + trimmed path (no fetch).
 * Full `text` stays in storage and read sheet; list rows use this for calmer scanning.
 */
export function replaceHttpUrlsWithCompactDisplay(text: string): string {
  if (!text) {
    return text;
  }
  return text.replace(HTTP_URL_IN_TEXT_RE, (raw) => compactHttpUrlForStream(raw));
}

function compactHttpUrlForStream(match: string): string {
  const cleaned = stripLooseTrailingPunctuation(match.trim());
  if (!isValidHttpUrl(cleaned)) {
    return match;
  }
  try {
    const u = new URL(cleaned);
    let host = u.hostname;
    if (host.toLowerCase().startsWith('www.')) {
      host = host.slice(4);
    }
    if (u.port) {
      host = `${host}:${u.port}`;
    }
    let tail = `${u.pathname}${u.search}${u.hash}`;
    if (tail === '/' || tail === '') {
      return host;
    }
    if (tail.length > 40) {
      tail = `${tail.slice(0, 37)}…`;
    }
    return `${host}${tail}`;
  } catch {
    return match;
  }
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
