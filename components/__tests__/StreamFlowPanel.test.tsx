import { render } from '@testing-library/react-native';

import { StreamFlowPanel } from '../StreamFlowPanel';

describe('StreamFlowPanel', () => {
  it('renders linesOnly without glass card decorations', () => {
    const { toJSON } = render(<StreamFlowPanel linesOnly calm useAdaptiveChrome />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
  });
});
