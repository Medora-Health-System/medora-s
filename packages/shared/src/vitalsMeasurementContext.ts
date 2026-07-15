/** Temperature measurement site/method for bedside vitals. */
export const VITAL_TEMPERATURE_SITES = [
  "ORAL",
  "AXILLARY",
  "RECTAL",
  "TYMPANIC",
  "TEMPORAL",
  "SKIN",
  "CORE",
  "OTHER",
  "UNKNOWN",
] as const;

export type VitalTemperatureSite = (typeof VITAL_TEMPERATURE_SITES)[number];

/** Oxygen delivery device / support for SpO₂ context. */
export const OXYGEN_DELIVERY_DEVICES = [
  "ROOM_AIR",
  "NASAL_CANNULA",
  "SIMPLE_MASK",
  "VENTURI_MASK",
  "NON_REBREATHER",
  "HIGH_FLOW_NASAL_CANNULA",
  "TRACHEOSTOMY_COLLAR",
  "BLOW_BY",
  "CPAP",
  "BIPAP",
  "MECHANICAL_VENTILATION",
  "BAG_VALVE_MASK",
  "OTHER",
  "UNKNOWN",
] as const;

export type OxygenDeliveryDevice = (typeof OXYGEN_DELIVERY_DEVICES)[number];

export const TRIAGE_VITALS_READING_STATUSES = ["ACTIVE", "VOIDED"] as const;
export type TriageVitalsReadingStatus = (typeof TRIAGE_VITALS_READING_STATUSES)[number];

export const VITALS_VOID_REASON_CODES = [
  "ENTERED_IN_ERROR",
  "DUPLICATE_ENTRY",
  "WRONG_PATIENT_OR_ENCOUNTER",
  "INCORRECT_MEASUREMENT",
  "DEVICE_ERROR",
  "OTHER",
] as const;

export type VitalsVoidReasonCode = (typeof VITALS_VOID_REASON_CODES)[number];

export function isVitalTemperatureSite(value: unknown): value is VitalTemperatureSite {
  return typeof value === "string" && (VITAL_TEMPERATURE_SITES as readonly string[]).includes(value);
}

export function isOxygenDeliveryDevice(value: unknown): value is OxygenDeliveryDevice {
  return typeof value === "string" && (OXYGEN_DELIVERY_DEVICES as readonly string[]).includes(value);
}

export function isVitalsVoidReasonCode(value: unknown): value is VitalsVoidReasonCode {
  return typeof value === "string" && (VITALS_VOID_REASON_CODES as readonly string[]).includes(value);
}

/** Devices that typically use flow L/min. */
export function oxygenDeviceSuggestsFlow(device: OxygenDeliveryDevice | null | undefined): boolean {
  if (!device || device === "ROOM_AIR" || device === "UNKNOWN") return false;
  return (
    device === "NASAL_CANNULA" ||
    device === "SIMPLE_MASK" ||
    device === "VENTURI_MASK" ||
    device === "NON_REBREATHER" ||
    device === "HIGH_FLOW_NASAL_CANNULA" ||
    device === "TRACHEOSTOMY_COLLAR" ||
    device === "BLOW_BY" ||
    device === "BAG_VALVE_MASK" ||
    device === "OTHER"
  );
}

/** Devices that typically use FiO₂ %. */
export function oxygenDeviceSuggestsFiO2(device: OxygenDeliveryDevice | null | undefined): boolean {
  if (!device || device === "ROOM_AIR" || device === "UNKNOWN") return false;
  return (
    device === "VENTURI_MASK" ||
    device === "HIGH_FLOW_NASAL_CANNULA" ||
    device === "CPAP" ||
    device === "BIPAP" ||
    device === "MECHANICAL_VENTILATION" ||
    device === "OTHER"
  );
}
