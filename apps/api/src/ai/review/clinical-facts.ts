import type {
  AiEncounterCareSetting,
  AiMedicationOrder,
  AiOrderItem,
  AiVitalsEntry,
  EncounterAiSnapshot,
} from "@medora/shared";

const CANCELLED_STATES = new Set(["CANCELLED", "CANCELED", "DISCONTINUED", "STOPPED", "VOID"]);
const COMPLETED_STATES = new Set(["COMPLETED", "REVIEWED", "FINAL", "RESULTED"]);
const DIAGNOSTIC_TYPES = new Set([
  "LAB",
  "LAB_TEST",
  "LABORATORY",
  "IMAGING",
  "RADIOLOGY",
  "RADIOLOGY_EXAM",
  "DIAGNOSTIC",
  "PROCEDURE",
]);
const MEDICATION_TYPES = new Set(["MEDICATION", "MED", "DRUG", "IV", "INFUSION"]);
const PAIN_MED_RE =
  /\b(morphine|hydromorphone|dilaudid|fentanyl|oxycodone|oxymorphone|tramadol|ketorolac|toradol|hydrocodone)\b/i;
const IV_FLUID_RE =
  /\b(normal saline|sodium chloride|nacl|ns bolus|lactated ringer|hartmann|plasmalyte|iv fluid|fluid bolus)\b/i;

