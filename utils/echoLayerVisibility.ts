import {
  ECHO_LAYER_MIN_CANDIDATES,
  ECHO_LAYER_MIN_ENTRY_COUNT,
} from '../constants/echoLayer';

export function isEchoLayerEligible(params: {
  active: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  totalEntryCount: number;
  candidateCount: number;
}): boolean {
  if (!params.active || params.searchActive || params.readSheetOpen) {
    return false;
  }
  if (params.candidateCount < ECHO_LAYER_MIN_CANDIDATES) {
    return false;
  }
  return params.totalEntryCount >= ECHO_LAYER_MIN_ENTRY_COUNT;
}

/** Horizontal paging is allowed when the echo page exists and recall chrome is not blocking. */
export function isEchoPagerInteractive(params: {
  eligible: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  onEchoPage: boolean;
}): boolean {
  if (!params.eligible) {
    return false;
  }
  if (params.searchActive || params.readSheetOpen) {
    return false;
  }
  return true;
}

export { ECHO_LAYER_MIN_CANDIDATES, ECHO_LAYER_MIN_ENTRY_COUNT };
