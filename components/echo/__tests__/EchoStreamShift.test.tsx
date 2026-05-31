import { Animated, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { EchoStreamShift } from '../EchoStreamShift';

describe('EchoStreamShift', () => {
  it('renders stream only when echo is not mounted', () => {
    const scrollX = new Animated.Value(390);
    const { getByText, queryByTestId } = render(
      <EchoStreamShift
        pageWidth={390}
        scrollX={scrollX}
        echoMounted={false}
        interactive={false}
        echo={<Text>Echo</Text>}
      >
        <Text>Stream</Text>
      </EchoStreamShift>,
    );
    expect(getByText('Stream')).toBeTruthy();
    expect(queryByTestId('echo-stream-shift')).toBeNull();
  });

  it('renders shift shell when echo is mounted', () => {
    const scrollX = new Animated.Value(390);
    const { getByTestId } = render(
      <EchoStreamShift
        pageWidth={390}
        scrollX={scrollX}
        echoMounted
        interactive
        echo={<Text>Echo</Text>}
      >
        <Text>Stream</Text>
      </EchoStreamShift>,
    );
    expect(getByTestId('echo-stream-shift')).toBeTruthy();
  });
});
