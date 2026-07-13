import { fireEvent, render } from '@testing-library/react-native';

import { ThoughtThreadPanel } from '../ThoughtThreadPanel';

const current = {
  id: 'c',
  text: 'api refactor error handling',
  createdAt: '2026-05-20T10:00:00.000Z',
};

const earlier = [
  {
    id: 'a',
    text: 'api refactor draft',
    createdAt: '2026-05-10T10:00:00.000Z',
  },
];

const later = [
  {
    id: 'b',
    text: 'error handling release',
    createdAt: '2026-05-22T10:00:00.000Z',
  },
];

describe('ThoughtThreadPanel', () => {
  it('renders thread header, shared chips, and earlier/later groups', () => {
    const { getByTestId, getByText } = render(
      <ThoughtThreadPanel
        current={current}
        earlier={earlier}
        later={later}
        onSelect={jest.fn()}
      />,
    );

    expect(getByTestId('thought-thread-panel')).toBeTruthy();
    expect(getByTestId('thought-thread-panel-title')).toBeTruthy();
    expect(getByTestId('thought-thread-panel-subtitle')).toBeTruthy();
    expect(getByText('Linked by shared words')).toBeTruthy();
    expect(getByText('· 2 related')).toBeTruthy();
    expect(getByTestId('thought-thread-shared-chips')).toBeTruthy();
    expect(getByTestId('thought-thread-earlier-label')).toBeTruthy();
    expect(getByTestId('thought-thread-later-label')).toBeTruthy();
  });

  it('returns null when there are no neighbors', () => {
    const { queryByTestId } = render(
      <ThoughtThreadPanel current={current} earlier={[]} later={[]} onSelect={jest.fn()} />,
    );
    expect(queryByTestId('thought-thread-panel')).toBeNull();
  });

  it('calls onSelect when a neighbor row is pressed', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <ThoughtThreadPanel
        current={current}
        earlier={earlier}
        later={later}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByLabelText(/api refactor draft/i));
    expect(onSelect).toHaveBeenCalledWith(earlier[0]);
  });
});
