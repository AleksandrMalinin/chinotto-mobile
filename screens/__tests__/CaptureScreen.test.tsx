import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as entryRepository from '../../storage/entryRepository';
import { CaptureScreen } from '../CaptureScreen';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
}));

jest.mock('../../storage/entryRepository', () => ({
  saveEntry: jest.fn(() =>
    Promise.resolve({
      id: '1',
      text: 'hello',
      createdAt: '2025-01-01T00:00:00.000Z',
    })
  ),
  getRecentEntries: jest.fn(() => Promise.resolve([])),
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe('CaptureScreen', () => {
  it('calls saveEntry with trimmed text on submit and clears the field', async () => {
    const { getByTestId, findByTestId } = render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CaptureScreen />
      </SafeAreaProvider>
    );

    const input = await findByTestId('capture-input');
    fireEvent.changeText(input, '  hello  ');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(jest.mocked(entryRepository.saveEntry)).toHaveBeenCalledWith('hello');
    });

    await waitFor(() => {
      expect(getByTestId('capture-input').props.value).toBe('');
    });
  });
});
