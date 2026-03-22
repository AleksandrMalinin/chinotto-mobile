import { randomUUID } from 'expo-crypto';

import * as firebaseConfig from '../../sync/firebaseConfig';
import { getDatabase } from '../db';
import * as ingestSuppression from '../../sync/ingestSuppression';
import { insertPendingSyncItem, removePendingSyncItemsForEntry } from '../../sync/syncQueue';
import * as tombstoneOutbox from '../../sync/tombstoneOutbox';
import {
  applyRemoteTombstoneDeletes,
  deleteEntry,
  getAllEntries,
  getRecentEntries,
  saveEntry,
} from '../entryRepository';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../../sync/firebaseConfig', () => ({
  isFirebaseSyncConfigured: jest.fn(() => false),
}));

jest.mock('../../sync/syncQueue', () => ({
  insertPendingSyncItem: jest.fn().mockResolvedValue(undefined),
  removePendingSyncItemsForEntry: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../sync/tombstoneOutbox', () => ({
  enqueueSyncTombstoneWithDb: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../sync/ingestSuppression', () => ({
  addFirestoreIngestSuppressionWithDb: jest.fn().mockResolvedValue(undefined),
}));

const mockGetDatabase = jest.mocked(getDatabase);
const mockRandomUUID = jest.mocked(randomUUID);
const mockInsertPendingSyncItem = jest.mocked(insertPendingSyncItem);
const mockRemovePending = jest.mocked(removePendingSyncItemsForEntry);
const mockEnqueueTombstone = jest.mocked(tombstoneOutbox.enqueueSyncTombstoneWithDb);
const mockAddSuppression = jest.mocked(ingestSuppression.addFirestoreIngestSuppressionWithDb);
const mockIsFirebaseConfigured = jest.mocked(firebaseConfig.isFirebaseSyncConfigured);

