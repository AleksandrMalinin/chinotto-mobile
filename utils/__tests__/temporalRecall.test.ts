import { selectEntryForResurface } from '../temporalRecall';

function entry(id: string, createdAt: string) {
  return {
    id,
    text: `thought ${id}`,
    created_at: createdAt,
    edit_count: 0,
    open_count: 0,
  };
}

describe('selectEntryForResurface', () => {
  const now = new Date('2026-05-24T12:00:00.000Z');

  it('prefers the 7d anchor window', () => {
    const picked = selectEntryForResurface(
      [
        entry('week', '2026-05-17T10:00:00.000Z'),
        entry('old', '2026-04-01T10:00:00.000Z'),
      ],
      now,
      new Set(),
      () => 0,
    );
    expect(picked?.entry.id).toBe('week');
    expect(picked?.anchor).toBe('7d');
  });

  it('skips excluded ids', () => {
    const picked = selectEntryForResurface(
      [entry('blocked', '2026-05-17T10:00:00.000Z'), entry('open', '2026-05-16T10:00:00.000Z')],
      now,
      new Set(['blocked']),
      () => 0,
    );
    expect(picked?.entry.id).toBe('open');
  });
});
