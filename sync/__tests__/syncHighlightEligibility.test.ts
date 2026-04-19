import {
  SYNC_HIGHLIGHT_COOLDOWN_MS,
  SYNC_HIGHLIGHT_MAX_IMPRESSIONS,
} from '../syncHighlightConstants';
import { getSyncHighlightEligibility, type SyncHighlightContext } from '../syncHighlightEligibility';

const baseSignals = {
  appLaunchCount: 3,
  shimmerImpressionCount: 0,
  lastShimmerAt: null as number | null,
  hasDeepScrolledStream: false,
  hasOpenedExistingThought: false,
  hasUsedSearch: false,
};

function ctx(partial: Partial<SyncHighlightContext>): SyncHighlightContext {
  return {
    authPhase: 'signed_out',
    syncFlowOpen: false,
    totalThoughtCount: 0,
    signals: { ...baseSignals },
    syncHeaderCtaTapped: false,
    nowMs: Date.now(),
    ...partial,
  };
}

describe('getSyncHighlightEligibility', () => {
  it('blocks on first cold launch (session count 1)', () => {
    expect(
      getSyncHighlightEligibility(
        ctx({
          signals: { ...baseSignals, appLaunchCount: 1 },
          totalThoughtCount: 10,
        })
      ).shouldShimmer
    ).toBe(false);
  });

  it('allows when not first launch, relevance from thoughts, under max impressions', () => {
    expect(
      getSyncHighlightEligibility(
        ctx({
          signals: { ...baseSignals, appLaunchCount: 2 },
          totalThoughtCount: 3,
        })
      ).shouldShimmer
    ).toBe(true);
  });

  it('suppresses while sync modal is open', () => {
    expect(getSyncHighlightEligibility(ctx({ syncFlowOpen: true, totalThoughtCount: 3 })).shouldShimmer).toBe(
      false
    );
  });

  it('suppresses after header CTA was used', () => {
    expect(getSyncHighlightEligibility(ctx({ syncHeaderCtaTapped: true, totalThoughtCount: 3 })).shouldShimmer).toBe(
      false
    );
  });

  it('respects cooldown', () => {
    const now = 1_700_000_000_000;
    expect(
      getSyncHighlightEligibility(
        ctx({
          signals: {
            ...baseSignals,
            appLaunchCount: 3,
            lastShimmerAt: now - SYNC_HIGHLIGHT_COOLDOWN_MS + 1000,
            shimmerImpressionCount: 1,
          },
          totalThoughtCount: 3,
          nowMs: now,
        })
      ).shouldShimmer
    ).toBe(false);
  });

  it('respects max lifetime impressions', () => {
    expect(
      getSyncHighlightEligibility(
        ctx({
          signals: {
            ...baseSignals,
            appLaunchCount: 3,
            shimmerImpressionCount: SYNC_HIGHLIGHT_MAX_IMPRESSIONS,
          },
          totalThoughtCount: 3,
        })
      ).shouldShimmer
    ).toBe(false);
  });

  it('allows engagement-only relevance on session 2 when deep scroll recorded', () => {
    expect(
      getSyncHighlightEligibility(
        ctx({
          signals: { ...baseSignals, appLaunchCount: 2, hasDeepScrolledStream: true },
          totalThoughtCount: 0,
        })
      ).shouldShimmer
    ).toBe(true);
  });
});
