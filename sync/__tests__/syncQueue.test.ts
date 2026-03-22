import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../../storage/db';
import { enqueueForSync, getPendingSyncItems, insertPendingSyncItem, markSynced } from '../syncQueue';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('../../storage/db', () => ({
  getDatabase: jest.fn(),
}));

const mockGetDatabase = jest.mocked(getDatabase);
const mockRandomUUID = jest.mocked(randomUUID);

describe('syncQueue', () => {
  const runAsync = jest.fn();
  const getAllAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('queue-item-1');
    mockGetDatabase.mockResolvedValue({
      runAsync,
      getAllAsync,
    } as never);
    runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
  });

  describe('insertPendingSyncItem', () => {
    it('writes via the given DB handle (for transactional save)', async () => {
      const entry = {
        id: 'e1',
        text: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z',
      };
      const db = { runAsync, getAllAsync } as never;

      await insertPendingSyncItem(db, entry);

      expect(runAsync).toHaveBeenCalledWith(
        'INSERT INTO sync_queue (id, payload, status) VALUES (?, ?, ?)',
        'queue-item-1',
        JSON.stringify(entry),
        'pending'
      );
    });
  });

  describe('enqueueForSync', () => {
    it('inserts a pending row with serialized payload', async () => {
      const entry = {
        id: 'e1',
        text: 'hello',
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      await enqueueForSync(entry);

      expect(runAsync).toHaveBeenCalledWith(
        'INSERT INTO sync_queue (id, payload, status) VALUES (?, ?, ?)',
        'queue-item-1',
        JSON.stringify(entry),
        'pending'
      );
    });
  });

  describe('getPendingSyncItems', () => {
    it('returns parsed pending items', async () => {
      const entry = { id: 'e1', text: 'x', createdAt: '2025-01-01T00:00:00.000Z' };
      getAllAsync.mockResolvedValueOnce([
        { id: 'q1', payload: JSON.stringify(entry), status: 'pending' },
      ]);

      const items = await getPendingSyncItems(10);

      expect(getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE status = 'pending'"),
        10
      );
      expect(items).toEqual([{ id: 'q1', payload: entry, status: 'pending' }]);
    });
  });

  describe('markSynced', () => {
    it('updates status to synced', async () => {
      await markSynced('q1');

      expect(runAsync).toHaveBeenCalledWith("UPDATE sync_queue SET status = 'synced' WHERE id = ?", 'q1');
    });
  });
});
