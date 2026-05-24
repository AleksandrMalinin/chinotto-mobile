import { selectEchoCandidates, type EchoEngagementRow } from '../selectEchoCandidates';

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

describe('selectEchoCandidates', () => {
  const now = new Date('2026-05-24T12:00:00.000Z');

  it('returns empty for no rows', () => {
    expect(selectEchoCandidates([], 7, now)).toEqual([]);
  });

  it('prefers gravity (recent opens) and drift (old, quiet) slots', () => {
    const rows = [
      row('hot', '2026-05-20T10:00:00.000Z', {
        openCount: 4,
        lastOpenedAt: '2026-05-23T10:00:00.000Z',
      }),
      row('old', '2025-01-10T10:00:00.000Z'),
      row('mid', '2026-04-01T10:00:00.000Z', { openCount: 1 }),
    ];
    const picked = selectEchoCandidates(rows, 5, now);
    const ids = picked.map((e) => e.id);
    expect(ids).toContain('hot');
    expect(ids).toContain('old');
    expect(picked.find((e) => e.id === 'hot')?.kind).toBe('gravity');
    expect(picked.find((e) => e.id === 'old')?.kind).toBe('drift');
  });

  it('dedupes and respects limit', () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row(`e${i}`, `2025-0${(i % 9) + 1}-10T10:00:00.000Z`, { openCount: i % 3 }),
    );
    const picked = selectEchoCandidates(rows, 7, now);
    expect(picked.length).toBeLessThanOrEqual(7);
    expect(new Set(picked.map((e) => e.id)).size).toBe(picked.length);
  });
});
