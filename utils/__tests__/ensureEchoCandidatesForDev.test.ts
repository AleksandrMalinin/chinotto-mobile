import { ensureEchoCandidatesForDev } from '../ensureEchoCandidatesForDev';

describe('ensureEchoCandidatesForDev', () => {
  it('returns candidates unchanged when non-empty', () => {
    const rows = [
      { id: '1', text: 'a', createdAt: '2025-01-01T00:00:00.000Z', kind: 'temporal' as const, reason: 'From last week' },
    ];
    expect(ensureEchoCandidatesForDev(rows, [])).toEqual(rows);
  });

  it('in dev runtime seeds synthetic when stream is only recent window', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const out = ensureEchoCandidatesForDev([], [
      { id: 's1', text: 'stream thought', createdAt: '2025-02-01T00:00:00.000Z' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('__dev_echo_seed__');
    process.env.NODE_ENV = env;
  });

  it('in dev runtime seeds from outside recent stream when stream is deep enough', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const stream = Array.from({ length: 6 }, (_, index) => ({
      id: `s${index}`,
      text: `thought ${index}`,
      createdAt: `2025-01-0${index + 1}T00:00:00.000Z`,
    }));
    const out = ensureEchoCandidatesForDev([], stream);
    expect(out[0]?.id).toBe('s5');
    process.env.NODE_ENV = env;
  });

  it('does not re-inject suppressed dev candidates after dismiss', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const stream = Array.from({ length: 6 }, (_, index) => ({
      id: `s${index}`,
      text: `thought ${index}`,
      createdAt: `2025-01-0${index + 1}T00:00:00.000Z`,
    }));
    const suppressed = new Set(['s5']);
    expect(ensureEchoCandidatesForDev([], stream, suppressed)).toEqual([]);
    process.env.NODE_ENV = env;
  });
});
