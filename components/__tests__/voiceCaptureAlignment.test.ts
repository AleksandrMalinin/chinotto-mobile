import { typography } from '../../theme';
import {
  captureMicMarginTop,
  voiceMicClusterOverflowPadTop,
  VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP,
} from '../voiceCaptureAlignment';

describe('voiceCaptureAlignment', () => {
  it('centers mic lower for hero capture line height', () => {
    expect(typography.captureHero.lineHeight).toBe(typography.capture.lineHeight);
    const margin = captureMicMarginTop(typography.capture.lineHeight);
    expect(margin).toBeLessThan(6);
  });

  it('pads cluster top when mic margin is negative', () => {
    const pad = voiceMicClusterOverflowPadTop(typography.capture.lineHeight);
    expect(pad).toBe(VOICE_MIC_CLUSTER_OVERFLOW_PAD_TOP);
    expect(pad).toBeGreaterThanOrEqual(0);
  });
});