export function parseIsoMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readNumericVital(values: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!values) return null;
  for (const key of keys) {
    const raw = values[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
      const parsed = Number.parseFloat(raw.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

export function vitalHeartRate(entry: AiVitalsEntry | null | undefined): number | null {
  return readNumericVital(asRecord(entry?.values), ["hr", "heartRate", "pulse"]);
}

export function vitalSystolic(entry: AiVitalsEntry | null | undefined): number | null {
  return readNumericVital(asRecord(entry?.values), ["bpSys", "sbp", "systolic"]);
}

export function vitalSpo2(entry: AiVitalsEntry | null | undefined): number | null {
  return readNumericVital(asRecord(entry?.values), ["spo2", "oxygenSaturation"]);
}

export function vitalPain(entry: AiVitalsEntry | null | undefined): number | null {
  return readNumericVital(asRecord(entry?.values), ["painScore", "pain", "painLevel"]);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function chronologicalVitals(snapshot: EncounterAiSnapshot): AiVitalsEntry[] {
  const rows = [...(snapshot.presentation.vitalTrend ?? [])];
  if (snapshot.presentation.latestVitals) rows.push(snapshot.presentation.latestVitals);
  return rows
    .filter((row) => parseIsoMs(row.recordedAt) !== null)
    .sort((a, b) => (parseIsoMs(a.recordedAt) ?? 0) - (parseIsoMs(b.recordedAt) ?? 0));
}

export function laterVitalAfter(
  snapshot: EncounterAiSnapshot,
  afterIso: string,
  reader: (entry: AiVitalsEntry) => number | null
): boolean {
  const after = parseIsoMs(afterIso);
  if (after === null) return false;
  return chronologicalVitals(snapshot).some((entry) => {
    const time = parseIsoMs(entry.recordedAt);
    return time !== null && time > after && reader(entry) !== null;
  });
}

export function isAdultOrUnknown(snapshot: EncounterAiSnapshot): boolean {
  const age = snapshot.patientContext.age;
  return age == null || age >= 12;
}

export function isCancelledState(value: string | null | undefined): boolean {
  return CANCELLED_STATES.has(String(value ?? "").trim().toUpperCase());
}

export function isCompletedState(value: string | null | undefined): boolean {
  return COMPLETED_STATES.has(String(value ?? "").trim().toUpperCase());
}

export function isActiveMedicationOrder(order: AiMedicationOrder): boolean {
  return !isCancelledState(order.status) && !isCancelledState(order.lifecycleState);
}

export function isPrnMedicationOrder(order: AiMedicationOrder): boolean {
  return /\bPRN\b/i.test(String(order.frequencyCode ?? ""));
}

export function pendingDiagnosticItems(snapshot: EncounterAiSnapshot): AiOrderItem[] {
  const itemsById = new Map<string, AiOrderItem>();
  for (const order of snapshot.diagnostics.orders ?? []) {
    for (const item of order.items ?? []) itemsById.set(item.id, item);
  }
  const medicationIds = new Set((snapshot.treatments.medicationOrders ?? []).map((order) => order.id));
  const pending: AiOrderItem[] = [];
  for (const id of snapshot.diagnostics.pendingTests ?? []) {
    const item = itemsById.get(id) ?? { id };
    const type = String(item.catalogItemType ?? "").trim().toUpperCase();
    if (MEDICATION_TYPES.has(type) || medicationIds.has(id)) continue;
    if (type && !DIAGNOSTIC_TYPES.has(type)) continue;
    if (isCancelledState(item.status) || isCancelledState(item.lifecycleState)) continue;
    if (isCompletedState(item.status) || isCompletedState(item.lifecycleState)) continue;
    pending.push(item);
  }
  return pending;
}

export function diagnosticOrderItems(snapshot: EncounterAiSnapshot): AiOrderItem[] {
  const medicationIds = new Set((snapshot.treatments.medicationOrders ?? []).map((order) => order.id));
  const items: AiOrderItem[] = [];
  for (const order of snapshot.diagnostics.orders ?? []) {
    for (const item of order.items ?? []) {
      const type = String(item.catalogItemType ?? "").trim().toUpperCase();
      if (MEDICATION_TYPES.has(type) || medicationIds.has(item.id)) continue;
      if (type && !DIAGNOSTIC_TYPES.has(type) && type !== "CARE") continue;
      items.push(item);
    }
  }
  return items;
}

export function studyLabel(item: AiOrderItem | undefined, fallback = "A diagnostic study"): string {
  const label = item?.displayLabel?.trim();
  return label || fallback;
}

export function resultStudyLabel(snapshot: EncounterAiSnapshot, result: { orderItemId?: string }): string | null {
  if (!result.orderItemId) return null;
  for (const item of diagnosticOrderItems(snapshot)) {
    if (item.id === result.orderItemId && item.displayLabel?.trim()) return item.displayLabel.trim();
  }
  for (const order of snapshot.diagnostics.orders ?? []) {
    for (const item of order.items ?? []) {
      if (item.id === result.orderItemId && item.displayLabel?.trim()) return item.displayLabel.trim();
    }
  }
  return null;
}

export function isClinicSetting(careSetting: AiEncounterCareSetting): boolean {
  return careSetting === "OFFICE_OUTPATIENT_CLINIC";
}

export function isAcuteCareSetting(careSetting: AiEncounterCareSetting): boolean {
  return (
    careSetting === "EMERGENCY_DEPARTMENT" ||
    careSetting === "HOSPITAL_INPATIENT_OBSERVATION" ||
    careSetting === "CRITICAL_CARE"
  );
}

export function isDischargeInProgress(snapshot: EncounterAiSnapshot): boolean {
  const status = String(snapshot.encounterContext.status ?? "").trim().toUpperCase();
  if (status === "CLOSED") return true;
  if (String(snapshot.disposition.dischargeStatus ?? "").trim()) return true;
  if (isClinicSetting(snapshot.encounterContext.careSetting)) {
    const checkout = String(snapshot.disposition.checkoutState ?? "").trim().toUpperCase();
    return Boolean(checkout) && checkout !== "OTHER";
  }
  return Boolean(String(snapshot.disposition.disposition ?? "").trim());
}

export function followUpExpected(snapshot: EncounterAiSnapshot): boolean {
  if (isClinicSetting(snapshot.encounterContext.careSetting)) {
    const checkout = String(snapshot.disposition.checkoutState ?? "").trim().toUpperCase();
    return checkout === "CLINIC_FOLLOW_UP" || checkout === "HOME" || checkout === "REFERRAL";
  }
  const disposition = String(snapshot.disposition.disposition ?? "").trim().toUpperCase();
  if (!disposition && String(snapshot.encounterContext.status ?? "").toUpperCase() !== "CLOSED") return false;
  if (/(TRANSFER|AMA|ELOPE|DECEASED|EXPIRED|LEFT|LWBS|AGAINST)/.test(disposition)) return false;
  return true;
}

export function hasFollowUpDocumentation(snapshot: EncounterAiSnapshot): boolean {
  if (snapshot.disposition.dischargeFollowUpDocumented === true) return true;
  const followUps = snapshot.disposition.followUps ?? [];
  if (followUps.some((item) => String(item.status ?? "").toUpperCase() !== "CANCELLED")) return true;
  const appointments = snapshot.disposition.appointments ?? [];
  return appointments.some((item) => !isCancelledState(item.status));
}

export function normalizeMedicationKey(label: string | null | undefined): string | null {
  const raw = String(label ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!raw) return null;
  const token = raw.split(" ").find((part) => part.length >= 4) ?? raw.split(" ")[0];
  return token || null;
}

export function looksLikePainMedication(label: string | null | undefined): boolean {
  return PAIN_MED_RE.test(String(label ?? ""));
}

export function looksLikeIvFluid(order: { displayLabel?: string | null; route?: string | null }): boolean {
  const route = String(order.route ?? "").toUpperCase();
  if (/\bIV\b/.test(route) && IV_FLUID_RE.test(String(order.displayLabel ?? ""))) return true;
  return IV_FLUID_RE.test(String(order.displayLabel ?? ""));
}

export function administeredAtMs(admin: { administeredAt?: string | null; action?: string | null }): number | null {
  const action = String(admin.action ?? "").trim().toLowerCase();
  if (action && action !== "administered") return null;
  return parseIsoMs(admin.administeredAt);
}
