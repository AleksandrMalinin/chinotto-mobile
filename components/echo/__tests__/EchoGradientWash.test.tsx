import { render } from '@testing-library/react-native';

import { EchoGradientWash } from '../EchoGradientWash';
import { echoChromeColors } from '../echoChrome';

describe('EchoGradientWash', () => {
  it('renders a soft plum vertical wash', () => {
    const chrome = echoChromeColors(true);
    const { getByTestId } = render(<EchoGradientWash chrome={chrome} />);
    const wash = getByTestId('echo-gradient-wash');
    expect(wash.props.colors[0]).toBe(chrome.echoGradientTop);
    expect(wash.props.colors[2]).toBe(chrome.echoGradientBottom);
  });
});
