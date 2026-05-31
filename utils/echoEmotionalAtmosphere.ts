import type { Entry } from '../types/entry';

/**
 * Proxy emotional intensity (0–1) from text signals only — never labeled in UI.
 * Influences ghost legibility and veil depth, not copy.
 */
export function echoEmotionalIntensityFromText(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 0;
  }

  let score = 0;
  const questionCount = (trimmed.match(/\?/g) ?? []).length;
  if (questionCount >= 1) {
    score += 0.22;
  }
  if (questionCount >= 2) {
    score += 0.12;
  }
  if (/[A-Z]{4,}/.test(trimmed)) {
    score += 0.18;
  }
  if (/!{2,}/.test(trimmed) || trimmed.endsWith('!')) {
    score += 0.12;
  }
  if (trimmed.endsWith('...') || trimmed.endsWith('…')) {
    score += 0.2;
  }

  return Math.min(1, score);
}

export function echoEmotionalIntensityFromEntries(entries: readonly Entry[]): number {
  if (entries.length === 0) {
    return 0;
  }
  let max = 0;
  for (const entry of entries) {
    max = Math.max(max, echoEmotionalIntensityFromText(entry.text));
  }
  return max;
}
