import type { Entry } from '../types/entry';

const DEMO_ID_PREFIX = 'demo-stream-';

/**
 * Stable copy + timestamps so grouping in RecentList is deterministic.
 * Ids use {@link DEMO_ID_PREFIX} so deletes are no-ops against SQLite.
 */
export const DEMO_STREAM_ENTRIES: Entry[] = [
  {
    id: `${DEMO_ID_PREFIX}1`,
    text: 'The idea is not to organize the thought — it is to catch it before it evaporates',
    createdAt: '2026-04-04T14:22:00.000Z',
  },
  {
    id: `${DEMO_ID_PREFIX}2`,
    text: 'Mobile enables sync — desktop makes it feel real',
    createdAt: '2026-04-03T09:15:00.000Z',
  },
  {
    id: `${DEMO_ID_PREFIX}3`,
    text: 'Rest is not expecting anything from yourself',
    createdAt: '2026-04-02T18:40:00.000Z',
  },
  {
    id: `${DEMO_ID_PREFIX}4`,
    text: 'https://getchinotto.app/',
    createdAt: '2026-04-02T16:23:00.000Z',
  },
  {
    id: `${DEMO_ID_PREFIX}5`,
    text: 'Maybe usefulness comes from transparency and simplicity',
    createdAt: '2026-03-28T11:05:00.000Z',
  },
  {
    id: `${DEMO_ID_PREFIX}6`,
    text: 'Thoughts could cluster over time',
    createdAt: '2026-03-28T22:11:00.000Z',
  },
];

export function isDemoStreamEntryId(id: string): boolean {
  return id.startsWith(DEMO_ID_PREFIX);
}

/** Merge demo rows with local DB rows; real entries win on id collision. Newest first. */
export function mergeDemoStreamWithEntries(real: Entry[], demoOn: boolean): Entry[] {
  if (!demoOn) {
    return real;
  }
  const byId = new Map<string, Entry>();
  for (const e of DEMO_STREAM_ENTRIES) {
    byId.set(e.id, e);
  }
  for (const e of real) {
    byId.set(e.id, e);
  }
  return [...byId.values()].sort((a, b) => {
    const ta = Date.parse(a.createdAt);
    const tb = Date.parse(b.createdAt);
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) {
      return tb - ta;
    }
    return b.id.localeCompare(a.id);
  });
}
