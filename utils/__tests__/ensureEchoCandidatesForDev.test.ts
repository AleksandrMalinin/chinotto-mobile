import { ensureEchoCandidatesForDev } from '../ensureEchoCandidatesForDev';

describe('ensureEchoCandidatesForDev', () => {
  it('returns candidates unchanged when non-empty', () => {
    const rows = [
      { id: '1', text: 'a', createdAt: '2025-01-01T00:00:00.000Z', kind: 'temporal' as const, reason: 'From last week' },
    ];
    expect(ensureEchoCandidatesForDev(rows, [])).toEqual(rows);
  });

  it('in dev runtime seeds from stream when DB list is empty', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const out = ensureEchoCandidatesForDev([], [
      { id: 's1', text: 'stream thought', createdAt: '2025-02-01T00:00:00.000Z' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe('temporal');
    process.env.NODE_ENV = env;
  });
});
