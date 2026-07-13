import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CaptureMicRail } from '../CaptureMicRail';

describe('CaptureMicRail', () => {
  it('renders mic content in the capture first-line rail', () => {
    const { getByTestId } = render(
      <CaptureMicRail captureLineHeight={30}>
        <Text testID="mic-child">mic</Text>
      </CaptureMicRail>,
    );

    expect(getByTestId('capture-mic-rail')).toBeTruthy();
    expect(getByTestId('mic-child')).toBeTruthy();
  });
});
