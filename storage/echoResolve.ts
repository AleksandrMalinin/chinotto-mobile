import { ECHO_LAYER_MAX_ITEMS } from '../constants/echoLayer';
import { applyEchoAiPipeline } from '../utils/echoAiRerank';
import { getEchoInterruptionPrimaryId } from '../utils/echoContinuitySignals';
import {
  selectEchoCandidates,
  type EchoCandidate,
  type EchoEngagementRow,
} from '../utils/selectEchoCandidates';
import {
  getEchoDisplayCooldownExcludedIds,
  getEchoLastBackgroundAt,
  getEchoSessionThread,
} from './echoLayerPrefs';

export type BuildEchoCandidatesOptions = {
  rows: EchoEngagementRow[];
  limit?: number;
  now?: Date;
};

/** Applies cooldown, continuity scoring, interruption primary, and AI passthrough. */
export async function buildEchoCandidates(
  options: BuildEchoCandidatesOptions,
): Promise<EchoCandidate[]> {
  const { rows, limit = ECHO_LAYER_MAX_ITEMS, now = new Date() } = options;
  const [excluded, sessionThread, lastBackgroundAt] = await Promise.all([
    getEchoDisplayCooldownExcludedIds(now),
    getEchoSessionThread(),
    getEchoLastBackgroundAt(),
  ]);

  const primaryEntryId = getEchoInterruptionPrimaryId(rows, {
    lastBackgroundAtIso: lastBackgroundAt,
    sessionThread,
  });

  const selected = selectEchoCandidates(rows, limit, now, {
    excludeEntryIds: excluded,
    primaryEntryId,
  });

  return applyEchoAiPipeline(selected);
}
