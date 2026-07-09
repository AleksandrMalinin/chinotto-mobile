import { render } from '@testing-library/react-native';

import { AmbientBackground } from '../AmbientBackground';

describe('AmbientBackground', () => {
  it('renders the capture shell background', () => {
    expect(() => render(<AmbientBackground />)).not.toThrow();
  });
});
