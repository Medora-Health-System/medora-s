/**
 * MEDUI.LAB.REF.2 — age-band helpers for Mayo Clinic Laboratories reference intervals.
 * ageMaxYears is exclusive (resolver: age >= max → no match).
 */

export const DAYS_PER_YEAR = 365.25;

export function ageDays(n: number): number {
  return n / DAYS_PER_YEAR;
}

export function ageWeeks(n: number): number {
  return (n * 7) / DAYS_PER_YEAR;
}

export function ageMonths(n: number): number {
  return n / 12;
}

/** Inclusive start day → exclusive end day (endDayExclusive). */
export function ageBandDays(startDayInclusive: number, endDayExclusive: number): {
  ageMinYears: number;
  ageMaxYears: number;
} {
  return {
    ageMinYears: ageDays(startDayInclusive),
    ageMaxYears: ageDays(endDayExclusive),
  };
}

/** Inclusive start year → exclusive end year. */
export function ageBandYears(startInclusive: number, endExclusive: number): {
  ageMinYears: number;
  ageMaxYears: number | null;
} {
  return {
    ageMinYears: startInclusive,
    ageMaxYears: endExclusive,
  };
}

export function adultFrom18(): { ageMinYears: number; ageMaxYears: null } {
  return { ageMinYears: 18, ageMaxYears: null };
}
