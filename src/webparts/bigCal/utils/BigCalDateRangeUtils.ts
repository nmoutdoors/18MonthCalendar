/**
 * Shared evergreen month-range helpers for BigCal.
 *
 * IMPORTANT: These helpers intentionally use full-month math only.
 * Do not convert this back to day-count arithmetic (for example, subtracting
 * 180 days) or the visible horizon will drift based on month length.
 */

export interface IBigCalMonthRange {
  start: Date;
  end: Date;
  months: Date[];
}

export const DEFAULT_EVERGREEN_MONTHS_PAST = 6;
export const DEFAULT_EVERGREEN_MONTHS_FUTURE = 11;

/**
 * Returns a rolling month range anchored to the month that contains the
 * reference date.
 *
 * - `start` is the first day of the start month at 00:00:00.000
 * - `end` is the last day of the end month at 23:59:59.999
 * - `months` contains the first day of every month in the inclusive range
 *
 * IMPORTANT: This helper must remain month-boundary based. It should never be
 * rewritten using raw day subtraction/addition because that causes off-by-one
 * behavior across 28/29/30/31-day months.
 */
export function getRollingMonthRange(
  referenceDate: Date,
  monthsPast: number,
  monthsFuture: number
): IBigCalMonthRange {
  const normalizedMonthsPast = Math.max(0, monthsPast);
  const normalizedMonthsFuture = Math.max(0, monthsFuture);

  const referenceMonthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0,
    0,
    0,
    0
  );

  const start = new Date(
    referenceMonthStart.getFullYear(),
    referenceMonthStart.getMonth() - normalizedMonthsPast,
    1,
    0,
    0,
    0,
    0
  );

  const end = new Date(
    referenceMonthStart.getFullYear(),
    referenceMonthStart.getMonth() + normalizedMonthsFuture + 1,
    0,
    23,
    59,
    59,
    999
  );

  const totalMonths = normalizedMonthsPast + 1 + normalizedMonthsFuture;
  const months: Date[] = [];

  for (let i = 0; i < totalMonths; i++) {
    months.push(new Date(start.getFullYear(), start.getMonth() + i, 1, 0, 0, 0, 0));
  }

  return {
    start,
    end,
    months
  };
}