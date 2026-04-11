import type { SyncHighlightSignals } from '../storage/syncHighlightSignals';
import {
  SYNC_HIGHLIGHT_COOLDOWN_MS,
  SYNC_HIGHLIGHT_MAX_IMPRESSIONS,
  SYNC_HIGHLIGHT_MIN_SESSIONS_NOT_FIRST_LAUNCH,
  SYNC_HIGHLIGHT_MIN_THOUGHTS,
  SYNC_HIGHLIGHT_RELEVANCE_MIN_APP_LAUNCHES,
} from './syncHighlightConstants';

export type SyncHighlightAuthPhase = 'restoring' | 'signed_in' | 'signed_out';

export type SyncHighlightContext = {
  authPhase: SyncHighlightAuthPhase;
  /** True while sync modal/sheet is visible. */
  syncFlowOpen: boolean;
  screenshotActive: boolean;
  /** Total rows in local DB (not just current page). */
  totalThoughtCount: number;
  signals: SyncHighlightSignals;
  /** User already used the header CTA — do not nudge again. */
  syncHeaderCtaTapped: boolean;
  nowMs: number;
};

export type SyncHighlightEligibility = {
  shouldShimmer: boolean;
};

/**
 * Pure decision: whether we may show a one-shot Enable sync label shimmer.
 * Conservative when signals are weak — prefer not to shimmer.
 */
export function getSyncHighlightEligibility(ctx: SyncHighlightContext): SyncHighlightEligibility {
  const { authPhase, syncFlowOpen, screenshotActive, totalThoughtCount, signals, syncHeaderCtaTapped, nowMs } =
    ctx;

  if (screenshotActive) {
    return { shouldShimmer: false };
  }
  if (syncFlowOpen) {
    return { shouldShimmer: false };
  }
  if (syncHeaderCtaTapped) {
    return { shouldShimmer: false };
  }
  if (authPhase === 'signed_in') {
    return { shouldShimmer: false };
  }
  if (authPhase === 'restoring') {
    return { shouldShimmer: false };
  }

  if (signals.appLaunchCount < SYNC_HIGHLIGHT_MIN_SESSIONS_NOT_FIRST_LAUNCH) {
    return { shouldShimmer: false };
  }

  if (signals.shimmerImpressionCount >= SYNC_HIGHLIGHT_MAX_IMPRESSIONS) {
    return { shouldShimmer: false };
  }

  if (signals.lastShimmerAt != null && nowMs - signals.lastShimmerAt < SYNC_HIGHLIGHT_COOLDOWN_MS) {
    return { shouldShimmer: false };
  }

  const hasRelevance =
    totalThoughtCount >= SYNC_HIGHLIGHT_MIN_THOUGHTS ||
    signals.appLaunchCount >= SYNC_HIGHLIGHT_RELEVANCE_MIN_APP_LAUNCHES ||
    signals.hasDeepScrolledStream ||
    signals.hasOpenedExistingThought ||
    signals.hasUsedSearch;

  if (!hasRelevance) {
    return { shouldShimmer: false };
  }

  return { shouldShimmer: true };
}

export function shouldHighlightSync(ctx: SyncHighlightContext): boolean {
  return getSyncHighlightEligibility(ctx).shouldShimmer;
}
