import { render } from '@testing-library/react-native';

import { LINES_ONLY_MOTION_END_MS, StreamFlowPanel } from '../StreamFlowPanel';

describe('StreamFlowPanel', () => {
  it('exports line-art end time for first-launch sync shimmer scheduling', () => {
    expect(LINES_ONLY_MOTION_END_MS).toBe(7100);
  });

  it('renders linesOnly without glass card decorations', () => {
    const { toJSON } = render(<StreamFlowPanel linesOnly calm useAdaptiveChrome />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
  });

  it('renders updateBackdrop line art (same shell as linesOnly)', () => {
    const { toJSON } = render(
      <StreamFlowPanel linesOnly updateBackdrop="soft" calm useAdaptiveChrome={false} />,
    );
    expect(toJSON()).not.toBeNull();
  });
});
