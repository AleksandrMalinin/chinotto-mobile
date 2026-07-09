import AsyncStorage from '@react-native-async-storage/async-storage';

import { echoDisplayCooldownDays } from '../utils/echoDisplayCooldown';
import type { EchoSessionThread } from '../utils/echoContinuitySignals';

const KEY_DISPLAY_COOLDOWN = '@chinotto/echo_display_cooldown_v1';
const KEY_SESSION_THREAD = '@chinotto/echo_session_thread_v1';
const KEY_LAST_BACKGROUND = '@chinotto/echo_last_background_v1';

const MS_PER_DAY = 86_400_000;

type DisplayCooldownMap = Record<string, string>;

export type EchoDisplayCooldownEngagement = {
  openCount: number;
  editCount: number;
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export async function getEchoDisplayCooldownExcludedIds(
  now: Date = new Date(),
  engagementByEntryId?: ReadonlyMap<string, EchoDisplayCooldownEngagement>,
): Promise<Set<string>> {
  const map = await readJson<DisplayCooldownMap>(KEY_DISPLAY_COOLDOWN, {});
  const nowMs = now.getTime();
  const excluded = new Set<string>();
  const pruned: DisplayCooldownMap = {};

  for (const [entryId, shownAt] of Object.entries(map)) {
    const shownMs = new Date(shownAt).getTime();
    if (!Number.isFinite(shownMs)) {
      continue;
    }
    const days = (nowMs - shownMs) / MS_PER_DAY;
    const engagement = engagementByEntryId?.get(entryId);
    const cooldownDays =
      engagement != null
        ? echoDisplayCooldownDays(engagement.openCount, engagement.editCount)
        : echoDisplayCooldownDays(0, 0);
    if (days < cooldownDays) {
      excluded.add(entryId);
      pruned[entryId] = shownAt;
    }
  }

  if (Object.keys(pruned).length !== Object.keys(map).length) {
    await writeJson(KEY_DISPLAY_COOLDOWN, pruned);
  }

  return excluded;
}

export async function recordEchoCandidatesDisplayed(
  entryIds: readonly string[],
  at: Date = new Date(),
): Promise<void> {
  if (entryIds.length === 0) {
    return;
  }
  const map = await readJson<DisplayCooldownMap>(KEY_DISPLAY_COOLDOWN, {});
  const iso = at.toISOString();
  for (const id of entryIds) {
    map[id] = iso;
  }
  await writeJson(KEY_DISPLAY_COOLDOWN, map);
}

export async function getEchoSessionThread(): Promise<EchoSessionThread | null> {
  return readJson<EchoSessionThread | null>(KEY_SESSION_THREAD, null);
}

export async function setEchoSessionThread(entryId: string, at: Date = new Date()): Promise<void> {
  await writeJson(KEY_SESSION_THREAD, { entryId, atIso: at.toISOString() });
}

export async function getEchoLastBackgroundAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_LAST_BACKGROUND);
  } catch {
    return null;
  }
}

export async function setEchoLastBackgroundAt(at: Date = new Date()): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_BACKGROUND, at.toISOString());
  } catch {
    /* ignore */
  }
}

/** Dev / QA: reset continuity prefs. */
export async function clearEchoContinuityPrefs(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEY_DISPLAY_COOLDOWN,
      KEY_SESSION_THREAD,
      KEY_LAST_BACKGROUND,
    ]);
  } catch {
    /* ignore */
  }
}
