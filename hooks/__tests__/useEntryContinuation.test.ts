import { act, renderHook } from '@testing-library/react-native';

import { useEntryContinuation } from '../useEntryContinuation';
import { updateEntryText } from '../../storage/entryRepository';

jest.mock('../../storage/entryRepository', () => ({
  updateEntryText: jest.fn(() =>
    Promise.resolve({
      id: 'e1',
      text: 'updated',
      createdAt: '2025-06-15T14:30:00.000Z',
    })
  ),
}));

const sampleEntry = {
  id: 'e1',
  text: 'Original thought',
  createdAt: '2025-06-15T14:30:00.000Z',
};

describe('useEntryContinuation', () => {
  beforeEach(() => {
    jest.mocked(updateEntryText).mockClear();
  });

  it('loads draft from entry when visible', () => {
    const { result } = renderHook(() =>
      useEntryContinuation({ visible: true, entry: sampleEntry })
    );
    expect(result.current.draft).toBe('Original thought');
    expect(result.current.isEditing).toBe(false);
  });

  it('does not save while typing — only marks dirty', () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useEntryContinuation({ visible: true, entry: sampleEntry, onSaved })
    );

    act(() => {
      result.current.beginEditing();
      result.current.setDraft('Updated thought');
    });

    expect(updateEntryText).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('flushSave persists edits and calls onSaved', async () => {
    const onSaved = jest.fn();
    const { result } = renderHook(() =>
      useEntryContinuation({ visible: true, entry: sampleEntry, onSaved })
    );

    act(() => {
      result.current.beginEditing();
      result.current.setDraft('Updated thought');
    });

    await act(async () => {
      await result.current.flushSave();
    });

    expect(updateEntryText).toHaveBeenCalledWith('e1', 'Updated thought');
    expect(onSaved).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  it('resetForClose persists pending edits', async () => {
    const { result } = renderHook(() =>
      useEntryContinuation({ visible: true, entry: sampleEntry })
    );

    act(() => {
      result.current.setDraft('Pending edit');
    });

    await act(async () => {
      await result.current.resetForClose();
    });

    expect(updateEntryText).toHaveBeenCalledWith('e1', 'Pending edit');
  });
});
