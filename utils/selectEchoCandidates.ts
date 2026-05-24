import type { Entry } from '../types/entry';
import {
  ECHO_DRIFT_MIN_AGE_DAYS,
  ECHO_GRAVITY_RECENT_DAYS,
  ECHO_LAYER_MAX_ITEMS,
} from '../constants/echoLayer';

export type EchoEngagementRow = {
  entry: Entry;
  openCount: number;
  editCount: number;
  lastOpenedAt: string | null;
};

export type EchoCandidateKind = 'gravity' | 'drift';

export type EchoCandidate = Entry & {
  kind: EchoCandidateKind;
};

const MS_PER_DAY = 86_400_000;

function daysBetween(earlierIso: string, laterMs: number): number {
  const earlierMs = new Date(earlierIso).getTime();
  if (!Number.isFinite(earlierMs)) {
    return 0;
  }
  return Math.max(0, (laterMs - earlierMs) / MS_PER_DAY);
}

function gravityScore(row: EchoEngagementRow, nowMs: number): number {
  const recentOpen =
    row.lastOpenedAt != null &&
    daysBetween(row.lastOpenedAt, nowMs) <= ECHO_GRAVITY_RECENT_DAYS;
  return row.openCount * 10 + row.editCount * 15 + (recentOpen ? 20 : 0);
}

function driftScore(row: EchoEngagementRow, nowMs: number): number {
  const ageDays = daysBetween(row.entry.createdAt, nowMs);
  if (ageDays < ECHO_DRIFT_MIN_AGE_DAYS) {
    return 0;
  }
  const lastTouch = row.lastOpenedAt ?? row.entry.createdAt;
  const quietDays = daysBetween(lastTouch, nowMs);
  return quietDays * 2 + (ageDays >= ECHO_DRIFT_MIN_AGE_DAYS ? 30 : 0);
}

function pickTop<T extends { entry: Entry; score: number }>(
  ranked: T[],
  count: number,
  used: Set<string>,
): T[] {
  const out: T[] = [];
  for (const row of ranked) {
    if (out.length >= count) {
      break;
    }
    if (used.has(row.entry.id)) {
      continue;
    }
    used.add(row.entry.id);
    out.push(row);
  }
  return out;
}

/** Deterministic shuffle salt from ids — stable for a given input set. */
function saltedShuffle<T extends { entry: Entry }>(rows: T[], salt: string): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const ka = `${salt}:${a.entry.id}`;
    const kb = `${salt}:${b.entry.id}`;
    return ka.localeCompare(kb);
  });
  return copy;
}

/**
 * Selects a sparse echo list: gravity (revisited/edited) + drift (long-unseen).
 * Includes a salted shuffle tail so the page never feels purely algorithmic.
 */
export function selectEchoCandidates(
  rows: EchoEngagementRow[],
  limit: number = ECHO_LAYER_MAX_ITEMS,
  now: Date = new Date(),
): EchoCandidate[] {
  if (rows.length === 0 || limit <= 0) {
    return [];
  }

  const nowMs = now.getTime();
  const used = new Set<string>();
  const gravityRanked = rows
    .map((row) => ({ row, score: gravityScore(row, nowMs) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const driftRanked = rows
    .map((row) => ({ row, score: driftScore(row, nowMs) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const gravitySlots = Math.min(3, Math.ceil(limit / 2));
  const driftSlots = Math.min(3, Math.floor(limit / 2));

  const gravity = pickTop(
    gravityRanked.map(({ row, score }) => ({ entry: row.entry, score, row })),
    gravitySlots,
    used,
  );
  const drift = pickTop(
    driftRanked.map(({ row, score }) => ({ entry: row.entry, score, row })),
    driftSlots,
    used,
  );

  const out: EchoCandidate[] = [
    ...gravity.map(({ entry }) => ({ ...entry, kind: 'gravity' as const })),
    ...drift.map(({ entry }) => ({ ...entry, kind: 'drift' as const })),
  ];

  if (out.length >= limit) {
    return out.slice(0, limit);
  }

  const remainder = saltedShuffle(
    rows.filter((row) => !used.has(row.entry.id)),
    'echo-tail',
  );
  for (const row of remainder) {
    if (out.length >= limit) {
      break;
    }
    out.push({ ...row.entry, kind: 'drift' });
  }

  return out.slice(0, limit);
}
