import { render } from '@testing-library/react-native';

import { StreamFlowPanel } from '../StreamFlowPanel';

describe('StreamFlowPanel', () => {
  it('renders linesOnly without glass card decorations', () => {
    const { toJSON } = render(<StreamFlowPanel linesOnly calm useAdaptiveChrome />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
  });

  it('renders linesOnly with blobs when linesOnlyBlobs', () => {
    const { toJSON } = render(
      <StreamFlowPanel linesOnly linesOnlyBlobs calm useAdaptiveChrome={false} />
    );
    expect(toJSON()).not.toBeNull();
  });

  it('renders subdued ambient when ambientSubdued', () => {
    const { toJSON } = render(
      <StreamFlowPanel
        linesOnly
        linesOnlyBlobs
        ambientSubdued
        calm
        useAdaptiveChrome={false}
      />
    );
    expect(toJSON()).not.toBeNull();
  });
});
