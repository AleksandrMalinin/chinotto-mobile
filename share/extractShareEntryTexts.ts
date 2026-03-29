import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

function shouldSavePayload(payload: ResolvedSharePayload): boolean {
  if (payload.shareType === 'text' || payload.shareType === 'url') {
    return true;
  }
  return payload.contentType === 'website';
}

function mayIncludeOriginalName(p: ResolvedSharePayload): boolean {
  if (p.shareType === 'url') {
    return true;
  }
  return p.contentType === 'website';
}

function isProbablyUrl(s: string): boolean {
  const t = s.trim();
  if (!/^https?:\/\//i.test(t)) {
    return false;
  }
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return true;
  }
}

function isRedundantOriginalName(name: string, urlString: string): boolean {
  try {
    const u = new URL(urlString);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    if (!seg) {
      return false;
    }
    const decoded = decodeURIComponent(seg);
    if (name === seg || name === decoded) {
      return true;
    }
    // Safari often sets `originalName` to a suggested filename like `Article_Title.html` while
    // the real URL path is `.../Article_Title` (no extension) — not equal to the segment above.
    const nameWithoutHtml = name.replace(/\.html?$/i, '');
    if (nameWithoutHtml !== name && (nameWithoutHtml === seg || nameWithoutHtml === decoded)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function urlHintForPayload(p: ResolvedSharePayload): string {
  const value = (p.value ?? '').trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const uri = (p.contentUri ?? '').trim();
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }
  return '';
}

/**
 * Collects human-readable fragments from one resolved payload (title, body, URL).
 */
function collectPartsFromResolvedPayload(p: ResolvedSharePayload): string[] {
  if (!shouldSavePayload(p)) {
    return [];
  }
  const parts: string[] = [];
  const value = (p.value ?? '').trim();
  const uri = (p.contentUri ?? '').trim();
  const hint = urlHintForPayload(p);

  const on = (p.originalName ?? '').trim();
  if (on && mayIncludeOriginalName(p) && (!hint || !isRedundantOriginalName(on, hint))) {
    parts.push(on);
  }
  if (value) {
    parts.push(value);
  }
  if (uri && uri !== value) {
    parts.push(uri);
  }
  return parts;
}

function dedupePreserveOrder(strings: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of strings) {
    const t = s.trim();
    if (!t) {
      continue;
    }
    const k = t.toLowerCase();
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Body text first, then URLs — readable when a page shares title + link. */
function orderPartsForCapture(parts: string[]): string[] {
  const nonUrls: string[] = [];
  const urls: string[] = [];
  for (const p of parts) {
    if (isProbablyUrl(p)) {
      urls.push(p);
    } else {
      nonUrls.push(p);
    }
  }
  return [...nonUrls, ...urls];
}

function finalizeCaptureText(parts: string[]): string | null {
  const deduped = dedupePreserveOrder(parts);
  if (deduped.length === 0) {
    return null;
  }
  return orderPartsForCapture(deduped).join('\n\n');
}

function buildFromResolvedPayloads(payloads: ResolvedSharePayload[]): string | null {
  const flat: string[] = [];
  for (const p of payloads) {
    flat.push(...collectPartsFromResolvedPayload(p));
  }
  return finalizeCaptureText(flat);
}

function buildFromRawPayloads(payloads: SharePayload[]): string | null {
  const flat: string[] = [];
  for (const p of payloads) {
    if (p.shareType !== 'text' && p.shareType !== 'url') {
      continue;
    }
    const v = (p.value ?? '').trim();
    if (v) {
      flat.push(v);
    }
  }
  return finalizeCaptureText(flat);
}

/**
 * One incoming share intent → one capture string (newline-separated blocks).
 * Prefer resolved payloads; fall back to raw when resolution failed or returned nothing.
 */
export function composeIncomingShareCaptureText(
  resolved: ResolvedSharePayload[],
  raw: SharePayload[]
): string | null {
  const fromResolved = buildFromResolvedPayloads(resolved);
  if (fromResolved) {
    return fromResolved;
  }
  return buildFromRawPayloads(raw);
}
