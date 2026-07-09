import type { Entry } from '../types/entry';
import { keywordOverlap } from './keywords';
import { sharedKeywords } from './sharedKeywords';

export const CAPTURE_CONTINUATION_MIN_OVERLAP = 3;
export const CAPTURE_CONTINUATION_MAX_DAYS = 7;

export type CaptureContinuationHint = {
  entry_id: string;
  preview: string;
  days_earlier: number;
  shared_terms?: string[];
};

function previewText(text: string, maxChars = 80): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars).trimEnd()}…`;
}

export function getCaptureContinuationHint(
  all: readonly Entry[],
  text: string,
  excludeId?: string,
  now: Date = new Date(),
): CaptureContinuationHint | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const nowMs = now.getTime();
  let best: { row: Entry; overlap: number; days: number } | null = null;

  for (const row of all) {
    if (excludeId && row.id === excludeId) {
      continue;
    }
    const overlap = keywordOverlap(trimmed, row.text);
    if (overlap < CAPTURE_CONTINUATION_MIN_OVERLAP) {
      continue;
    }
    const createdMs = new Date(row.createdAt).getTime();
    if (!Number.isFinite(createdMs)) {
      continue;
    }
    const days = Math.floor((nowMs - createdMs) / 86_400_000);
    if (days < 0 || days > CAPTURE_CONTINUATION_MAX_DAYS) {
      continue;
    }
    const replace =
      best == null ||
      overlap > best.overlap ||
      (overlap === best.overlap && days < best.days);
    if (replace) {
      best = { row, overlap, days };
    }
  }

  if (!best) {
    return null;
  }
  const shared = sharedKeywords(trimmed, best.row.text, 5);
  return {
    entry_id: best.row.id,
    preview: previewText(best.row.text),
    days_earlier: best.days,
    shared_terms: shared.length > 0 ? shared : undefined,
  };
}
