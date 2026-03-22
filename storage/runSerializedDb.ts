/**
 * Runs all work that touches the shared SQLite handle strictly one-after-another.
 *
 * - `withTransactionAsync` alone is unsafe: other `await`s on the same connection can interleave
 *   and break BEGIN/COMMIT (see expo-sqlite docs).
 * - `withExclusiveTransactionAsync` uses a **second** connection; concurrent use of the primary
 *   handle then fails with SQLITE_BUSY ("database is locked") during `finalizeAsync` / writes.
 *
 * Wrap every `getDatabase()`-backed operation in this helper so transactions stay coherent without
 * a second connection.
 */
let tail: Promise<unknown> = Promise.resolve();

export function runSerializedDb<T>(task: () => Promise<T>): Promise<T> {
  const next = tail.then(task);
  tail = next.then(
    () => {},
    () => {}
  );
  return next;
}
