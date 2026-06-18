export type ExternalBillingMonthRange = {
  start: Date;
  end: Date;
  month: string;
  periodStart: string;
  periodEnd: string;
};

export const MAX_EXTERNAL_BILLING_MONTHLY_ENCOUNTER_COUNT = 2000;

/** month=YYYY-MM inclusive UTC calendar month (first day 00:00:00.000Z through last day 23:59:59.999Z). */
export function parseUtcMonthRange(month: string): ExternalBillingMonthRange {
  const trimmed = month.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) {
    throw new Error("month must be YYYY-MM");
  }
  const [yearStr, monthStr] = trimmed.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error("Invalid month");
  }
  const periodStart = `${trimmed}-01`;
  const start = new Date(`${periodStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid month");
  }
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const periodEnd = `${trimmed}-${String(lastDay).padStart(2, "0")}`;
  const end = new Date(`${periodEnd}T23:59:59.999Z`);
  return {
    start,
    end,
    month: trimmed,
    periodStart,
    periodEnd,
  };
}
