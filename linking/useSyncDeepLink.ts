import { useCallback, useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';

import { isSyncDeepLinkUrl } from './syncDeepLink';

export type AppMainPhase = 'boot' | 'brand' | 'welcome' | 'main';

/**
 * Listens for sync entry URLs (universal link or `chinotto://sync`). If the app is not on capture
 * yet (`phase !== 'main'`) or subscription/bootstrap is still loading, the intent is retained until
 * those gates clear, then {@link onSyncDeepLink} runs once.
 */
export function useSyncDeepLink(options: {
  /** When false, URLs are ignored (e.g. Android or Firebase sync not configured). */
  enabled: boolean;
  phase: AppMainPhase;
  dbReady: boolean;
  subscriptionLoaded: boolean;
  onSyncDeepLink: () => void;
}): void {
  const { enabled, phase, dbReady, subscriptionLoaded, onSyncDeepLink } = options;

  const pendingRef = useRef(false);
  const onSyncDeepLinkRef = useRef(onSyncDeepLink);
  onSyncDeepLinkRef.current = onSyncDeepLink;

  const gatesRef = useRef({ phase, dbReady, subscriptionLoaded });
  gatesRef.current = { phase, dbReady, subscriptionLoaded };

  const flushPending = useCallback(() => {
    if (!enabled || !pendingRef.current) {
      return;
    }
    const { phase: ph, dbReady: db, subscriptionLoaded: sub } = gatesRef.current;
    if (ph !== 'main' || !db || !sub) {
      return;
    }
    pendingRef.current = false;
    onSyncDeepLinkRef.current();
  }, [enabled]);

  useEffect(() => {
    flushPending();
  }, [phase, dbReady, subscriptionLoaded, flushPending]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const consume = (url: string | null) => {
      if (!isSyncDeepLinkUrl(url)) {
        return;
      }
      pendingRef.current = true;
      flushPending();
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      consume(url);
    });

    void Linking.getInitialURL().then((url) => {
      consume(url);
    });

    return () => {
      sub.remove();
    };
  }, [enabled, flushPending]);
}
