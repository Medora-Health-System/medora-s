/**
 * Phase 11C — device / patient monitor integration **contracts only**.
 *
 * No persistence, endpoints, or automatic filing. Aligns with
 * `docs/DEVICE_MONITOR_INTEGRATION_ARCHITECTURE.md`.
 */

/** Inbound technical family (vendor-agnostic). */
export type DeviceSourceKind = "DEVICE" | "MANUAL_IMPORT" | "IMPORT_REPLAY" | "SIMULATION";

/**
 * Normalised measurement channel — maps to future vitals JSON keys / LOINC (mapper deferred).
 */
export type DeviceMeasurementType =
  | "HR"
  | "RR"
  | "SPO2"
  | "NIBP_SYS"
  | "NIBP_DIA"
  | "TEMP"
  | "ETCO2"
  | "CUSTOM";

/** Adapter-normalised signal quality (no raw waveform). */
export type DeviceSignalQuality = "GOOD" | "MARGINAL" | "POOR" | "UNKNOWN";

/**
 * Correlation confidence — never used alone to assign patient/encounter without human confirmation.
 */
export type DeviceMatchConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

/**
 * Lifecycle of one logical device observation **proposal** (pre-chart).
 * Distinct from `IntegrationIngestionStatus` in `integration-event.contracts.ts` but composable.
 */
export type DeviceObservationStatus =
  | "received"
  | "parsed"
  | "pending_clinical_review"
  | "accepted"
  | "rejected"
  | "expired"
  | "duplicate_suppressed"
  | "failed_technical";

/** Outcome of nurse/clinician review (chart filing only follows ACCEPT). */
export type DeviceObservationReviewDecision =
  | "ACCEPT"
  | "REJECT"
  | "DEFER"
  | "PENDING";

/**
 * Draft observation from a monitor pipeline — **not** chart data until validated.
 * Numeric values belong in future persisted staging only under PHI policy; optional here for adapter tests.
 */
export type DeviceObservationDraft = {
  sourceKind: DeviceSourceKind;
  facilityId: string;
  /** Opaque device / monitor channel id (non-PHI preferred). */
  deviceId: string;
  /** Optional location hints — never sole basis for patient match. */
  roomId?: string;
  bedId?: string;
  /** When the device asserts the measurement was taken (ISO-8601). */
  deviceObservedAt?: string;
  /** When Medora adapter received the message (ISO-8601). */
  receivedAt: string;
  signalQuality: DeviceSignalQuality;
  matchConfidence: DeviceMatchConfidence;
  /** Suggested correlation — null until resolved by human or trusted rules (future). */
  patientId?: string | null;
  encounterId?: string | null;
  status: DeviceObservationStatus;
  /** Which vital channels are present in this message (not numeric values). */
  measurementTypes: DeviceMeasurementType[];
  /** Idempotency / dedup (HL7 MSH.10 style, vendor message id, etc.). */
  externalMessageId?: string;
};

/** Stable union members for tests and future exhaustive switches. */
export const DEVICE_OBSERVATION_STATUS_VALUES: readonly DeviceObservationStatus[] = [
  "received",
  "parsed",
  "pending_clinical_review",
  "accepted",
  "rejected",
  "expired",
  "duplicate_suppressed",
  "failed_technical",
] as const;

export const DEVICE_OBSERVATION_REVIEW_DECISION_VALUES: readonly DeviceObservationReviewDecision[] = [
  "ACCEPT",
  "REJECT",
  "DEFER",
  "PENDING",
] as const;
