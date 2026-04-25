import { shouldDeferShareAck, shouldShowShareSavedAck } from '../shareAckTiming';

describe('shareAckTiming', () => {
  it('defers ack while not on main', () => {
    expect(shouldDeferShareAck('boot')).toBe(true);
    expect(shouldDeferShareAck('brand')).toBe(true);
    expect(shouldDeferShareAck('main')).toBe(false);
  });

  it('shows ack on main when pending or already visible', () => {
    expect(shouldShowShareSavedAck('brand', true, false)).toBe(false);
    expect(shouldShowShareSavedAck('main', true, false)).toBe(true);
    expect(shouldShowShareSavedAck('main', false, true)).toBe(true);
    expect(shouldShowShareSavedAck('main', false, false)).toBe(false);
  });
});
