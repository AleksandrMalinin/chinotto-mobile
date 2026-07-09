import type { Entry } from '../types/entry';
import {
  ECHO_DRIFT_MIN_AGE_DAYS,
  ECHO_GRAVITY_RECENT_DAYS,
  ECHO_LAYER_MAX_ITEMS,
} from '../constants/echoLayer';
import {
  lexicalMassScore,
  linkDensityScore,
  unfinishedContinuityScore,
  weekOfYearSalt,
} from './echoContinuitySignals';
import { entryIdsWithStemRecurrence } from './echoStems';

export type EchoEngagementRow = {
  entry: Entry;
  openCount: number;
  editCount: number;
  lastOpenedAt: string | null;
};

export type EchoCandidateKind = 'gravity' | 'drift' | 'temporal';

export type EchoCandidate = Entry & {
  kind: EchoCandidateKind;
  reason?: string;
  trailNeighborCount?: number;
  /** Submerged one-line traces — trail neighbors, not a feed. */
  ghostTraces?: readonly string[];
};

export type SelectEchoCandidatesOptions = {
  /** Entries recently shown on Echo — excluded from selection. */
  excludeEntryIds?: ReadonlySet<string>;
  /** Promote to front when present in result (session thread / interruption). */
  primaryEntryId?: string | null;
  now?: Date;
};

const MS_PER_DAY = 86_400_000;

function daysBetween(earlierIso: string, laterMs: number): number {
  const earlierMs = new Date(earlierIso).getTime();
  if (!Number.isFinite(earlierMs)) {
    return 0;
  }
  return Math.max(0, (laterMs - earlierMs) / MS_PER_DAY);
}

function gravityScore(row: EchoEngagementRow, nowMs: number, stemBoost: boolean): number {
  const recentOpen =
    row.lastOpenedAt != null &&
    daysBetween(row.lastOpenedAt, nowMs) <= ECHO_GRAVITY_RECENT_DAYS;
  const unfinished = unfinishedContinuityScore(row);
  const engaged = row.openCount > 0 || row.editCount > 0 || recentOpen;
  if (!engaged && !stemBoost && unfinished === 0) {
    return 0;
  }
  let score = row.openCount * 10 + row.editCount * 15 + (recentOpen ? 20 : 0);
  score += unfinished;
  score += linkDensityScore(row.entry.text, row.openCount);
  score += lexicalMassScore(row.entry.text);
  if (stemBoost) {
    score += 40;
  }
  return score;
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

function filterExcluded(
  rows: EchoEngagementRow[],
  exclude?: ReadonlySet<string>,
): EchoEngagementRow[] {
  if (!exclude || exclude.size === 0) {
    return rows;
  }
  return rows.filter((row) => !exclude.has(row.entry.id));
}

function withPrimaryFirst(
  candidates: EchoCandidate[],
  primaryEntryId: string | null | undefined,
): EchoCandidate[] {
  if (!primaryEntryId) {
    return candidates;
  }
  const idx = candidates.findIndex((c) => c.id === primaryEntryId);
  if (idx <= 0) {
    return candidates;
  }
  const copy = [...candidates];
  const [item] = copy.splice(idx, 1);
  return [item!, ...copy];
}

/**
 * Selects a sparse echo list: gravity (revisited/edited) + drift (long-unseen).
 * Continuity signals and seasonal salt — never explained in UI.
 */
export function selectEchoCandidates(
  rows: EchoEngagementRow[],
  limit: number = ECHO_LAYER_MAX_ITEMS,
  now: Date = new Date(),
  options: SelectEchoCandidatesOptions = {},
): EchoCandidate[] {
  const resolvedNow = options.now ?? now;
  const filtered = filterExcluded(rows, options.excludeEntryIds);
  if (filtered.length === 0 || limit <= 0) {
    return [];
  }

  const nowMs = resolvedNow.getTime();
  const entries = filtered.map((r) => r.entry);
  const stemIds = entryIdsWithStemRecurrence(entries, undefined, resolvedNow);

  const gravityRanked = filtered
    .map((row) => ({
      row,
      score: gravityScore(row, nowMs, stemIds.has(row.entry.id)),
      stemRecurrent: stemIds.has(row.entry.id),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const driftRanked = filtered
    .map((row) => ({ row, score: driftScore(row, nowMs) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const used = new Set<string>();
  const gravitySlots = Math.min(3, Math.ceil(limit / 2));
  const driftSlots = Math.min(3, Math.floor(limit / 2));

  const gravityPicked: { entry: Entry; row: EchoEngagementRow }[] = [];
  let stemRecurrenceSlotUsed = false;
  for (const { row, stemRecurrent } of gravityRanked) {
    if (gravityPicked.length >= gravitySlots) {
      break;
    }
    if (used.has(row.entry.id)) {
      continue;
    }
    if (stemRecurrent && stemRecurrenceSlotUsed) {
      continue;
    }
    if (stemRecurrent) {
      stemRecurrenceSlotUsed = true;
    }
    used.add(row.entry.id);
    gravityPicked.push({ entry: row.entry, row });
  }

  const drift = pickTop(
    driftRanked.map(({ row, score }) => ({ entry: row.entry, score, row })),
    driftSlots,
    used,
  );

  const out: EchoCandidate[] = [
    ...gravityPicked.map(({ entry }) => ({
      ...entry,
      kind: 'gravity' as const,
      reason: 'Still here',
    })),
    ...drift.map(({ entry }) => ({
      ...entry,
      kind: 'drift' as const,
      reason: 'From earlier',
    })),
  ];

  if (out.length >= limit) {
    return withPrimaryFirst(out.slice(0, limit), options.primaryEntryId);
  }

  const remainder = saltedShuffle(
    filtered.filter((row) => !used.has(row.entry.id)),
    weekOfYearSalt(resolvedNow),
  );
  for (const row of remainder) {
    if (out.length >= limit) {
      break;
    }
    out.push({ ...row.entry, kind: 'drift', reason: 'From earlier' });
  }

  return withPrimaryFirst(out.slice(0, limit), options.primaryEntryId);
}
