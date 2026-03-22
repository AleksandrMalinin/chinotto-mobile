import { randomUUID } from 'expo-crypto';

import { getDatabase } from '../db';
import { getAllEntries, getRecentEntries, saveEntry } from '../entryRepository';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../db', () => ({
  getDatabase: jest.fn(),
}));

const mockGetDatabase = jest.mocked(getDatabase);
const mockRandomUUID = jest.mocked(randomUUID);

describe('entryRepository', () => {
  const runAsync = jest.fn();
  const getAllAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('00000000-0000-4000-8000-000000000001');
    mockGetDatabase.mockResolvedValue({
      runAsync,
      getAllAsync,
    } as never);
    runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 0 });
    getAllAsync.mockResolvedValue([]);
  });

  describe('saveEntry', () => {
    it('trims text, inserts row, and returns Entry', async () => {
      const entry = await saveEntry('  hello  ');

      expect(entry.id).toBe('00000000-0000-4000-8000-000000000001');
      expect(entry.text).toBe('hello');
      expect(entry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      expect(runAsync).toHaveBeenCalledWith(
        'INSERT INTO entries (id, text, created_at) VALUES (?, ?, ?)',
        entry.id,
        'hello',
        entry.createdAt
      );
    });

    it('rejects empty or whitespace-only input', async () => {
      await expect(saveEntry('')).rejects.toThrow('Cannot save empty entry');
      await expect(saveEntry('   \t  ')).rejects.toThrow('Cannot save empty entry');
      expect(runAsync).not.toHaveBeenCalled();
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
