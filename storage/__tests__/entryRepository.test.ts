import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../db';
import { insertPendingSyncItem } from '../../sync/syncQueue';
import { getAllEntries, getRecentEntries, saveEntry } from '../entryRepository';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../db', () => ({
  getDatabase: jest.fn(),
}));

jest.mock('../../sync/syncQueue', () => ({
  insertPendingSyncItem: jest.fn().mockResolvedValue(undefined),
}));

const mockGetDatabase = jest.mocked(getDatabase);
const mockRandomUUID = jest.mocked(randomUUID);
const mockInsertPendingSyncItem = jest.mocked(insertPendingSyncItem);

describe('entryRepository', () => {
  const runAsync = jest.fn();
  const getAllAsync = jest.fn();
  const withTransactionAsync = jest.fn(async (task: () => Promise<void>) => {
    await task();
  });
  const dbHandle = { runAsync, getAllAsync, withTransactionAsync };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('00000000-0000-4000-8000-000000000001');
    withTransactionAsync.mockImplementation(async (task: () => Promise<void>) => {
      await task();
    });
    mockGetDatabase.mockResolvedValue(dbHandle as never);
    runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    getAllAsync.mockResolvedValue([]);
    mockInsertPendingSyncItem.mockResolvedValue(undefined);
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
});
