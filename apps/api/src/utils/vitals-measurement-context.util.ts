import { BadRequestException } from "@nestjs/common";
import {
  isOxygenDeliveryDevice,
  isVitalTemperatureSite,
  type OxygenDeliveryDevice,
  type VitalTemperatureSite,
} from "@medora/shared";

/** Modest skew allowance when validating clinician-selected measuredAt (no global clock-drift util). */
export const VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export type NormalizedVitalsMeasurementContext = {
  temperatureSite: VitalTemperatureSite | null;
  oxygenDevice: OxygenDeliveryDevice | null;
  oxygenFlowLpm: number | null;
  oxygenFiO2Percent: number | null;
  oxygenDeviceNotes: string | null;
};

function parseOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) {
    throw new BadRequestException("Invalid numeric vital measurement context value");
  }
  return n;
}

/**
 * Validate and normalize temperature site + SpO₂ oxygen-delivery context on vitalsJson.
 * Room air clears flow/FiO₂. Does not invent adjusted temperatures.
 */
export function normalizeVitalsMeasurementContext(
  vitalsJson: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...vitalsJson };

  const siteRaw = next.temperatureSite;
  if (siteRaw == null || siteRaw === "") {
    delete next.temperatureSite;
  } else if (isVitalTemperatureSite(siteRaw)) {
    next.temperatureSite = siteRaw;
  } else {
    throw new BadRequestException("Invalid temperatureSite");
  }

  const deviceRaw = next.oxygenDevice;
  let device: OxygenDeliveryDevice | null = null;
  if (deviceRaw == null || deviceRaw === "") {
    delete next.oxygenDevice;
  } else if (isOxygenDeliveryDevice(deviceRaw)) {
    device = deviceRaw;
    next.oxygenDevice = deviceRaw;
  } else {
    throw new BadRequestException("Invalid oxygenDevice");
  }

  let flow = parseOptionalNumber(next.oxygenFlowLpm);
  let fio2 = parseOptionalNumber(next.oxygenFiO2Percent);

  if (device === "ROOM_AIR") {
    flow = null;
    fio2 = null;
  }

  if (flow != null) {
    if (flow < 0 || flow > 80) {
      throw new BadRequestException("oxygenFlowLpm out of range");
    }
    next.oxygenFlowLpm = flow;
  } else {
    delete next.oxygenFlowLpm;
  }

  if (fio2 != null) {
    if (fio2 < 21 || fio2 > 100) {
      throw new BadRequestException("oxygenFiO2Percent out of range");
    }
    next.oxygenFiO2Percent = fio2;
  } else {
    delete next.oxygenFiO2Percent;
  }

  const notesRaw = next.oxygenDeviceNotes;
  if (typeof notesRaw === "string") {
    const trimmed = notesRaw.trim().slice(0, 500);
    if (trimmed) next.oxygenDeviceNotes = trimmed;
    else delete next.oxygenDeviceNotes;
  } else if (notesRaw == null || notesRaw === "") {
    delete next.oxygenDeviceNotes;
  } else {
    throw new BadRequestException("Invalid oxygenDeviceNotes");
  }

  // Clinical measuredAt lives on TriageVitalsReading.measuredAt — strip from JSON payload.
  delete next.measuredAt;
  delete next.recordedAt;
  delete next.recordedByUserId;

  return next;
}

/**
 * Resolve clinician-selected measuredAt. Defaults to now when omitted.
 * Rejects timestamps more than {@link VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS} ahead of server time.
 */
export function resolveMeasuredAt(input: unknown, now = new Date()): Date {
  if (input == null || input === "") {
    return now;
  }
  const d = input instanceof Date ? input : new Date(String(input));
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException("Invalid measuredAt");
  }
  if (d.getTime() > now.getTime() + VITALS_MEASURED_AT_FUTURE_TOLERANCE_MS) {
    throw new BadRequestException("measuredAt cannot be in the future");
  }
  // Guard absurd historical values (pre-Unix / far past)
  if (d.getTime() < Date.UTC(1990, 0, 1)) {
    throw new BadRequestException("measuredAt is too far in the past");
  }
  return d;
}
