import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import Constants from 'expo-constants';

import { fetchUpdateConfig, type UpdateConfigFetcher } from './updateConfigService';
import { resolveUpdateGate, withStoreUrl } from './resolveUpdateGate';
import type { UpdateConfig, UpdateGate } from './types';

export function getRuntimeAppVersion(): string {
  const v = Constants.expoConfig?.version?.trim();
  return v && v.length > 0 ? v : '0.0.0';
}

export type UseAppUpdateCheckOptions = {
  /** When false, skips network/mock fetch entirely (e.g. tests / automation). */
  enabled?: boolean;
  fetchConfig?: UpdateConfigFetcher;
  getCurrentVersion?: () => string;
};

/**
 * Fetches policy on mount and whenever the app returns to **active** (foreground).
 * Soft prompts respect a dismiss until the next **background** transition (then policy may show again).
 */
export function useAppUpdateCheck(options?: UseAppUpdateCheckOptions): {
  gate: UpdateGate | null;
  isChecking: boolean;
  dismissSoft: () => void;
  recheck: () => void;
} {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const enabled = options?.enabled !== false;

  const [gate, setGate] = useState<UpdateGate | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const genRef = useRef(0);
  const softDismissedRef = useRef(false);

  const runCheck = useCallback(async () => {
    const o = optionsRef.current;
    if (o?.enabled === false) {
      setGate(null);
      setIsChecking(false);
      return;
    }
    const fetchConfig: UpdateConfigFetcher = o?.fetchConfig ?? fetchUpdateConfig;
    const getVersion = o?.getCurrentVersion ?? getRuntimeAppVersion;

    const gen = ++genRef.current;
    setIsChecking(true);
    let config: UpdateConfig;
    try {
      config = await fetchConfig();
    } catch {
      if (gen !== genRef.current) {
        return;
      }
      setGate(null);
      setIsChecking(false);
      return;
    }
    if (gen !== genRef.current) {
      return;
    }

    const os = Platform.OS;
    const platform: 'ios' | 'android' | 'web' = os === 'ios' || os === 'android' ? os : 'web';
    const base = resolveUpdateGate(getVersion(), config);
    let next: UpdateGate | null = base == null ? null : withStoreUrl(base, platform, config);
    if (next?.kind === 'soft' && softDismissedRef.current) {
      next = null;
    }
    setGate(next);
    setIsChecking(false);
  }, []);

  const dismissSoft = useCallback(() => {
    softDismissedRef.current = true;
    setGate((g) => (g?.kind === 'soft' ? null : g));
  }, []);

  const recheck = useCallback(() => {
    void runCheck();
  }, [runCheck]);

  useEffect(() => {
    if (!enabled) {
      setGate(null);
      setIsChecking(false);
      return;
    }
    void runCheck();
  }, [enabled, runCheck]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        softDismissedRef.current = false;
      }
      if (next === 'active') {
        void runCheck();
      }
    });
    return () => sub.remove();
  }, [enabled, runCheck]);

  return { gate, isChecking, dismissSoft, recheck };
}
