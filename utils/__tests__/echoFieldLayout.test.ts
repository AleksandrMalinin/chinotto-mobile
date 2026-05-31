import {
  echoFieldRingRadiusNorm,
  echoFieldSpanPx,
  layoutEchoFieldNodes,
} from '../echoFieldLayout';
import type { EchoCandidate } from '../selectEchoCandidates';

function candidate(
  id: string,
  kind: EchoCandidate['kind'] = 'drift',
): EchoCandidate {
  return {
    id,
    text: `thought ${id}`,
    createdAt: '2026-05-01T10:00:00.000Z',
    kind,
  };
}

describe('layoutEchoFieldNodes', () => {
  it('returns empty for no candidates', () => {
    expect(layoutEchoFieldNodes([])).toEqual([]);
  });

  it('anchors primary at center', () => {
    const [primary] = layoutEchoFieldNodes([candidate('1', 'gravity')]);
    expect(primary?.ox).toBe(0);
    expect(primary?.oy).toBe(0);
  });

  it('spaces satellites on a ring with distinct offsets', () => {
    const nodes = layoutEchoFieldNodes([
      candidate('1', 'gravity'),
      candidate('2', 'drift'),
      candidate('3', 'drift'),
      candidate('4', 'drift'),
    ]);
    const satellites = nodes.slice(1);
    const distances = satellites.map((n) => Math.hypot(n.ox, n.oy));
    expect(distances.every((d) => d > 0.35)).toBe(true);
    const uniq = new Set(satellites.map((n) => `${n.ox.toFixed(2)},${n.oy.toFixed(2)}`));
    expect(uniq.size).toBe(satellites.length);
  });

  it('respects maxNodes cap', () => {
    const pool = Array.from({ length: 8 }, (_, i) => candidate(String(i)));
    expect(layoutEchoFieldNodes(pool, 3)).toHaveLength(3);
  });
});

describe('echoFieldRingRadiusNorm', () => {
  it('grows with more satellites', () => {
    expect(echoFieldRingRadiusNorm(4)).toBeGreaterThan(echoFieldRingRadiusNorm(1));
  });
});

describe('echoFieldSpanPx', () => {
  it('scales with viewport', () => {
    expect(echoFieldSpanPx(400, 300)).toBeGreaterThan(echoFieldSpanPx(200, 300));
  });
});
