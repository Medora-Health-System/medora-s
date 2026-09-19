/** Convert a facility-local calendar midnight to an absolute instant without using the staff browser timezone. */
export function facilityMidnight(date: Date, timeZone: string): Date {
  const year = date.getFullYear(), month = date.getMonth() + 1, day = date.getDate();
  const target = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  let instant = target;
  for (let i = 0; i < 4; i++) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(value("year"), value("month") - 1, value("day"),
      value("hour"), value("minute"), value("second"));
    const difference = target - represented;
    instant += difference;
    if (difference === 0) break;
  }
  return new Date(instant);
}

export function facilityMonthBounds(date: Date, timeZone: string) {
  const from = facilityMidnight(new Date(date.getFullYear(), date.getMonth(), 1), timeZone);
  const to = facilityMidnight(new Date(date.getFullYear(), date.getMonth() + 1, 1), timeZone);
  return { from: from.toISOString(), to: to.toISOString() };
}


/** Half-open UTC bounds for one facility-local calendar date. */
export function facilityDayBounds(date: Date, timeZone: string) {
  const from = facilityMidnight(new Date(date.getFullYear(), date.getMonth(), date.getDate()), timeZone);
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const to = facilityMidnight(next, timeZone);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Convert a facility wall-clock input (YYYY-MM-DDTHH:mm) into an instant.
 * Reject nonexistent spring-forward times and ambiguous fall-back times rather
 * than silently scheduling at the browser's timezone or the wrong occurrence.
 */
export function facilityLocalDateTimeToIso(value: string, timeZone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const [date, clock] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const matches: number[] = [];
  // Scan possible UTC offsets in 15-minute increments; do not assume the
  // facility or staff computer is in a particular country or DST regime.
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = desired - offset * 60000;
    const parts = formatter.formatToParts(new Date(candidate));
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    if (get("year") === year && get("month") === month && get("day") === day &&
        get("hour") === hour && get("minute") === minute) matches.push(candidate);
  }
  return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
}
