/**
 * MEDUI.D4C.7G — Enterprise MAR authority audit repair:
 * Clinic facility order → same MAR projection as ED; pure outpatient Rx workspace.
 *
 * Extends D4C.7E intent separation. No ClinicMedication* / ClinicMAR / ClinicPrescription.
 */

import { D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES } from "./enterpriseClinicMedicationOrdersMarRxSeparationD4c7e.js";

export const CLINIC_ENTERPRISE_MAR_AUTHORITY_ORDER_RX_CERTIFICATION_ID =
  "MEDUI.D4C.7G" as const;

/** Reuse D4C.7E forbidden Clinic* engines — do not introduce new ones. */
export const D4C7G_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES =
  D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES;

/**
 * CreateOrderModal medication mode for pure outpatient Rx:
 * medication-only composer, PHARMACY_DISPENSE forced, no facility-admin destination.
 */
export const D4C7G_OUTPATIENT_RX_ORDER_MODE = "OUTPATIENT_RX_ONLY" as const;

/**
 * MEDUI.INP.2E.2 — facility-administered standing orders (Hospital Inpatient).
 * Forces ADMINISTER_CHART without ER quantity-override semantics, so BID/TID/q6h remain available.
 */
export const D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE =
  "FACILITY_ADMINISTER_STANDING" as const;

export type D4c7gMedicationOrderMode =
  | "DEFAULT"
  | "ER_ADMINISTER_ONLY"
  | typeof D4C7G_OUTPATIENT_RX_ORDER_MODE
  | typeof D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE;

export function composerForcesFacilityAdministerIntent(mode: string | null | undefined): boolean {
  return (
    mode === "ER_ADMINISTER_ONLY" || mode === D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE
  );
}

export function composerForcesOutpatientRxIntent(mode: string | null | undefined): boolean {
  return mode === D4C7G_OUTPATIENT_RX_ORDER_MODE;
}

/** ER-only qty>1 confirmation. Standing inpatient orders do not use this gate. */
export function composerUsesErQuantityConfirmation(mode: string | null | undefined): boolean {
  return mode === "ER_ADMINISTER_ONLY";
}

export function resolveComposerDefaultMedicationFulfillmentIntent(
  mode: string | null | undefined
): "ADMINISTER_CHART" | "PHARMACY_DISPENSE" {
  if (composerForcesFacilityAdministerIntent(mode)) return "ADMINISTER_CHART";
  return "PHARMACY_DISPENSE";
}

export function resolveComposerDefaultMedicationQuantity(mode: string | null | undefined): number {
  return composerForcesFacilityAdministerIntent(mode) ? 1 : 30;
}

/** Hospital Inpatient facility-administered medication composer — not DEFAULT and not ER_ADMINISTER_ONLY. */
export function inpatientFacilityMedicationOrderMode(): typeof D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE {
  return D4C7G_FACILITY_ADMINISTER_STANDING_ORDER_MODE;
}

/** Typed observability / error contracts (no unnecessary PHI). */
export const D4C7G_ERROR_CODES = {
  FACILITY_MEDICATION_MAR_PROJECTION_FAILED:
    "FACILITY_MEDICATION_MAR_PROJECTION_FAILED",
  OUTPATIENT_RX_FACILITY_ADMIN_DESTINATION_FORBIDDEN:
    "OUTPATIENT_RX_FACILITY_ADMIN_DESTINATION_FORBIDDEN",
  OUTPATIENT_RX_NON_MEDICATION_CATEGORY_FORBIDDEN:
    "OUTPATIENT_RX_NON_MEDICATION_CATEGORY_FORBIDDEN",
  OUTPATIENT_RX_PILOT_SCOPE_NOT_APPLICABLE:
    "OUTPATIENT_RX_PILOT_SCOPE_NOT_APPLICABLE",
} as const;

export type D4c7gErrorCode =
  (typeof D4C7G_ERROR_CODES)[keyof typeof D4C7G_ERROR_CODES];

/**
 * When Facility MAR shift timeline chrome is hidden (Haiti ambulatory), still show
 * pending OrderItem MAR tasks from the same `isOrderItemPendingNurseMedication` authority.
 */
export function shouldShowAmbulatoryPendingMarOrderItemFallback(input: {
  showFacilityMarShiftTimeline: boolean;
  marTabShowLegacySections: boolean;
}): boolean {
  if (input.marTabShowLegacySections) return true;
  return input.showFacilityMarShiftTimeline === false;
}

