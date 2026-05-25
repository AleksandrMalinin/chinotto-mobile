import AsyncStorage from '@react-native-async-storage/async-storage';

import { STREAM_TIDE_COOLDOWN_MS } from '../constants/streamBoundedContinuity';

const KEY_TIDE_COOLDOWN = '@chinotto/stream_tide_cooldown_v1';
const KEY_LAST_BACKGROUND = '@chinotto/stream_tide_last_background_v1';

type TideCooldownMap = Record<string, string>;

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

export async function getStreamTideCooldownIds(now = Date.now()): Promise<Set<string>> {
  const map = await readJson<TideCooldownMap>(KEY_TIDE_COOLDOWN, {});
  const out = new Set<string>();
  const keep: TideCooldownMap = {};
  for (const [id, iso] of Object.entries(map)) {
    const at = Date.parse(iso);
    if (!Number.isFinite(at) || now - at < STREAM_TIDE_COOLDOWN_MS) {
      out.add(id);
      keep[id] = iso;
    }
  }
  if (Object.keys(keep).length !== Object.keys(map).length) {
    void writeJson(KEY_TIDE_COOLDOWN, keep);
  }
  return out;
}

export async function recordStreamTideShown(entryIds: readonly string[], now = Date.now()): Promise<void> {
  if (entryIds.length === 0) {
    return;
  }
  const map = await readJson<TideCooldownMap>(KEY_TIDE_COOLDOWN, {});
  const iso = new Date(now).toISOString();
  for (const id of entryIds) {
    map[id] = iso;
  }
  await writeJson(KEY_TIDE_COOLDOWN, map);
}

export async function setStreamTideLastBackgroundAt(iso: string): Promise<void> {
  await writeJson(KEY_LAST_BACKGROUND, iso);
}

export async function getStreamTideLastBackgroundAt(): Promise<string | null> {
  const raw = await readJson<string | null>(KEY_LAST_BACKGROUND, null);
  return typeof raw === 'string' ? raw : null;
}

export async function clearStreamTidePrefsForDev(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([KEY_TIDE_COOLDOWN, KEY_LAST_BACKGROUND]);
  } catch {
    /* ignore */
  }
}
