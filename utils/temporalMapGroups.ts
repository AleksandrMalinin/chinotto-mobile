import type { MonthSummary } from '../types/temporal';
import { formatTemporalYearLabel, yearFromMonthKey } from './streamMonthIndex';

export type TemporalMapYearGroup = {
  year: number;
  yearLabel: string;
  months: MonthSummary[];
};

/** Newest year first; months within a year keep global newest-first order. */
export function groupMonthSummariesByYear(summaries: readonly MonthSummary[]): TemporalMapYearGroup[] {
  const byYear = new Map<number, MonthSummary[]>();
  for (const summary of summaries) {
    const year = yearFromMonthKey(summary.monthKey);
    const list = byYear.get(year) ?? [];
    list.push(summary);
    byYear.set(year, list);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      yearLabel: formatTemporalYearLabel(year),
      months,
    }));
}

export function maxMonthThoughtCount(summaries: readonly MonthSummary[]): number {
  let max = 0;
  for (const s of summaries) {
    if (s.count > max) {
      max = s.count;
    }
  }
  return max;
}
