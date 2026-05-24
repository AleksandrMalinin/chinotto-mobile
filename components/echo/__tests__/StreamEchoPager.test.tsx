import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { StreamEchoPager } from '../StreamEchoPager';

describe('StreamEchoPager', () => {
  it('renders stream only when echo is not mounted', () => {
    const { getByText, queryByTestId } = render(
      <StreamEchoPager
        pageWidth={390}
        echoMounted={false}
        pagerInteractive={false}
        echo={<Text>Echo</Text>}
      >
        <Text>Stream</Text>
      </StreamEchoPager>,
    );

    expect(getByText('Stream')).toBeTruthy();
    expect(queryByTestId('stream-echo-pager')).toBeNull();
  });

  it('renders horizontal pager when echo is mounted', () => {
    const { getByTestId } = render(
      <StreamEchoPager
        pageWidth={390}
        echoMounted={true}
        pagerInteractive={true}
        echo={<Text>Echo</Text>}
      >
        <Text>Stream</Text>
      </StreamEchoPager>,
    );

    expect(getByTestId('stream-echo-pager')).toBeTruthy();
    expect(getByTestId('stream-echo-page')).toBeTruthy();
    expect(getByTestId('stream-home-page')).toBeTruthy();
  });
});
