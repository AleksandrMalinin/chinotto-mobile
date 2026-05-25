import {
  isStreamFocusSkimming,
  resolveSettledActiveFlatIndex,
} from '../streamFocusSettle';

describe('streamFocusSettle', () => {
  it('detects skim when velocity exceeds threshold', () => {
    expect(isStreamFocusSkimming(121)).toBe(true);
    expect(isStreamFocusSkimming(-200)).toBe(true);
    expect(isStreamFocusSkimming(80)).toBe(false);
  });

  it('holds settled index while skimming', () => {
    expect(resolveSettledActiveFlatIndex(3, 1, 200)).toBe(1);
  });

  it('adopts geometry when idle', () => {
    expect(resolveSettledActiveFlatIndex(3, 1, 0)).toBe(3);
  });

  it('uses geometry when skimming but never settled', () => {
    expect(resolveSettledActiveFlatIndex(2, -1, 300)).toBe(2);
  });
});
