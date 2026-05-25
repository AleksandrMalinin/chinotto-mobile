import type { Entry } from '../types/entry';
import {
  ECHO_INTERRUPTION_AWAY_MINUTES,
  ECHO_SESSION_THREAD_HOURS,
  ECHO_UNFINISHED_OPEN_MIN,
} from '../constants/echoLayer';
import type { EchoEngagementRow } from './selectEchoCandidates';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

const URL_RE = /https?:\/\/\S+/i;

/** Trailing open thought — ellipsis, question, or list-like ending. */
export function isUnfinishedEntryText(text: string): boolean {
  const t = text.trim();
  if (t.endsWith('...') || t.endsWith('…')) {
    return true;
  }
  if (t.endsWith('?')) {
    return true;
  }
  if (/^(\s*[-*•]\s+\S+\s*){2,}/m.test(t)) {
    return true;
  }
  return false;
}

export function unfinishedContinuityScore(row: EchoEngagementRow): number {
  let score = 0;
  if (isUnfinishedEntryText(row.entry.text)) {
    score += 25;
  }
  if (row.openCount >= ECHO_UNFINISHED_OPEN_MIN && row.editCount === 0) {
    score += 20;
  }
  if (row.openCount >= 1 && row.lastOpenedAt != null) {
    score += 10;
  }
  return score;
}

export function linkDensityScore(text: string, openCount: number): number {
  if (!URL_RE.test(text)) {
    return 0;
  }
  return Math.min(30, 10 + openCount * 5);
}

/** Rare tokens in entry — down-weights common short words. */
export function lexicalMassScore(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  if (words.length === 0) {
    return 0;
  }
  const unique = new Set(words);
  return Math.min(20, Math.floor((unique.size / words.length) * 15));
}

export function weekOfYearSalt(now: Date): string {
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const week = Math.floor((now.getTime() - start) / (7 * MS_PER_DAY));
  return `echo-week-${now.getFullYear()}-${week}`;
}

export type EchoSessionThread = {
  entryId: string;
  atIso: string;
};

export function entryIdsInSessionThreadWindow(
  entries: readonly Entry[],
  thread: EchoSessionThread | null,
  windowHours: number = ECHO_SESSION_THREAD_HOURS,
): string[] {
  if (!thread) {
    return [];
  }
  const centerMs = new Date(thread.atIso).getTime();
  if (!Number.isFinite(centerMs)) {
    return [];
  }
  const windowMs = windowHours * MS_PER_HOUR;
  return entries
    .filter((e) => {
      const t = new Date(e.createdAt).getTime();
      return Number.isFinite(t) && Math.abs(t - centerMs) <= windowMs;
    })
    .map((e) => e.id);
}

export type EchoInterruptionContext = {
  lastBackgroundAtIso: string | null;
  sessionThread: EchoSessionThread | null;
};

/**
 * Primary entry for interruption recovery (edge peek / threshold focus).
 * Prefers unfinished + recent session neighbor; never shown as “because…”.
 */
export function getEchoInterruptionPrimaryId(
  rows: readonly EchoEngagementRow[],
  context: EchoInterruptionContext,
  now: Date = new Date(),
): string | null {
  const nowMs = now.getTime();
  if (context.lastBackgroundAtIso) {
    const awayMs = nowMs - new Date(context.lastBackgroundAtIso).getTime();
    if (awayMs < ECHO_INTERRUPTION_AWAY_MINUTES * MS_PER_MINUTE) {
      return null;
    }
  }

  const entries = rows.map((r) => r.entry);
  const threadNeighbors = new Set(
    entryIdsInSessionThreadWindow(entries, context.sessionThread),
  );

  let bestId: string | null = null;
  let bestScore = 0;

  for (const row of rows) {
    let score = unfinishedContinuityScore(row);
    if (threadNeighbors.has(row.entry.id)) {
      score += 35;
    }
    if (context.sessionThread?.entryId === row.entry.id) {
      score += 50;
    }
    if (score > bestScore) {
      bestScore = score;
      bestId = row.entry.id;
    }
  }

  return bestScore > 0 ? bestId : null;
}
