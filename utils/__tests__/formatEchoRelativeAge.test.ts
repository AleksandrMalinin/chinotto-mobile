import { formatEchoRelativeAge } from '../formatEchoRelativeAge';

describe('formatEchoRelativeAge', () => {
  const now = new Date('2026-05-24T12:00:00.000Z');

  it('returns human relative phrases, not clock time', () => {
    expect(formatEchoRelativeAge('2026-05-24T08:00:00.000Z', now)).toBe('Today');
    expect(formatEchoRelativeAge('2026-05-23T08:00:00.000Z', now)).toBe('Yesterday');
    expect(formatEchoRelativeAge('2026-05-10T08:00:00.000Z', now)).toBe('2 weeks ago');
    expect(formatEchoRelativeAge('2025-01-01T08:00:00.000Z', now)).toBe('1 year ago');
  });
});
