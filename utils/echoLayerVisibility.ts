import {
  ECHO_LAYER_MIN_CANDIDATES,
  ECHO_LAYER_MIN_ENTRY_COUNT,
} from '../constants/echoLayer';

/** Global flag and/or dev override (caller should pass dev only when `__DEV__`). */
export function isEchoLayerActive(globalEnabled: boolean, devEnabled: boolean): boolean {
  return globalEnabled || devEnabled;
}

export function isEchoLayerEligible(params: {
  active: boolean;
  searchActive: boolean;
  readSheetOpen: boolean;
  totalEntryCount: number;
  candidateCount: number;
  /** Dev QA: show echo before `ECHO_LAYER_MIN_ENTRY_COUNT`. */
  bypassMinEntryCount?: boolean;
  /** Dev QA: allow echo with a single visible candidate. */
  bypassMinCandidates?: boolean;
}): boolean {
  if (!params.active || params.searchActive || params.readSheetOpen) {
    return false;
  }
  const minCandidates = params.bypassMinCandidates ? 1 : ECHO_LAYER_MIN_CANDIDATES;
  if (params.candidateCount < minCandidates) {
    return false;
  }
  if (params.bypassMinEntryCount) {
    return true;
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
