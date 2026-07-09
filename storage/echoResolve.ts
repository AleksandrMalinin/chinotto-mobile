import { ECHO_LAYER_MAX_ITEMS } from '../constants/echoLayer';
import { getIdsInCooldown } from '../storage/resurfaceSession';
import { formatResurfaceReason } from '../utils/formatResurfaceReason';
import { selectEntryForResurface } from '../utils/temporalRecall';
import { getEchoInterruptionPrimaryId } from '../utils/echoContinuitySignals';
import { thoughtTrailNeighborCount } from '../utils/thoughtTrailNeighborCount';
import { buildThoughtTrailNeighbors } from '../utils/thoughtTrail';
import { echoGhostTraceExcerpt } from '../utils/echoGhostTraceExcerpt';
import {
  type EchoCandidate,
  type EchoEngagementRow,
} from '../utils/selectEchoCandidates';
import { getEchoDisplayCooldownExcludedIds, getEchoLastBackgroundAt, getEchoSessionThread } from './echoLayerPrefs';

export type BuildEchoCandidatesOptions = {
  rows: EchoEngagementRow[];
  limit?: number;
  now?: Date;
  rng?: () => number;
};

/** Temporal recall aligned with desktop — one primary echo card per resolve. */
export async function buildEchoCandidates(
  options: BuildEchoCandidatesOptions,
): Promise<EchoCandidate[]> {
  const { rows, limit = ECHO_LAYER_MAX_ITEMS, now = new Date(), rng = Math.random } = options;
  if (rows.length === 0) {
    return [];
  }

  const engagementByEntryId = new Map(
    rows.map((r) => [r.entry.id, { openCount: r.openCount, editCount: r.editCount }]),
  );
  const [cooldownIds, displayExcluded, lastBackgroundAt, sessionThread] = await Promise.all([
    getIdsInCooldown(undefined, undefined, now),
    getEchoDisplayCooldownExcludedIds(now, engagementByEntryId),
    getEchoLastBackgroundAt(),
    getEchoSessionThread(),
  ]);
  const excludeIds = new Set<string>([...cooldownIds, ...displayExcluded]);

  const interruptionId = getEchoInterruptionPrimaryId(
    rows,
    { lastBackgroundAtIso: lastBackgroundAt, sessionThread },
    now,
  );
  const interruptionMatch =
    interruptionId != null ? rows.find((row) => row.entry.id === interruptionId) : undefined;

  const buildCandidate = (match: EchoEngagementRow, kind: EchoCandidate['kind'], reason: string): EchoCandidate => {
    const allEntries = rows.map((row) => row.entry);
    const neighbors = thoughtTrailNeighborCount(match.entry, allEntries);
    const trail = buildThoughtTrailNeighbors(match.entry, allEntries);
    const ghostTraces: string[] = [];
    for (const entry of trail.earlier.slice(0, 1)) {
      ghostTraces.push(echoGhostTraceExcerpt(entry.text));
    }
    for (const entry of trail.later.slice(0, 1)) {
      if (ghostTraces.length < 2) {
        ghostTraces.push(echoGhostTraceExcerpt(entry.text));
      }
    }
    return {
      ...match.entry,
      kind,
      reason,
      trailNeighborCount: neighbors > 0 ? neighbors : undefined,
      ghostTraces: ghostTraces.length > 0 ? ghostTraces : undefined,
    };
  };

  if (interruptionMatch != null && !excludeIds.has(interruptionMatch.entry.id)) {
    const candidate = buildCandidate(interruptionMatch, 'gravity', 'Still here');
    return limit > 0 ? [candidate] : [];
  }

  const picked = selectEntryForResurface(
    rows.map((row) => ({
      id: row.entry.id,
      text: row.entry.text,
      created_at: row.entry.createdAt,
      edit_count: row.editCount,
      open_count: row.openCount,
    })),
    now,
    excludeIds,
    rng,
  );
  if (!picked) {
    return [];
  }

  const match = rows.find((row) => row.entry.id === picked.entry.id);
  if (!match) {
    return [];
  }

  const candidate = buildCandidate(
    match,
    'temporal',
    formatResurfaceReason(picked.anchor, match.entry.createdAt, now),
  );

  return limit > 0 ? [candidate] : [];
}
