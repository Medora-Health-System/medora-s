import {
  OXYGEN_DELIVERY_DEVICES,
  VITAL_TEMPERATURE_SITES,
  VITALS_VOID_REASON_CODES,
  oxygenDeviceSuggestsFiO2,
  oxygenDeviceSuggestsFlow,
  type OxygenDeliveryDevice,
  type VitalTemperatureSite,
  type VitalsVoidReasonCode,
} from "@medora/shared";

export {
  OXYGEN_DELIVERY_DEVICES,
  VITAL_TEMPERATURE_SITES,
  VITALS_VOID_REASON_CODES,
  oxygenDeviceSuggestsFiO2,
  oxygenDeviceSuggestsFlow,
};

export function temperatureSiteI18nKey(site: VitalTemperatureSite): string {
  return `vitalsContext.temperatureSite.${site}`;
}

export function oxygenDeviceI18nKey(device: OxygenDeliveryDevice): string {
  return `vitalsContext.oxygenDevice.${device}`;
}

export function voidReasonI18nKey(code: VitalsVoidReasonCode): string {
  return `vitalsContext.voidReason.${code}`;
}

/** Compact SpO₂ oxygen label, e.g. "Room air" or "Nasal cannula · 2 L/min". */
export function formatOxygenSupportCompact(
  vitals: Record<string, unknown>,
  t: (key: string) => string
): string {
  const deviceRaw = vitals.oxygenDevice;
  if (typeof deviceRaw !== "string" || !deviceRaw) return "";
  if (!(OXYGEN_DELIVERY_DEVICES as readonly string[]).includes(deviceRaw)) return "";
  const device = deviceRaw as OxygenDeliveryDevice;
  const label = t(oxygenDeviceI18nKey(device));
  if (device === "ROOM_AIR") return label;
  const parts = [label];
  const flow = vitals.oxygenFlowLpm;
  if (flow != null && flow !== "") {
    parts.push(`${String(flow).trim()} ${t("vitalsContext.flowUnitShort")}`);
  }
  const fio2 = vitals.oxygenFiO2Percent;
  if (fio2 != null && fio2 !== "") {
    parts.push(`${t("vitalsContext.fio2Short")} ${String(fio2).trim()}%`);
  }
  return parts.join(" · ");
}

export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Build a local Date from HTML date (YYYY-MM-DD) + time (HH:mm or HH:mm:ss) inputs.
 * Does not use ambiguous `new Date("YYYY-MM-DD HH:mm")` / locale-string parsing.
 */
export function combineLocalDateAndTime(dateValue: string, timeValue: string): Date | null {
  const d = (dateValue || "").trim();
  const tm = (timeValue || "").trim();
  if (!d || !tm) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(tm);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const monthIndex = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] ?? "0");
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }
  const local = new Date(year, monthIndex, day, hour, minute, second, 0);
  if (!Number.isFinite(local.getTime())) return null;
  // Reject overflow dates (e.g. 2026-02-31 → March).
  if (
    local.getFullYear() !== year ||
    local.getMonth() !== monthIndex ||
    local.getDate() !== day ||
    local.getHours() !== hour ||
    local.getMinutes() !== minute ||
    local.getSeconds() !== second
  ) {
    return null;
  }
  return local;
}

export function measuredAtIsoFromLocalInputs(dateStr: string, timeStr: string): string | null {
  const local = combineLocalDateAndTime(dateStr, timeStr);
  if (!local) return null;
  return local.toISOString();
}

export function splitMeasuredAtLocal(iso: string | null | undefined): { date: string; time: string } {
  const base = iso ? new Date(iso) : new Date();
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    const local = toDatetimeLocalValue(now);
    const [date, time] = local.split("T");
    return { date: date ?? "", time: time ?? "" };
  }
  const local = toDatetimeLocalValue(base);
  const [date, time] = local.split("T");
  return { date: date ?? "", time: time ?? "" };
}
