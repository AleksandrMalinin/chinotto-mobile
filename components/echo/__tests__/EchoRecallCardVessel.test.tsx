import { render } from '@testing-library/react-native';

import { EchoRecallCardVessel } from '../EchoRecallCardVessel';
import { echoChromeColors } from '../echoChrome';

describe('EchoRecallCardVessel', () => {
  it('renders centered fragment with body mass and ghost traces', () => {
    const { getByText, getByTestId, queryByText } = render(
      <EchoRecallCardVessel
        candidate={{
          id: 'a',
          text: 'API refactor needs error handling',
          createdAt: '2026-05-01T10:00:00.000Z',
          kind: 'temporal',
          reason: 'From last week',
          ghostTraces: ['Earlier thread about auth tokens…', 'Later note on deploy…'],
        }}
        chrome={echoChromeColors(true)}
      />,
    );
    expect(getByText('From last week')).toBeTruthy();
    expect(getByText('API refactor needs error handling')).toBeTruthy();
    expect(getByText('Resume')).toBeTruthy();
    expect(getByTestId('echo-recall-ghosts')).toBeTruthy();
    expect(getByText(/Earlier thread about auth tokens/)).toBeTruthy();
    expect(queryByText('Memory')).toBeNull();
    expect(queryByText('Swipe left to return')).toBeNull();
  });
});
