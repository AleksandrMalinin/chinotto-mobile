/** Local calendar month key `YYYY-MM` (matches `monthKeyFromIso`). */
export type MonthKey = string;

export type MonthSummary = {
  monthKey: MonthKey;
  /** Thoughts created in this local calendar month. */
  count: number;
  /** ISO `createdAt` of the newest thought in the month (jump anchor). */
  newestCreatedAt: string;
  /** Stable id of newest thought in the month. */
  newestEntryId: string;
};
