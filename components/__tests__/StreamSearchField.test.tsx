import { fireEvent, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StreamSearchField } from '../StreamSearchField';

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('StreamSearchField', () => {
  it('shows a search pill when collapsed', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          expanded={false}
          focused={false}
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('stream-search-toggle')).toBeTruthy();
    expect(getByText('Find a word in your stream')).toBeTruthy();
  });

  it('enables glass shell when glassSticky', () => {
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          glassSticky
          expanded={false}
          focused={false}
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('stream-search-toggle')).toBeTruthy();
    expect(getByText('Find a word in your stream')).toBeTruthy();
  });

  it('renders search miss copy in the result meta line', () => {
    const { getByTestId, getByText } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          expanded
          focused
          value="nope"
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
          resultLabel="No thoughts with those words."
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('stream-search-result-label')).toBeTruthy();
    expect(getByText('No thoughts with those words.')).toBeTruthy();
  });

  it('renders expanded field and result label', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          expanded
          focused
          value="rest"
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
          resultLabel="2 thoughts"
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('stream-search-input')).toBeTruthy();
    expect(getByText('rest')).toBeTruthy();
    expect(queryByTestId('stream-search-placeholder')).toBeNull();
    expect(getByText('2 thoughts')).toBeTruthy();
    expect(getByTestId('stream-search-result-label')).toBeTruthy();
  });

  it('shows centered placeholder overlay when expanded and empty', () => {
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          expanded
          focused
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(getByTestId('stream-search-placeholder')).toHaveTextContent('Type a word or phrase…');
  });

  it('forwards ref to the TextInput when expanded', () => {
    const ref = createRef<TextInput>();
    render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          ref={ref}
          expanded
          focused={false}
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={jest.fn()}
          onPressClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    expect(ref.current).not.toBeNull();
  });

  it('calls onPressExpand from collapsed pill', () => {
    const onPressExpand = jest.fn();
    const { getByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <StreamSearchField
          expanded={false}
          focused={false}
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          onPressExpand={onPressExpand}
          onPressClose={jest.fn()}
        />
      </SafeAreaProvider>,
    );

    fireEvent.press(getByTestId('stream-search-toggle'));
    expect(onPressExpand).toHaveBeenCalledTimes(1);
  });
});
