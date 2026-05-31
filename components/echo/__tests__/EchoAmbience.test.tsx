import { render } from '@testing-library/react-native';

import { EchoAmbience } from '../EchoAmbience';
import { echoChromeColors } from '../echoChrome';

describe('EchoAmbience', () => {
  it('renders full-stack wash', () => {
    const { getByTestId } = render(<EchoAmbience chrome={echoChromeColors(true)} />);
    expect(getByTestId('echo-ambience')).toBeTruthy();
    expect(getByTestId('echo-gradient-wash')).toBeTruthy();
  });
});
