import AsyncStorage from '@react-native-async-storage/async-storage';

export const RESURFACED_HISTORY_KEY = '@chinotto/resurfaced-history-v1';
export const RESURFACED_COOLDOWN_DAYS = 7;
export const RESURFACED_HISTORY_MAX = 50;

export type ResurfacedRecord = { id: string; shownAt: string };

export interface ResurfaceStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const defaultStorage: ResurfaceStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

export async function getResurfacedHistory(
  storage: ResurfaceStorage = defaultStorage,
): Promise<ResurfacedRecord[]> {
  try {
    const raw = await storage.getItem(RESURFACED_HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (x): x is ResurfacedRecord =>
        typeof x === 'object' && x !== null && 'id' in x && 'shownAt' in x,
    );
  } catch {
    return [];
  }
}

export async function getIdsInCooldown(
  storage: ResurfaceStorage = defaultStorage,
  cooldownDays: number = RESURFACED_COOLDOWN_DAYS,
  now: Date = new Date(),
): Promise<string[]> {
  const history = await getResurfacedHistory(storage);
  const cutoffMs = now.getTime() - cooldownDays * 86_400_000;
  return history
    .filter((r) => new Date(r.shownAt).getTime() >= cutoffMs)
    .map((r) => r.id);
}

export async function markAsShown(
  id: string,
  storage: ResurfaceStorage = defaultStorage,
  max: number = RESURFACED_HISTORY_MAX,
  now: Date = new Date(),
): Promise<void> {
  const history = await getResurfacedHistory(storage);
  const next = [
    { id, shownAt: now.toISOString() },
    ...history.filter((r) => r.id !== id),
  ].slice(0, max);
  try {
    await storage.setItem(RESURFACED_HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
