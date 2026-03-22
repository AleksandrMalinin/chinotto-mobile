import { render } from '@testing-library/react-native';

import { IntroRadialBlobView } from '../introRadialBlob';

describe('IntroRadialBlobView', () => {
  it('renders a soft radial blob', () => {
    const { getByTestId } = render(
      <IntroRadialBlobView size={80} profile="violet" gradientId="test-grad-v" />
    );
    expect(getByTestId('intro-radial-blob')).toBeTruthy();
  });
});