/** Clinic Rx tile must use strict outpatient mode — never DEFAULT facility Orders composer. */
export function clinicAmbulatoryOutpatientRxOrderMode(input: {
  ambulatoryCareSetting: boolean;
}): D4c7gMedicationOrderMode {
  return input.ambulatoryCareSetting === true
    ? D4C7G_OUTPATIENT_RX_ORDER_MODE
    : "DEFAULT";
}

export type D4c7gOrderCreateItemLike = {
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
};

export type D4c7gOrderCreateLike = {
  type?: string | null;
  items?: D4c7gOrderCreateItemLike[] | null;
};

/**
 * Pure outpatient Rx create: MEDICATION order whose every medication line is
 * PHARMACY_DISPENSE. Pilot/stock/formulary facility gates must not block these.
 */
export function isPureOutpatientPrescriptionOrderCreate(
  data: D4c7gOrderCreateLike
): boolean {
  if (String(data.type ?? "").trim() !== "MEDICATION") return false;
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return false;
  let sawMedication = false;
  for (const item of items) {
    const catalogType = String(item.catalogItemType ?? "").trim();
    if (catalogType !== "MEDICATION") return false;
    sawMedication = true;
    if (String(item.medicationFulfillmentIntent ?? "").trim() !== "PHARMACY_DISPENSE") {
      return false;
    }
  }
  return sawMedication;
}

/**
 * Skip tranche-1 pilot / facility-scope blockers for pure outpatient Rx only.
 * Facility-admin (ADMINISTER_CHART) and mixed creates keep the pilot gate.
 */
export function shouldSkipPilotScopeForOutpatientRxCreate(
  data: D4c7gOrderCreateLike
): boolean {
  return isPureOutpatientPrescriptionOrderCreate(data);
}

export type D4c7gMarProjectionObservability = {
  orderId?: string | null;
  orderItemId?: string | null;
  intent?: string | null;
  eligible: boolean;
  exclusionReason?: string | null;
  errorCode?: D4c7gErrorCode | null;
};

/**
 * Build non-PHI observability when a facility-admin line is labeled MAR-managed
 * but cannot be projected into the visible MAR surface.
 */
export function buildFacilityMarProjectionObservability(input: {
  orderId?: string | null;
  orderItemId?: string | null;
  intent?: string | null;
  pendingEligible: boolean;
  timelineVisible: boolean;
  pendingTaskSurfaceVisible: boolean;
}): D4c7gMarProjectionObservability {
  const intent = String(input.intent ?? "").trim() || null;
  const chartAdmin =
    intent === "ADMINISTER_CHART" || intent === "" || intent == null;
  if (!chartAdmin) {
    return {
      orderId: input.orderId ?? null,
      orderItemId: input.orderItemId ?? null,
      intent,
      eligible: false,
      exclusionReason: "NOT_FACILITY_ADMIN_INTENT",
      errorCode: null,
    };
  }
  if (!input.pendingEligible) {
    return {
      orderId: input.orderId ?? null,
      orderItemId: input.orderItemId ?? null,
      intent,
      eligible: false,
      exclusionReason: "NOT_PENDING_NURSE_MEDICATION",
      errorCode: null,
    };
  }
  const surfaceVisible =
    input.timelineVisible === true || input.pendingTaskSurfaceVisible === true;
  if (!surfaceVisible) {
    return {
      orderId: input.orderId ?? null,
      orderItemId: input.orderItemId ?? null,
      intent,
      eligible: true,
      exclusionReason: "MAR_UI_SURFACE_HIDDEN",
      errorCode: D4C7G_ERROR_CODES.FACILITY_MEDICATION_MAR_PROJECTION_FAILED,
    };
  }
  return {
    orderId: input.orderId ?? null,
    orderItemId: input.orderItemId ?? null,
    intent,
    eligible: true,
    exclusionReason: null,
    errorCode: null,
  };
}

/** Force outpatient Rx line intent — never ADMINISTER_CHART in pure Rx mode. */
export function resolveOutpatientRxLineIntent(): "PHARMACY_DISPENSE" {
  return "PHARMACY_DISPENSE";
}

export function assertOutpatientRxModeRejectsFacilityAdminIntent(input: {
  medicationOrderMode: string;
  medicationFulfillmentIntent?: string | null;
}): { ok: true } | { ok: false; errorCode: D4c7gErrorCode } {
  if (input.medicationOrderMode !== D4C7G_OUTPATIENT_RX_ORDER_MODE) {
    return { ok: true };
  }
  if (String(input.medicationFulfillmentIntent ?? "").trim() === "ADMINISTER_CHART") {
    return {
      ok: false,
      errorCode: D4C7G_ERROR_CODES.OUTPATIENT_RX_FACILITY_ADMIN_DESTINATION_FORBIDDEN,
    };
  }
  return { ok: true };
}
