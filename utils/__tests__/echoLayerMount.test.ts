import { isEchoLayerMountedForCapture } from '../echoLayerMount';

describe('isEchoLayerMountedForCapture', () => {
  const base = {
    active: true,
    searchActive: false,
    readSheetOpen: false,
    totalEntryCount: 5,
    candidateCount: 1,
  };

  it('blocks when search or sheet is open', () => {
    expect(isEchoLayerMountedForCapture({ ...base, searchActive: true })).toBe(false);
    expect(isEchoLayerMountedForCapture({ ...base, readSheetOpen: true })).toBe(false);
  });

  it('in dev runtime mounts with one candidate regardless of entry count', () => {
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    expect(
      isEchoLayerMountedForCapture({
        ...base,
        totalEntryCount: 2,
        candidateCount: 1,
      }),
    ).toBe(true);
    process.env.NODE_ENV = env;
  });
});
