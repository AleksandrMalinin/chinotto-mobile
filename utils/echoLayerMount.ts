import { isEchoLayerEligible } from './echoLayerVisibility';

export type EchoLayerMountParams = {
  active: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  totalEntryCount: number;
  candidateCount: number;
};

/**
 * Whether the echo surface should mount on capture.
 * `__DEV__`: always when active and recall chrome is clear (≥1 candidate — use `ensureEchoCandidatesForDev`).
 */
export function isEchoLayerMountedForCapture(params: EchoLayerMountParams): boolean {
  if (!params.active || params.searchActive || params.readSheetOpen) {
    return false;
  }
  if (__DEV__ && process.env.NODE_ENV !== 'test') {
    return params.candidateCount >= 1;
  }
  return isEchoLayerEligible({
    active: params.active,
    searchActive: params.searchActive,
    readSheetOpen: params.readSheetOpen,
    totalEntryCount: params.totalEntryCount,
    candidateCount: params.candidateCount,
  });
}
