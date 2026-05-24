import { AccessibilityInfo } from 'react-native';

import { runEchoEdgePeekAnimation } from '../runEchoEdgePeekAnimation';

describe('runEchoEdgePeekAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('peeks then returns to stream home', async () => {
    const pager = {
      scrollToStream: jest.fn(),
      peekEchoEdge: jest.fn(),
    };

    const resultPromise = runEchoEdgePeekAnimation({ pager, holdMs: 10 });
    await jest.advanceTimersByTimeAsync(10);
    const result = await resultPromise;

    expect(result).toBe('played');
    expect(pager.scrollToStream).toHaveBeenCalledWith(false);
    expect(pager.peekEchoEdge).toHaveBeenCalled();
    expect(pager.scrollToStream).toHaveBeenLastCalledWith(true);
  });

  it('skips when reduce motion is enabled', async () => {
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true);
    const pager = {
      scrollToStream: jest.fn(),
      peekEchoEdge: jest.fn(),
    };

    expect(await runEchoEdgePeekAnimation({ pager })).toBe('skipped_reduce_motion');
    expect(pager.peekEchoEdge).not.toHaveBeenCalled();
  });
});
