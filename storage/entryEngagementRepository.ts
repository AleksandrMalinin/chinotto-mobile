import type { Entry } from '../types/entry';
import { ECHO_LAYER_MAX_ITEMS, ECHO_LAYER_MIN_CANDIDATES } from '../constants/echoLayer';
import type { EchoCandidate, EchoEngagementRow } from '../utils/selectEchoCandidates';
import { getDatabase } from './db';
import { buildEchoCandidates } from './echoResolve';
import { runSerializedDb } from './runSerializedDb';

export function echoEngagementRowsFromEntries(entries: readonly Entry[]): EchoEngagementRow[] {
  return entries.map((entry) => ({
    entry,
    openCount: 0,
    editCount: 0,
    lastOpenedAt: null,
  }));
}

export type ResolveEchoCandidatesOptions = {
  /** Stream-visible rows (includes demo stream when enabled). */
  fallbackEntries?: readonly Entry[];
  /** When DB has fewer than min candidates, use fallback rows (dev / demo QA). */
  preferStreamFallback?: boolean;
};

type EngagementRow = {
  entryId: string;
  openCount: number;
  editCount: number;
  lastOpenedAt: string | null;
  lastEditedAt: string | null;
};

type EntryEngagementJoinRow = {
  id: string;
  text: string;
  createdAt: string;
  openCount: number;
  editCount: number;
  lastOpenedAt: string | null;
  lastEditedAt: string | null;
};

export async function recordEntryOpened(entryId: string, at: Date = new Date()): Promise<void> {
  const iso = at.toISOString();
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO entry_engagement (entry_id, open_count, edit_count, last_opened_at, last_edited_at)
       VALUES (?, 1, 0, ?, NULL)
       ON CONFLICT(entry_id) DO UPDATE SET
         open_count = open_count + 1,
         last_opened_at = excluded.last_opened_at`,
      entryId,
      iso,
    );
  });
}

export async function recordEntryEdited(entryId: string, at: Date = new Date()): Promise<void> {
  const iso = at.toISOString();
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO entry_engagement (entry_id, open_count, edit_count, last_opened_at, last_edited_at)
       VALUES (?, 0, 1, NULL, ?)
       ON CONFLICT(entry_id) DO UPDATE SET
         edit_count = edit_count + 1,
         last_edited_at = excluded.last_edited_at`,
      entryId,
      iso,
    );
  });
}

export async function deleteEntryEngagement(entryId: string): Promise<void> {
  await runSerializedDb(async () => {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM entry_engagement WHERE entry_id = ?', entryId);
  });
}

async function loadEngagementRows(): Promise<EchoEngagementRow[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EntryEngagementJoinRow>(
    `SELECT
       e.id,
       e.text,
       e.created_at AS createdAt,
       COALESCE(g.open_count, 0) AS openCount,
       COALESCE(g.edit_count, 0) AS editCount,
       g.last_opened_at AS lastOpenedAt,
       g.last_edited_at AS lastEditedAt
     FROM entries e
     LEFT JOIN entry_engagement g ON g.entry_id = e.id
     ORDER BY e.created_at DESC, e.id DESC`,
  );
  return rows.map((row) => ({
    entry: { id: row.id, text: row.text, createdAt: row.createdAt },
    openCount: row.openCount,
    editCount: row.editCount,
    lastOpenedAt: row.lastOpenedAt,
  }));
}

export async function getEchoCandidates(limit: number = ECHO_LAYER_MAX_ITEMS): Promise<EchoCandidate[]> {
  return runSerializedDb(async () => {
    const rows = await loadEngagementRows();
    return buildEchoCandidates({ rows, limit });
  });
}

/**
 * DB-backed echo list, with optional stream-visible fallback for dev QA / demo stream.
 */
export async function resolveEchoCandidates(
  options: ResolveEchoCandidatesOptions = {},
): Promise<EchoCandidate[]> {
  let fromDb: EchoCandidate[] = [];
  try {
    fromDb = await getEchoCandidates();
  } catch {
    fromDb = [];
  }
  if (fromDb.length >= ECHO_LAYER_MIN_CANDIDATES || !options.preferStreamFallback) {
    return fromDb;
  }
  const fallback = options.fallbackEntries ?? [];
  if (fallback.length === 0) {
    return fromDb;
  }
  const fromStream = await buildEchoCandidates({
    rows: echoEngagementRowsFromEntries(fallback),
  });
  return fromStream.length > fromDb.length ? fromStream : fromDb;
}

/** Test / diagnostics helper — not used in production UI. */
export async function getEntryEngagement(entryId: string): Promise<EngagementRow | null> {
  return runSerializedDb(async () => {
    const db = await getDatabase();
    const row = await db.getFirstAsync<EngagementRow>(
      `SELECT
         entry_id AS entryId,
         open_count AS openCount,
         edit_count AS editCount,
         last_opened_at AS lastOpenedAt,
         last_edited_at AS lastEditedAt
       FROM entry_engagement
       WHERE entry_id = ?
       LIMIT 1`,
      entryId,
    );
    return row ?? null;
  });
}
