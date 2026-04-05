import type { Entry } from '../../types/entry';

/**
 * Stable copy + timestamps for App Store marketing captures (screenshot mode).
 * Dates are fixed ISO strings so grouping in RecentList is deterministic.
 */
export const SCREENSHOT_DEMO_ENTRIES: Entry[] = [
  {
    id: 'screenshot-demo-1',
    text: 'The idea is not to organize the thought — it is to catch it before it evaporates',
    createdAt: '2026-04-04T14:22:00.000Z',
  },
  {
    id: 'screenshot-demo-2',
    text: 'Mobile enables sync — desktop makes it feel real',
    createdAt: '2026-04-03T09:15:00.000Z',
  },
  {
    id: 'screenshot-demo-3',
    text: 'Rest is not expecting anything from yourself',
    createdAt: '2026-04-02T18:40:00.000Z',
  },
  {
    id: 'screenshot-demo-4',
    text: 'https://getchinotto.app/',
    createdAt: '2026-04-02T16:23:00.000Z',
  },
  {
    id: 'screenshot-demo-5',
    text: 'Maybe usefulness comes from transparency and simplicity',
    createdAt: '2026-03-28T11:05:00.000Z',
  },
  {
    id: 'screenshot-demo-6',
    text: 'Thoughts could cluster over time',
    createdAt: '2026-03-28T22:11:00.000Z',
  },
];

/** Optional line in the composer for “typing” marketing shots; leave empty for a clean field. */
export const SCREENSHOT_DEMO_COMPOSER_TEXT = '';