describe('entryRepository', () => {
  const runAsync = jest.fn();
  const getAllAsync = jest.fn();
  const getFirstAsync = jest.fn();
  const withTransactionAsync = jest.fn(async (task: () => Promise<void>) => {
    await task();
  });
  const dbHandle = {
    runAsync,
    getAllAsync,
    getFirstAsync,
    withTransactionAsync,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('00000000-0000-4000-8000-000000000001');
    withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
      await task();
    });
    mockGetDatabase.mockResolvedValue(dbHandle as never);
    runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    getAllAsync.mockResolvedValue([]);
    getFirstAsync.mockReset();
    mockInsertPendingSyncItem.mockResolvedValue(undefined);
    mockRemovePending.mockClear();
    mockEnqueueTombstone.mockClear();
    mockAddSuppression.mockClear();
    mockIsFirebaseConfigured.mockReturnValue(false);
  });

  describe('saveEntry', () => {
    it('trims text, commits entry + queue in one transaction, then returns Entry', async () => {
      const entry = await saveEntry('  hello  ');

      expect(entry.id).toBe('00000000-0000-4000-8000-000000000001');
      expect(entry.text).toBe('hello');
      expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      expect(withTransactionAsync).toHaveBeenCalledTimes(1);

      expect(runAsync).toHaveBeenCalledWith(
        'INSERT INTO entries (id, text, created_at) VALUES (?, ?, ?)',
        entry.id,
        'hello',
        entry.createdAt
      );

      expect(mockInsertPendingSyncItem).toHaveBeenCalledWith(dbHandle, entry);
      expect(mockInsertPendingSyncItem).toHaveBeenCalledTimes(1);
    });

    it('rejects and does not resolve success if queue insert fails', async () => {
      mockInsertPendingSyncItem.mockRejectedValueOnce(new Error('queue write failed'));

      await expect(saveEntry('hello')).rejects.toThrow('queue write failed');

      expect(withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(runAsync).toHaveBeenCalled();
      expect(mockInsertPendingSyncItem).toHaveBeenCalled();
    });

    it('persists entry row before queue row inside the transaction', async () => {
      const order: string[] = [];
      runAsync.mockImplementation(async () => {
        order.push('entries');
        return { changes: 1, lastInsertRowId: 0 };
      });
      mockInsertPendingSyncItem.mockImplementation(async () => {
        order.push('queue');
      });

      await saveEntry('a');

      expect(order).toEqual(['entries', 'queue']);
    });

    it('rejects empty or whitespace-only input', async () => {
      await expect(saveEntry('')).rejects.toThrow('Cannot save empty entry');
      await expect(saveEntry('   \t  ')).rejects.toThrow('Cannot save empty entry');
      expect(withTransactionAsync).not.toHaveBeenCalled();
      expect(runAsync).not.toHaveBeenCalled();
      expect(mockInsertPendingSyncItem).not.toHaveBeenCalled();
    });
  });

  describe('getRecentEntries', () => {
    it('queries with limit and maps created_at to createdAt', async () => {
      getAllAsync.mockResolvedValueOnce([
        { id: 'a', text: 't', createdAt: '2025-01-01T00:00:00.000Z' },
      ]);

      const rows = await getRecentEntries(10);

      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ?'),
        10
      );
      expect(rows[0]).toEqual({
        id: 'a',
        text: 't',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('getAllEntries', () => {
    it('returns ordered rows', async () => {
      getAllAsync.mockResolvedValueOnce([]);

      await getAllEntries();

      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC')
      );
    });
  });

  describe('deleteEntry', () => {
    it('rejects when entry id is missing', async () => {
      getFirstAsync.mockResolvedValueOnce(undefined);

      await expect(deleteEntry('missing')).rejects.toThrow('Entry not found');
      expect(withTransactionAsync).toHaveBeenCalled();
    });

    it('deletes locally and drops pending push rows; skips tombstone when sync not configured', async () => {
      getFirstAsync.mockResolvedValueOnce({ id: 'e1' });

      await deleteEntry('e1');

      expect(runAsync).toHaveBeenCalledWith('DELETE FROM entries WHERE id = ?', 'e1');
      expect(mockRemovePending).toHaveBeenCalledWith(dbHandle, 'e1');
      expect(mockAddSuppression).not.toHaveBeenCalled();
      expect(mockEnqueueTombstone).not.toHaveBeenCalled();
    });

    it('adds suppression and tombstone outbox when Firebase sync is configured', async () => {
      mockIsFirebaseConfigured.mockReturnValue(true);
      getFirstAsync.mockResolvedValueOnce({ id: 'e1' });

      await deleteEntry('e1');

      expect(mockAddSuppression).toHaveBeenCalledWith(dbHandle, 'e1');
      expect(mockEnqueueTombstone).toHaveBeenCalledWith(dbHandle, 'e1');
    });
  });

  describe('applyRemoteTombstoneDeletes', () => {
    it('returns 0 for empty ids without opening a transaction', async () => {
      const n = await applyRemoteTombstoneDeletes([]);
      expect(n).toBe(0);
      expect(withTransactionAsync).not.toHaveBeenCalled();
    });

    it('runs queue cleanup, outbox, entries, suppression in one transaction', async () => {
      runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });

      const n = await applyRemoteTombstoneDeletes(['a', 'b']);

      expect(withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(mockRemovePending).toHaveBeenCalledWith(dbHandle, 'a');
      expect(mockRemovePending).toHaveBeenCalledWith(dbHandle, 'b');
      expect(runAsync).toHaveBeenCalledWith('DELETE FROM sync_tombstone_outbox WHERE entry_id = ?', 'a');
      expect(runAsync).toHaveBeenCalledWith('DELETE FROM entries WHERE id = ?', 'a');
      expect(runAsync).toHaveBeenCalledWith('DELETE FROM firestore_ingest_suppressed_ids WHERE id = ?', 'a');
      expect(n).toBe(2);
    });
  });
});
