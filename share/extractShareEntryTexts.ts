import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

function shouldSavePayload(payload: ResolvedSharePayload): boolean {
  if (payload.shareType === 'text' || payload.shareType === 'url') {
    return true;
  }
  return payload.contentType === 'website';
}

/**
 * Maps resolved share payloads to entry text (plain text, URLs, webpage shares).
 * Skips files, images, audio, and video.
 */
export function extractEntryTextsFromResolvedSharePayloads(
  payloads: ResolvedSharePayload[]
): string[] {
  const out: string[] = [];
  for (const p of payloads) {
    if (!shouldSavePayload(p)) {
      continue;
    }
    const v = (p.value ?? '').trim();
    if (v) {
      out.push(v);
      continue;
    }
    const uri = p.contentUri?.trim();
    if (uri) {
      out.push(uri);
    }
  }
  return out;
}

/**
 * Raw payloads from the share pipeline (before async resolve). Use as fallback when
 * resolution fails or returns nothing, so text/URL saves stay local-first and fast.
 */
export function extractEntryTextsFromSharePayloads(payloads: SharePayload[]): string[] {
  const out: string[] = [];
  for (const p of payloads) {
    if (p.shareType !== 'text' && p.shareType !== 'url') {
      continue;
    }
    const v = (p.value ?? '').trim();
    if (v) {
      out.push(v);
    }
  }
  return out;
}
