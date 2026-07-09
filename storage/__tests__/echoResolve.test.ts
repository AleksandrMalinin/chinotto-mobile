import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordEchoCandidatesDisplayed } from '../echoLayerPrefs';
import { buildEchoCandidates } from '../echoResolve';
import { markAsShown } from '../resurfaceSession';
import type { EchoEngagementRow } from '../../utils/selectEchoCandidates';

function row(
  id: string,
  createdAt: string,
  opts: Partial<Pick<EchoEngagementRow, 'openCount' | 'editCount' | 'lastOpenedAt'>> = {},
): EchoEngagementRow {
  return {
    entry: { id, text: `thought ${id}`, createdAt },
    openCount: opts.openCount ?? 0,
    editCount: opts.editCount ?? 0,
    lastOpenedAt: opts.lastOpenedAt ?? null,
  };
}

describe('buildEchoCandidates', () => {
  const now = new Date('2026-05-24T12:00:00.000Z');

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns one temporal recall candidate with reason copy', async () => {
    const rows = [
      row('week', '2026-05-17T10:00:00.000Z'),
      row('noise', '2026-05-23T10:00:00.000Z'),
    ];
    const picked = await buildEchoCandidates({
      rows,
      limit: 1,
      now,
      rng: () => 0,
    });
    expect(picked).toHaveLength(1);
    expect(picked[0]?.kind).toBe('temporal');
    expect(picked[0]?.reason).toMatch(/^From /);
  });

  it('excludes displayed entries in cooldown', async () => {
    const shown = new Date('2026-05-01T10:00:00.000Z');
    const now = new Date('2026-05-16T12:00:00.000Z');
    await recordEchoCandidatesDisplayed(['stale'], shown);
    const rows = [
      row('stale', '2026-05-09T10:00:00.000Z', { openCount: 3, editCount: 0 }),
      row('fresh', '2026-05-08T10:00:00.000Z'),
    ];
    const picked = await buildEchoCandidates({ rows, limit: 1, now, rng: () => 0 });
    expect(picked.every((c) => c.id !== 'stale')).toBe(true);
    expect(picked[0]?.id).toBe('fresh');
  });

  it('excludes resurfaced entries in 7-day cooldown', async () => {
    const now = new Date('2026-05-24T12:00:00.000Z');
    await markAsShown('blocked');
    const rows = [
      row('blocked', '2026-05-17T10:00:00.000Z'),
      row('open', '2026-05-16T10:00:00.000Z'),
    ];
    const picked = await buildEchoCandidates({ rows, limit: 1, now, rng: () => 0 });
    expect(picked[0]?.id).toBe('open');
  });
});
