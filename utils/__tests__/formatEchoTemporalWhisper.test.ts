import {
  formatEchoTemporalRim,
  formatEchoTemporalWhisper,
} from '../formatEchoTemporalWhisper';

const now = new Date('2026-05-25T12:00:00.000Z');

describe('formatEchoTemporalWhisper', () => {
  it('uses soft distance buckets for primary card', () => {
    expect(formatEchoTemporalWhisper('2026-05-25T08:00:00.000Z', now)).toBe('Today');
    expect(formatEchoTemporalWhisper('2026-05-24T08:00:00.000Z', now)).toBe('Yesterday');
    expect(formatEchoTemporalWhisper('2026-05-20T08:00:00.000Z', now)).toBe('Earlier this week');
    expect(formatEchoTemporalWhisper('2026-05-10T08:00:00.000Z', now)).toBe('A few weeks back');
    expect(formatEchoTemporalWhisper('2026-04-20T08:00:00.000Z', now)).toBe('From last month');
    expect(formatEchoTemporalWhisper('2026-02-01T08:00:00.000Z', now)).toBe('Earlier this year');
    expect(formatEchoTemporalWhisper('2025-06-01T08:00:00.000Z', now)).toBe('From last year');
    expect(formatEchoTemporalWhisper('2020-01-01T08:00:00.000Z', now)).toBe('Long before');
  });
});

describe('formatEchoTemporalRim', () => {
  it('uses shorter rim labels', () => {
    expect(formatEchoTemporalRim('2026-05-20T08:00:00.000Z', now)).toBe('This week');
    expect(formatEchoTemporalRim('2026-05-10T08:00:00.000Z', now)).toBe('Few weeks');
    expect(formatEchoTemporalRim('2026-04-20T08:00:00.000Z', now)).toBe('Last month');
    expect(formatEchoTemporalRim('2025-08-01T08:00:00.000Z', now)).toBe('Last year');
    expect(formatEchoTemporalRim('2020-01-01T08:00:00.000Z', now)).toBe('Long ago');
  });
});
