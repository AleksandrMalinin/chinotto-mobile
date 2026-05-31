import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { EchoSpatialBackground } from '../EchoSpatialBackground';
import { echoChromeColors } from '../echoChrome';

describe('EchoSpatialBackground', () => {
  it('dims stream ambient and layers plum echo wash when pager is mounted', () => {
    const scrollX = new Animated.Value(195);
    const { getByTestId } = render(
      <EchoSpatialBackground
        scrollX={scrollX}
        pageWidth={390}
        echoMounted
        chrome={echoChromeColors(true)}
      />,
    );

    expect(getByTestId('echo-spatial-stream-bg')).toBeTruthy();
    expect(getByTestId('echo-spatial-echo-bg')).toBeTruthy();
    expect(getByTestId('echo-gradient-wash')).toBeTruthy();
  });

  it('renders stream ambient only when echo is not mounted', () => {
    const scrollX = new Animated.Value(390);
    const { queryByTestId } = render(
      <EchoSpatialBackground
        scrollX={scrollX}
        pageWidth={390}
        echoMounted={false}
        chrome={echoChromeColors(true)}
      />,
    );

    expect(queryByTestId('echo-spatial-echo-bg')).toBeNull();
    expect(queryByTestId('echo-spatial-stream-bg')).toBeNull();
  });
});
