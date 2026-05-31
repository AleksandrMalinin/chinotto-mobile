import { buildEchoFilamentStations, filamentLinkScore } from '../echoFilament';
import type { EchoCandidate } from '../selectEchoCandidates';

function candidate(
  id: string,
  text: string,
  createdAt: string,
): EchoCandidate {
  return { id, text, createdAt, kind: 'drift' };
}

describe('echoFilament', () => {
  it('filamentLinkScore favors shared stem', () => {
    const a = candidate('1', 'maybe usefulness comes', '2026-01-01T00:00:00.000Z');
    const b = candidate('2', 'maybe usefulness comes again', '2026-01-08T00:00:00.000Z');
    expect(filamentLinkScore(a, b)).toBeGreaterThan(30);
  });

  it('buildEchoFilamentStations chains from primary', () => {
    const pool = [
      candidate('1', 'alpha thread start', '2026-05-01T00:00:00.000Z'),
      candidate('2', 'alpha thread continues', '2026-05-02T00:00:00.000Z'),
      candidate('3', 'unrelated far away', '2024-01-01T00:00:00.000Z'),
    ];
    const thread = buildEchoFilamentStations(pool, 4);
    expect(thread[0]?.id).toBe('1');
    expect(thread.map((s) => s.id)).toContain('2');
  });
});
