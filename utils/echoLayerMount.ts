import { isEchoLayerEligible } from './echoLayerVisibility';

export type EchoLayerMountParams = {
  active: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  totalEntryCount: number;
  candidateCount: number;
};

/** Whether the echo surface should mount on capture. */
export function isEchoLayerMountedForCapture(params: EchoLayerMountParams): boolean {
  return isEchoLayerEligible({
    active: params.active,
    searchActive: params.searchActive,
    readSheetOpen: params.readSheetOpen,
    totalEntryCount: params.totalEntryCount,
    candidateCount: params.candidateCount,
  });
}
