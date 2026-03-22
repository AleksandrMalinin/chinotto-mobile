import { render } from '@testing-library/react-native';

import { BrandSplashAmbient } from '../BrandSplashAmbient';

describe('BrandSplashAmbient', () => {
  it('renders', () => {
    const { getByTestId } = render(<BrandSplashAmbient />);
    expect(getByTestId('brand-splash-ambient')).toBeTruthy();
  });
});
