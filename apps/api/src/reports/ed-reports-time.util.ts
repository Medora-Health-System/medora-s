import { BadRequestException } from "@nestjs/common";

/** Parse ISO date or full ISO datetime; `end` adds end-of-day when input is YYYY-MM-DD only. */
export function parseReportTimeBoundary(raw: string, end: boolean): Date {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return end ? new Date(`${t}T23:59:59.999Z`) : new Date(`${t}T00:00:00.000Z`);
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException("Date ou heure invalide.");
  }
  return d;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

export function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}
