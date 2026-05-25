import type { Entry } from '../types/entry';
import { ECHO_STEM_MIN_GAP_DAYS, ECHO_STEM_MIN_WORDS } from '../constants/echoLayer';

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'it',
  'i',
  'me',
  'my',
  'we',
  'you',
  'that',
  'this',
  'with',
  'as',
  'be',
  'are',
  'was',
  'were',
  'been',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'not',
  'no',
  'so',
  'if',
  'from',
  'by',
  'about',
  'into',
  'than',
  'then',
  'there',
  'their',
  'they',
  'what',
  'when',
  'where',
  'which',
  'who',
  'how',
  'why',
  'can',
  'could',
  'would',
  'should',
  'will',
  'just',
  'also',
  'very',
  'too',
  'up',
  'out',
  'all',
  'any',
  'some',
  'more',
  'most',
  'other',
  'such',
  'only',
  'own',
  'same',
  'than',
  'too',
  's',
  't',
  're',
  've',
  'll',
  'd',
]);

const MS_PER_DAY = 86_400_000;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/** Contiguous token window as recurrence stem (deterministic). */
export function extractEchoStem(text: string, wordCount: number = ECHO_STEM_MIN_WORDS): string | null {
  const tokens = tokenize(text);
  if (tokens.length < wordCount) {
    return null;
  }
  return tokens.slice(0, wordCount).join(' ');
}

function daysBetweenIso(earlierIso: string, laterMs: number): number {
  const earlierMs = new Date(earlierIso).getTime();
  if (!Number.isFinite(earlierMs)) {
    return 0;
  }
  return Math.max(0, (laterMs - earlierMs) / MS_PER_DAY);
}

/**
 * Entry ids that participate in stem recurrence (≥2 entries, same stem, ≥ gap days).
 * Used to boost at most one gravity slot — never surfaced as “similar notes”.
 */
export function entryIdsWithStemRecurrence(
  entries: readonly Entry[],
  minGapDays: number = ECHO_STEM_MIN_GAP_DAYS,
  now: Date = new Date(),
): Set<string> {
  const nowMs = now.getTime();
  const byStem = new Map<string, Entry[]>();

  for (const entry of entries) {
    const stem = extractEchoStem(entry.text);
    if (!stem) {
      continue;
    }
    const list = byStem.get(stem) ?? [];
    list.push(entry);
    byStem.set(stem, list);
  }

  const out = new Set<string>();
  for (const group of byStem.values()) {
    if (group.length < 2) {
      continue;
    }
    const sorted = [...group].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (daysBetweenIso(prev.createdAt, new Date(cur.createdAt).getTime()) >= minGapDays) {
        out.add(prev.id);
        out.add(cur.id);
      }
    }
  }

  return out;
}
