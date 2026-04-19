/**
 * Minimal product analytics (Umami). Anonymous, opt-in, batched, non-blocking.
 * Same event names / payload rules as chinotto-app `src/lib/analytics.ts` where events overlap.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Dimensions } from 'react-native';

const STORAGE_KEY = 'chinotto-analytics-enabled';
/** Same key as chinotto-app — one-time opt-in prompt dismissed. */
export const ANALYTICS_PROMPT_SHOWN_KEY = 'chinotto-analytics-prompt-shown';
const BATCH_INTERVAL_MS = 2_000;
const BATCH_SIZE_MAX = 10;
/** Browser-like UA — Umami Cloud may reject non-browser UA as bot. */
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const APP_VERSION = Constants.expoConfig?.version ?? '0';

/**
 * Must match the **domain** configured for this mobile website in Umami (not the public marketing domain).
 * Override with `EXPO_PUBLIC_UMAMI_HOSTNAME` if needed.
 */
const UMAMI_HOSTNAME = process.env.EXPO_PUBLIC_UMAMI_HOSTNAME?.trim() || 'chinotto.mobile';

export type SyncModalSurface = 'header' | 'settings' | 'deeplink' | 'dev_menu';

export type AnalyticsEvent =
  | { event: 'sync_modal_opened'; surface?: SyncModalSurface }
  | { event: 'sync_paywall_shown' }
  | { event: 'sync_plus_continue_clicked'; package_kind: 'monthly' | 'yearly' | 'lifetime' }
  | {
      event: 'sync_purchase_outcome';
      outcome:
        | 'purchased'
        | 'purchased_without_entitlement'
        | 'already_has_sync_access'
        | 'cancelled'
        | 'unavailable'
        | 'failed';
      failure_kind?: 'user_cancelled' | 'network' | 'unknown';
    }
  | { event: 'sync_restore_tapped' }
  | { event: 'sync_restore_outcome'; outcome: 'entitlement_active' | 'no_entitlement' | 'error' }
  | { event: 'sync_apple_mobile_sign_in_outcome'; outcome: 'success' | 'user_cancelled' | 'error' }
  | { event: 'sync_stop_sync_clicked' };

type QueuedEvent = AnalyticsEvent & { ts: string };

let umamiBaseUrl: string | null = null;
let websiteId: string | null = null;
let sessionId: string | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** In-memory cache after {@link initAnalyticsOptIn}; default false until loaded. */
let cachedOptIn = false;

function getSessionId(): string {
  if (sessionId) return sessionId;
  sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return sessionId;
}

export function isOptIn(): boolean {
  return cachedOptIn;
}

export function setOptIn(enabled: boolean): void {
  cachedOptIn = enabled;
  void AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

/** Loads opt-in from storage; returns the resolved value. */
export async function initAnalyticsOptIn(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    cachedOptIn = v === 'true';
  } catch {
    cachedOptIn = false;
  }
  return cachedOptIn;
}

export function setUmami(baseUrl: string | null, id: string | null): void {
  umamiBaseUrl = baseUrl?.trim() || null;
  websiteId = id?.trim() || null;
}

/** True when `EXPO_PUBLIC_UMAMI_*` is set (events can be sent only after opt-in anyway). */
export function isUmamiConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_UMAMI_URL?.trim() && process.env.EXPO_PUBLIC_UMAMI_WEBSITE_ID?.trim()
  );
}

export async function getAnalyticsPromptShown(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ANALYTICS_PROMPT_SHOWN_KEY);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setAnalyticsPromptShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(ANALYTICS_PROMPT_SHOWN_KEY, 'true');
  } catch {
    /* ignore */
  }
}

/** Dev / QA: clear the one-time prompt flag so the sheet can appear again after the capture shell is ready. */
export async function clearAnalyticsPromptShown(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANALYTICS_PROMPT_SHOWN_KEY);
  } catch {
    /* ignore */
  }
}

function isEnabled(): boolean {
  return !!umamiBaseUrl && !!websiteId && isOptIn();
}

function eventToData(payload: QueuedEvent): Record<string, string | number> {
  const data: Record<string, string | number> = {
    ts: payload.ts,
    app_version: APP_VERSION,
  };
  if ('surface' in payload && payload.surface !== undefined) data.surface = payload.surface;
  if ('package_kind' in payload) data.package_kind = payload.package_kind;
  if ('outcome' in payload) data.outcome = payload.outcome;
  if ('failure_kind' in payload && payload.failure_kind !== undefined) {
    data.failure_kind = payload.failure_kind;
  }
  return data;
}

function sendToUmami(queued: QueuedEvent): void {
  if (!umamiBaseUrl || !websiteId) {
    return;
  }
  const { event } = queued;
  const data = eventToData(queued);
  const { width: w, height: h } = Dimensions.get('window');
  const payload = {
    website: websiteId,
    hostname: UMAMI_HOSTNAME,
    url: '/ios',
    title: 'Chinotto',
    referrer: '',
    language: 'en',
    screen: `${Math.round(w)}x${Math.round(h)}`,
    name: event,
    data,
    id: getSessionId(),
  };
  const body = JSON.stringify({ type: 'event', payload });
  const url = `${umamiBaseUrl.replace(/\/$/, '')}/api/send`;
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body,
  }).catch(() => {});
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, BATCH_INTERVAL_MS);
}

function flush(): void {
  if (!isEnabled() || queue.length === 0) return;
  const batch = queue;
  queue = [];
  for (const event of batch) {
    sendToUmami(event);
  }
}

/**
 * Record an event. Fire-and-forget; no-op when disabled or opted out.
 * Never pass entry text, queries, or identifiers.
 */
export function track(payload: AnalyticsEvent): void {
  if (!isEnabled()) return;
  queue.push({ ...payload, ts: new Date().toISOString() });
  if (queue.length >= BATCH_SIZE_MAX) {
    flush();
  } else {
    scheduleFlush();
  }
}
