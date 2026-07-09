import { fireEvent, render } from '@testing-library/react-native';

import { EchoRecallCardVessel } from '../EchoRecallCardVessel';
import { echoChromeColors } from '../echoChrome';

const sampleCandidate = {
  id: 'a',
  text: 'API refactor needs error handling',
  createdAt: '2026-05-01T10:00:00.000Z',
  kind: 'temporal' as const,
  reason: 'From last week',
  trailNeighborCount: 2,
};

describe('EchoRecallCardVessel', () => {
  it('renders memory echo layout with meta above card and resume cta', () => {
    const { getByText, queryByTestId, queryByText } = render(
      <EchoRecallCardVessel candidate={sampleCandidate} chrome={echoChromeColors(true)} />,
    );
    expect(getByText(/from last week/i)).toBeTruthy();
    expect(getByText(/Part of a thread with 2 related thoughts/)).toBeTruthy();
    expect(getByText('API refactor needs error handling')).toBeTruthy();
    expect(getByText('Resume')).toBeTruthy();
    expect(queryByTestId('echo-recall-ghosts')).toBeNull();
    expect(queryByText('Memory')).toBeNull();
    expect(queryByText('Today')).toBeNull();
  });

  it('calls onDismiss when dismiss control is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <EchoRecallCardVessel
        candidate={sampleCandidate}
        chrome={echoChromeColors(true)}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.press(getByTestId('echo-recall-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
