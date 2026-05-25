import { motion } from '../../constants/motion';

describe('motion scale', () => {
  it('orders pacing slowest on echo, fastest on capture press', () => {
    expect(motion.stream.focusOpacity).toBeGreaterThan(motion.capture.standard);
    expect(motion.echo.pagerRevealIn).toBeGreaterThanOrEqual(motion.stream.focusOpacity);
    expect(motion.stream.pressIn).toBeLessThan(motion.capture.standard);
  });

});
