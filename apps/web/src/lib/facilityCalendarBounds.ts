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
