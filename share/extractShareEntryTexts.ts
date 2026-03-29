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

/**
 * Safari / WebKit often puts suggested save names in `value` or `originalName`:
 * `www.site.html`, `cmux.com.html`, etc. — never treat as thought text.
 */
function isShareFilenameArtifact(s: string): boolean {
  const t = s.trim();
  if (!t || /\s/.test(t) || /[()[\]]/.test(t) || isProbablyUrl(t)) {
    return false;
  }
  if (!/\.html?$/i.test(t)) {
    return false;
  }
  if (/^www\.[a-z0-9.-]+\.html?$/i.test(t)) {
    return true;
  }
  /** `domain.tld.html` (e.g. cmux.com.html) — not a sentence, not a URL. */
  if (/^([a-z0-9-]+\.)+[a-z]{2,}\.html?$/i.test(t)) {
    return true;
  }
  return false;
}

/** Slug-like `page.html` with no spaces (technical filename, not a note). */
function isBareHtmlFilenameArtifact(s: string): boolean {
  const t = s.trim();
  if (!/\.html?$/i.test(t) || /\s/.test(t) || /[()[\]]/.test(t)) {
    return false;
  }
  return /^[a-z0-9._-]+\.html?$/i.test(t);
}

function isHtmlFilenameArtifact(s: string): boolean {
  return isShareFilenameArtifact(s) || isBareHtmlFilenameArtifact(s);
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
  if (
    on &&
    mayIncludeOriginalName(p) &&
    !isShareFilenameArtifact(on) &&
    !isBareHtmlFilenameArtifact(on) &&
    (!hint || !isRedundantOriginalName(on, hint))
  ) {
    parts.push(on);
  }
  if (value && !isShareFilenameArtifact(value)) {
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

/** Whole-string markdown link `[text](url)` → atomic pieces for deduping. */
function atomicizePart(s: string): string[] {
  const t = s.trim();
  const m = /^\[([^\]]*)\]\((https?:[^)\s]+)\)\s*$/i.exec(t);
  if (!m) {
    return [t];
  }
  const linkText = m[1].trim();
  const url = m[2].trim();
  if (!url) {
    return linkText ? [linkText] : [];
  }
  if (
    !linkText ||
    linkText.toLowerCase() === url.toLowerCase() ||
    isHtmlFilenameArtifact(linkText)
  ) {
    return [url];
  }
  return [linkText, url];
}

function urlIdentityKey(u: string): string {
  try {
    const x = new URL(u.trim());
    const host = x.hostname.replace(/^www\./i, '').toLowerCase();
    const path = x.pathname.replace(/\/$/, '') || '';
    return `${host}${path.toLowerCase()}`;
  } catch {
    return u.trim().toLowerCase();
  }
}

function dedupeUrlsPreserveOrder(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u.trim();
    if (!t) {
      continue;
    }
    const k = urlIdentityKey(t);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    out.push(t);
  }
  return out;
}

function hostWithoutWww(urlString: string): string | null {
  try {
    return new URL(urlString).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Drops `warp.dev` when we already have `https://warp.dev/...`. */
function isBareHostDuplicateOfUrl(text: string, urls: string[]): boolean {
  const st = text.trim().toLowerCase().replace(/^www\./, '');
  if (!st || st.includes('/') || st.includes(' ')) {
    return false;
  }
  for (const u of urls) {
    const h = hostWithoutWww(u);
    if (h && st === h) {
      return true;
    }
  }
  return false;
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
  const atomic: string[] = [];
  for (const p of parts) {
    for (const a of atomicizePart(p)) {
      if (a.trim()) {
        atomic.push(a.trim());
      }
    }
  }

  const pass1 = dedupePreserveOrder(atomic);
  const urls = pass1.filter(isProbablyUrl);
  const texts = pass1.filter((x) => !isProbablyUrl(x));

  const uniqueUrls = dedupeUrlsPreserveOrder(urls);
  const filteredTexts = texts.filter((t) => {
    if (isShareFilenameArtifact(t)) {
      return false;
    }
    if (uniqueUrls.length > 0 && isBareHostDuplicateOfUrl(t, uniqueUrls)) {
      return false;
    }
    return true;
  });

  const merged = [...filteredTexts, ...uniqueUrls];
  if (merged.length === 0) {
    return null;
  }
  return orderPartsForCapture(merged).join('\n\n');
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
