import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { ECHO_LAYER_ACTIVE, RESURFACE_SHOW_PROBABILITY } from '../constants/echoLayer';
import { resolveEchoCandidates } from '../storage/entryEngagementRepository';
import { recordEchoCandidatesDisplayed, setEchoLastBackgroundAt } from '../storage/echoLayerPrefs';
import { markAsShown } from '../storage/resurfaceSession';
import type { Entry } from '../types/entry';
import {
  mayAttemptMobileResurface,
  shouldInvokeMobileResurface,
} from '../utils/mobileResurfaceGuards';
import type { EchoCandidate } from '../utils/selectEchoCandidates';

/** Desktop open delay before `tryResurface`. */
const RESURFACE_ATTEMPT_DELAY_MS = 600;

export type UseEchoResurfaceOptions = {
  streamDisplayEntries: readonly Entry[];
  preferStreamFallback: boolean;
  captureReady: boolean;
  readSheetOpen: boolean;
  searchActive: boolean;
  composerHasDraft: boolean;
  voiceCaptureActive: boolean;
  /** Bumps when entry inventory changes so cold-open can retry after load. */
  entriesEpoch: number;
};

export function useEchoResurface({
  streamDisplayEntries,
  preferStreamFallback,
  captureReady,
  readSheetOpen,
  searchActive,
  composerHasDraft,
  voiceCaptureActive,
  entriesEpoch,
}: UseEchoResurfaceOptions) {
  const [echoCandidates, setEchoCandidates] = useState<EchoCandidate[]>([]);
  const [dismissedEchoIds, setDismissedEchoIds] = useState<ReadonlySet<string>>(() => new Set());
  const shownThisSessionRef = useRef(false);
  const triedResurfaceRef = useRef(false);
  const resurfaceInFlightRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const foregroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const streamDisplayEntriesRef = useRef(streamDisplayEntries);
  streamDisplayEntriesRef.current = streamDisplayEntries;
  const preferStreamFallbackRef = useRef(preferStreamFallback);
  preferStreamFallbackRef.current = preferStreamFallback;

  const tryResurface = useCallback(async () => {
    if (!ECHO_LAYER_ACTIVE) {
      return;
    }
    if (
      !shouldInvokeMobileResurface(
        shownThisSessionRef.current,
        resurfaceInFlightRef.current,
      )
    ) {
      return;
    }

    resurfaceInFlightRef.current = true;
    try {
      const raw = await resolveEchoCandidates({
        fallbackEntries: streamDisplayEntriesRef.current,
        preferStreamFallback: preferStreamFallbackRef.current,
      });
      if (raw.length === 0) {
        return;
      }
      if (!__DEV__ && Math.random() > RESURFACE_SHOW_PROBABILITY) {
        return;
      }

      shownThisSessionRef.current = true;
      const primaryId = raw[0]?.id;
      if (primaryId) {
        await markAsShown(primaryId);
        await recordEchoCandidatesDisplayed([primaryId]);
      }
      setEchoCandidates(raw);
    } catch (err) {
      if (__DEV__) {
        console.warn('resolveEchoCandidates failed', err);
      }
    } finally {
      resurfaceInFlightRef.current = false;
    }
  }, []);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current != null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearForegroundTimer = useCallback(() => {
    if (foregroundTimerRef.current != null) {
      clearTimeout(foregroundTimerRef.current);
      foregroundTimerRef.current = null;
    }
  }, []);

  const scheduleOpenAttempt = useCallback(() => {
    clearOpenTimer();
    if (
      !mayAttemptMobileResurface({
        captureReady,
        readSheetOpen,
        searchActive,
        composerHasDraft,
        voiceCaptureActive,
        streamEmpty: streamDisplayEntries.length === 0,
        triedResurface: triedResurfaceRef.current,
      })
    ) {
      return;
    }
    openTimerRef.current = setTimeout(() => {
      triedResurfaceRef.current = true;
      void tryResurface();
    }, RESURFACE_ATTEMPT_DELAY_MS);
  }, [
    captureReady,
    clearOpenTimer,
    composerHasDraft,
    readSheetOpen,
    searchActive,
    streamDisplayEntries.length,
    tryResurface,
    voiceCaptureActive,
  ]);

  useEffect(() => {
    if (!ECHO_LAYER_ACTIVE) {
      setEchoCandidates([]);
      return;
    }
    scheduleOpenAttempt();
    return clearOpenTimer;
  }, [
    captureReady,
    readSheetOpen,
    searchActive,
    composerHasDraft,
    voiceCaptureActive,
    entriesEpoch,
    streamDisplayEntries.length,
    scheduleOpenAttempt,
    clearOpenTimer,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (next === 'background' || next === 'inactive') {
        void setEchoLastBackgroundAt();
      }

      if (!wasBackgroundOrInactive(prev) || next !== 'active') {
        return;
      }

      shownThisSessionRef.current = false;
      triedResurfaceRef.current = false;
      clearForegroundTimer();
      clearOpenTimer();

      if (
        !mayAttemptMobileResurface({
          captureReady,
          readSheetOpen,
          searchActive,
          composerHasDraft,
          voiceCaptureActive,
          streamEmpty: streamDisplayEntriesRef.current.length === 0,
          triedResurface: false,
        })
      ) {
        return;
      }

      foregroundTimerRef.current = setTimeout(() => {
        triedResurfaceRef.current = true;
        void tryResurface();
      }, RESURFACE_ATTEMPT_DELAY_MS);
    });

    return () => {
      sub.remove();
      clearForegroundTimer();
    };
  }, [
    captureReady,
    readSheetOpen,
    searchActive,
    composerHasDraft,
    voiceCaptureActive,
    tryResurface,
    clearForegroundTimer,
    clearOpenTimer,
  ]);

  const dismissEcho = useCallback((candidateId: string) => {
    setEchoCandidates((prev) => prev.filter((candidate) => candidate.id !== candidateId));
    setDismissedEchoIds((prev) => {
      if (prev.has(candidateId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(candidateId);
      return next;
    });
    void recordEchoCandidatesDisplayed([candidateId]);
  }, []);

  return { echoCandidates, dismissedEchoIds, dismissEcho };
}

function wasBackgroundOrInactive(state: AppStateStatus): boolean {
  return state === 'background' || state === 'inactive';
}
