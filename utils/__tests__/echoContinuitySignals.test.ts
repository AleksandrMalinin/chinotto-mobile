import {
  getEchoInterruptionPrimaryId,
  isUnfinishedEntryText,
  unfinishedContinuityScore,
} from '../echoContinuitySignals';
import type { EchoEngagementRow } from '../selectEchoCandidates';

function row(
  id: string,
  text: string,
  opts: Partial<Pick<EchoEngagementRow, 'openCount' | 'editCount' | 'lastOpenedAt'>> = {},
): EchoEngagementRow {
  return {
    entry: { id, text, createdAt: '2026-05-01T10:00:00.000Z' },
    openCount: opts.openCount ?? 0,
    editCount: opts.editCount ?? 0,
    lastOpenedAt: opts.lastOpenedAt ?? null,
  };
}

describe('echoContinuitySignals', () => {
  it('detects unfinished text endings', () => {
    expect(isUnfinishedEntryText('Still thinking...')).toBe(true);
    expect(isUnfinishedEntryText('What if?')).toBe(true);
    expect(isUnfinishedEntryText('Done for today')).toBe(false);
  });

  it('getEchoInterruptionPrimaryId prefers unfinished after long away', () => {
    const rows = [
      row('plain', 'A complete thought'),
      row('open', 'Still forming...', { openCount: 3 }),
    ];
    const id = getEchoInterruptionPrimaryId(rows, {
      lastBackgroundAtIso: '2026-05-24T08:00:00.000Z',
      sessionThread: null,
    }, new Date('2026-05-24T12:00:00.000Z'));
    expect(id).toBe('open');
  });

  it('unfinishedContinuityScore boosts ellipsis entries', () => {
    expect(unfinishedContinuityScore(row('x', 'Wait...'))).toBeGreaterThan(0);
  });
});
