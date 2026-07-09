import { isEchoLayerMountedForCapture } from './echoLayerMount';

/** Match desktop home partition — do not recall what is already on stream home. */
export const HOME_DEPTH_RECENT_STREAM_WINDOW = 5;

export function pickHomeDepthRecallCandidate<T extends { id: string }>(
  candidates: readonly T[],
  streamEntryIds: readonly string[],
): T | null {
  const recentIds = new Set(
    streamEntryIds.slice(0, HOME_DEPTH_RECENT_STREAM_WINDOW),
  );
  for (const candidate of candidates) {
    if (!recentIds.has(candidate.id)) {
      return candidate;
    }
  }
  return null;
}

export function isHomeDepthRecallVisible(params: {
  active: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  streamEmpty: boolean;
  composerHasDraft: boolean;
  voiceCaptureActive: boolean;
  totalEntryCount: number;
  candidate: { id: string } | null;
  streamEntryIds: readonly string[];
}): boolean {
  if (
    !isEchoLayerMountedForCapture({
      active: params.active,
      searchActive: params.searchActive,
      readSheetOpen: params.readSheetOpen,
      totalEntryCount: params.totalEntryCount,
      candidateCount: params.candidate ? 1 : 0,
    })
  ) {
    return false;
  }
  if (params.streamEmpty || params.composerHasDraft || params.voiceCaptureActive) {
    return false;
  }
  if (!params.candidate) {
    return false;
  }
  const recentIds = params.streamEntryIds.slice(0, HOME_DEPTH_RECENT_STREAM_WINDOW);
  return !recentIds.includes(params.candidate.id);
}
