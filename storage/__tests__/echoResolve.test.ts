import AsyncStorage from '@react-native-async-storage/async-storage';

import { recordEchoCandidatesDisplayed } from '../echoLayerPrefs';
import { buildEchoCandidates } from '../echoResolve';
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

  it('returns scored candidates with cooldown and session prefs applied', async () => {
    const rows = [
      row('hot', '2026-05-20T10:00:00.000Z', {
        openCount: 4,
        lastOpenedAt: '2026-05-23T10:00:00.000Z',
      }),
      row('old', '2025-01-10T10:00:00.000Z'),
    ];
    const picked = await buildEchoCandidates({ rows, limit: 5, now });
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.some((c) => c.kind === 'gravity' || c.kind === 'drift')).toBe(true);
  });

  it('excludes displayed entries longer when opened without edit', async () => {
    const shown = new Date('2026-05-01T10:00:00.000Z');
    const now = new Date('2026-05-16T12:00:00.000Z');
    await recordEchoCandidatesDisplayed(['stale'], shown);
    const rows = [
      row('stale', '2025-01-10T10:00:00.000Z', { openCount: 3, editCount: 0 }),
      row('fresh', '2025-02-10T10:00:00.000Z'),
    ];
    const picked = await buildEchoCandidates({ rows, limit: 5, now });
    expect(picked.every((c) => c.id !== 'stale')).toBe(true);
    expect(picked.some((c) => c.id === 'fresh')).toBe(true);
  });
});
