export type ResurfaceEntry = {
  id: string;
  text: string;
  created_at: string;
  edit_count: number;
  open_count: number;
};

export type TemporalRecallAnchor = '24h' | '7d' | '30d' | 'fallback';

const WINDOW_HOURS = 3;
const MS_PER_HOUR = 3_600_000;
const IMPORTANCE_EDIT_FACTOR = 0.5;
const IMPORTANCE_EDIT_CAP = 2;
const IMPORTANCE_OPEN_FACTOR = 0.2;
const IMPORTANCE_OPEN_CAP = 1.5;
const IMPORTANCE_BOOST_WEIGHT = 0.08;

function parseCreatedAt(iso: string): number | null {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function importanceWeight(entry: ResurfaceEntry): number {
  const edit = Math.min(entry.edit_count * IMPORTANCE_EDIT_FACTOR, IMPORTANCE_EDIT_CAP);
  const open = Math.min(entry.open_count * IMPORTANCE_OPEN_FACTOR, IMPORTANCE_OPEN_CAP);
  return 1 + IMPORTANCE_BOOST_WEIGHT * (edit + open);
}

function chooseWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rng: () => number,
): T | undefined {
  if (items.length === 0) {
    return undefined;
  }
  const weights = items.map(weight);
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return items[0];
  }
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

export function selectEntryForResurface(
  entries: readonly ResurfaceEntry[],
  now: Date,
  excludeIds: ReadonlySet<string>,
  rng: () => number = Math.random,
): { entry: ResurfaceEntry; anchor: TemporalRecallAnchor } | null {
  const nowMs = now.getTime();
  const windowMs = WINDOW_HOURS * MS_PER_HOUR;
  const allowed = entries.filter((e) => !excludeIds.has(e.id));
  if (allowed.length === 0) {
    return null;
  }

  const anchors: Array<{ deltaMs: number; anchor: TemporalRecallAnchor }> = [
    { deltaMs: 24 * MS_PER_HOUR, anchor: '24h' },
    { deltaMs: 7 * 24 * MS_PER_HOUR, anchor: '7d' },
    { deltaMs: 30 * 24 * MS_PER_HOUR, anchor: '30d' },
  ];

  for (const { deltaMs, anchor } of anchors) {
    const targetMs = nowMs - deltaMs;
    const fromMs = targetMs - windowMs;
    const toMs = targetMs + windowMs;
    const inWindow = allowed.filter((e) => {
      const created = parseCreatedAt(e.created_at);
      return created != null && created >= fromMs && created <= toMs;
    });
    if (inWindow.length === 0) {
      continue;
    }
    const picked = chooseWeighted(inWindow, importanceWeight, rng);
    if (picked) {
      return { entry: picked, anchor };
    }
  }

  const picked = chooseWeighted(allowed, importanceWeight, rng);
  return picked ? { entry: picked, anchor: 'fallback' } : null;
}
