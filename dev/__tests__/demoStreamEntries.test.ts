import { DEMO_STREAM_ENTRIES, mergeDemoStreamWithEntries } from '../demoStreamEntries';

describe('mergeDemoStreamWithEntries', () => {
  it('returns real list when demo is off', () => {
    const real = [{ id: 'a', text: 'x', createdAt: '2026-01-01T00:00:00.000Z' }];
    expect(mergeDemoStreamWithEntries(real, false)).toEqual(real);
  });

  it('includes demo rows and sorts newest first', () => {
    const real = [{ id: 'user-1', text: 'mine', createdAt: '2026-01-01T00:00:00.000Z' }];
    const merged = mergeDemoStreamWithEntries(real, true);
    expect(merged[0].id).toBe(DEMO_STREAM_ENTRIES[0].id);
    expect(merged.some((e) => e.id === 'user-1')).toBe(true);
  });

  it('real entry overrides demo on same id', () => {
    const demoId = DEMO_STREAM_ENTRIES[0].id;
    const real = [{ id: demoId, text: 'overridden', createdAt: DEMO_STREAM_ENTRIES[0].createdAt }];
    const merged = mergeDemoStreamWithEntries(real, true);
    const row = merged.find((e) => e.id === demoId);
    expect(row?.text).toBe('overridden');
  });
});
