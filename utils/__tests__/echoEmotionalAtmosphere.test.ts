import {
  echoEmotionalIntensityFromEntries,
  echoEmotionalIntensityFromText,
} from '../echoEmotionalAtmosphere';

describe('echoEmotionalAtmosphere', () => {
  it('raises intensity for open questions and ellipsis', () => {
    expect(echoEmotionalIntensityFromText('What if this keeps happening?')).toBeGreaterThan(0.2);
    expect(echoEmotionalIntensityFromText('Still forming...')).toBeGreaterThan(0.15);
  });

  it('returns low intensity for neutral statements', () => {
    expect(echoEmotionalIntensityFromText('Lunch was fine today')).toBeLessThan(0.15);
  });

  it('echoEmotionalIntensityFromEntries uses max across pool', () => {
    const intensity = echoEmotionalIntensityFromEntries([
      { id: '1', text: 'Calm day', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: '2', text: 'Why now??', createdAt: '2026-01-02T00:00:00.000Z' },
    ]);
    expect(intensity).toBeGreaterThan(0.2);
  });
});
