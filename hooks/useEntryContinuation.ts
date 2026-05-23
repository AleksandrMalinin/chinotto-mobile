import { useCallback, useEffect, useRef, useState } from 'react';

import { updateEntryText } from '../storage/entryRepository';
import type { Entry } from '../types/entry';

export type UseEntryContinuationOptions = {
  visible: boolean;
  entry: Entry | null;
  onSaved?: (entry: Entry) => void;
};

/**
 * Draft + dirty tracking for in-sheet continuation.
 * Saves only when flushSave / resetForClose is called — not on every keystroke.
 */
export function useEntryContinuation({ visible, entry, onSaved }: UseEntryContinuationOptions) {
  const [draft, setDraftState] = useState('');
  const draftRef = useRef('');
  const [isEditing, setIsEditing] = useState(false);
  const dirtyRef = useRef(false);
  const entryRef = useRef(entry);
  entryRef.current = entry;

  useEffect(() => {
    if (!visible || entry == null) {
      setIsEditing(false);
      dirtyRef.current = false;
      return;
    }
    setDraftState(entry.text);
    draftRef.current = entry.text;
    setIsEditing(false);
    dirtyRef.current = false;
  }, [visible, entry?.id]);

  const flushSave = useCallback(async (): Promise<Entry | null> => {
    const currentEntry = entryRef.current;
    if (currentEntry == null || !dirtyRef.current) {
      return null;
    }
    const trimmed = draftRef.current.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed === currentEntry.text) {
      dirtyRef.current = false;
      return null;
    }
    const updated = await updateEntryText(currentEntry.id, trimmed);
    dirtyRef.current = false;
    entryRef.current = updated;
    onSaved?.(updated);
    return updated;
  }, [onSaved]);

  const setDraft = useCallback((next: string) => {
    draftRef.current = next;
    setDraftState(next);
    dirtyRef.current = true;
  }, []);

  const beginEditing = useCallback(() => {
    setIsEditing(true);
  }, []);

  const endEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const resetForClose = useCallback(async () => {
    await flushSave();
    setIsEditing(false);
    dirtyRef.current = false;
  }, [flushSave]);

  return {
    draft,
    setDraft,
    isEditing,
    beginEditing,
    endEditing,
    resetForClose,
    flushSave,
  };
}
