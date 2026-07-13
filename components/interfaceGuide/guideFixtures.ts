import type { Entry } from '../../types/entry';
import type { MonthSummary } from '../../types/temporal';
import type { EchoCandidate } from '../../utils/selectEchoCandidates';

export const GUIDE_ENTRY_CURRENT: Entry = {
  id: 'guide-current',
  text: 'api refactor error handling',
  createdAt: '2026-06-20T10:00:00.000Z',
};

export const GUIDE_ENTRY_EARLIER: Entry = {
  id: 'guide-earlier',
  text: 'api refactor draft notes',
  createdAt: '2026-06-10T09:00:00.000Z',
};

export const GUIDE_ENTRY_LATER: Entry = {
  id: 'guide-later',
  text: 'error handling release checklist',
  createdAt: '2026-06-22T11:00:00.000Z',
};

export const GUIDE_STREAM_ROWS: Entry[] = [
  GUIDE_ENTRY_CURRENT,
  {
    id: 'guide-row-2',
    text: 'walk notes from the park',
    createdAt: '2026-06-19T18:00:00.000Z',
  },
  {
    id: 'guide-row-3',
    text: 'book chapter three ideas',
    createdAt: '2026-06-18T08:00:00.000Z',
  },
];

export const GUIDE_ECHO_CANDIDATE: EchoCandidate = {
  ...GUIDE_ENTRY_EARLIER,
  kind: 'gravity',
  reason: 'From earlier',
  trailNeighborCount: 2,
};

export const GUIDE_MONTHS: MonthSummary[] = [
  {
    monthKey: '2026-04',
    count: 4,
    newestCreatedAt: '2026-04-28T10:00:00.000Z',
    newestEntryId: 'm1',
  },
  {
    monthKey: '2026-05',
    count: 9,
    newestCreatedAt: '2026-05-30T10:00:00.000Z',
    newestEntryId: 'm2',
  },
  {
    monthKey: '2026-06',
    count: 6,
    newestCreatedAt: '2026-06-20T10:00:00.000Z',
    newestEntryId: GUIDE_ENTRY_CURRENT.id,
  },
];
