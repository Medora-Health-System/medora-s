/**
 * MEDUI.D4C.7E — Enterprise Clinic medication order, MAR, and independent
 * outpatient prescription separation.
 *
 * Extends D4C.5B.3 intent routing (`medicationFulfillmentIntent`) for all Clinic
 * ambulatory workspaces. No ClinicMedicationOrder / ClinicMAR / ClinicPrescription.
 */

import { pickCatalogDisplayLabelForProductUi } from "../i18n/productUiLocale.js";
import {
  canPrintAmbulatoryExternalPrescriptions,
  filterAmbulatoryExternalPrescriptionOrders,
  isAmbulatoryExternalPrescriptionItem,
  isAmbulatoryOnsiteMarMedicationItem,
  isExternalPharmacyDispenseIntent,
  isIvOrInfusionRoute,
  isOnsiteAdministerMedicationIntent,
  type D4c5b3OrderItemLike,
  type D4c5b3OrderLike,
} from "./clinicCareHaitiAmbulatoryOrdersMedicationsResultsD4c5b3.js";

export const CLINIC_ENTERPRISE_MEDICATION_ORDERS_MAR_RX_CERTIFICATION_ID =
  "MEDUI.D4C.7E" as const;

/** Canonical typed intents (Prisma MedicationFulfillmentIntent + home history). */
export const D4C7E_MEDICATION_INTENT = {
  FACILITY_ADMINISTRATION: "ADMINISTER_CHART",
  OUTPATIENT_PRESCRIPTION: "PHARMACY_DISPENSE",
  HOME_MEDICATION_HISTORY: "HOME_MEDICATION_HISTORY",
} as const;

export type D4c7eMedicationIntentCanonical =
  (typeof D4C7E_MEDICATION_INTENT)[keyof typeof D4C7E_MEDICATION_INTENT];

/** Forbidden duplicate Clinic* authorities — source-guard targets. */
export const D4C7E_FORBIDDEN_CLINIC_MEDICATION_AUTHORITIES = [
  "ClinicMedicationOrder",
  "ClinicMedicationOrderItem",
  "ClinicMedicationAdministration",
  "ClinicMAR",
  "ClinicMedicationPass",
  "ClinicMedicationTask",
  "ClinicPrescription",
  "ClinicPrescriptionLine",
  "ClinicRx",
  "ClinicRxLine",
  "ClinicDrugCatalog",
  "ClinicPharmacyQueue",
  "ClinicHomeMedication",
  "ClinicMedicationStatus",
] as const;

/**
 * Clinic ambulatory Orders tile: facility-administered meds → enterprise MAR.
 * Applies for all ambulatory Clinic Care (not Haiti-only). ED unchanged.
 */
export function clinicAmbulatoryFacilityMedicationOrderMode(input: {
  ambulatoryCareSetting: boolean;
}): "ER_ADMINISTER_ONLY" | "DEFAULT" {
  return input.ambulatoryCareSetting === true ? "ER_ADMINISTER_ONLY" : "DEFAULT";
}

/** Map enterprise intent → product domain label key suffix. */
export function d4c7eMedicationIntentDomainKey(
  intent: string | null | undefined
): "facilityAdministration" | "outpatientPrescription" | "unknown" {
  if (isExternalPharmacyDispenseIntent(intent)) return "outpatientPrescription";
  if (isOnsiteAdministerMedicationIntent(intent)) return "facilityAdministration";
  return "unknown";
}

export type D4c7ePrintLineProjection = {
  catalogItemId?: string;
  manualLabel?: string | null;
  strength?: string | null;
  route?: string | null;
  notes?: string | null;
  quantity?: number | null;
  refillCount?: number | null;
  medicationFulfillmentIntent?: string | null;
  catalogMedication?: {
    code?: string | null;
    displayNameFr?: string | null;
    name?: string;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
};

export type D4c7ePersistedOrderItemLike = {
  id?: string;
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  route?: string | null;
  status?: string | null;
  freeText?: string | null;
  displayLabel?: string | null;
  displayLabelFr?: string | null;
  displayLabelEn?: string | null;
  manualLabel?: string | null;
  strength?: string | null;
  quantity?: number | null;
  refillCount?: number | null;
  notes?: string | null;
  catalogItemId?: string | null;
  _label?: string | null;
  _dosageForm?: string | null;
  _route?: string | null;
  isManual?: boolean;
  catalogItem?: { type?: string | null; category?: string | null; name?: string | null } | null;
  catalogMedication?: {
    code?: string | null;
    displayNameFr?: string | null;
    name?: string;
    strength?: string | null;
    dosageForm?: string | null;
    route?: string | null;
  } | null;
};

function resolvePersistedMedicationLabel(
  it: D4c7ePersistedOrderItemLike,
  language: string = "en"
): string {
  const code = String(it.catalogMedication?.code ?? "").trim();
  const catalog = pickCatalogDisplayLabelForProductUi(language, {
    displayNameEn: String(it.displayLabelEn ?? "").trim(),
    displayNameFr: String(it.displayLabelFr ?? it.catalogMedication?.displayNameFr ?? "").trim(),
    code,
  });
  if (catalog && catalog !== "UNLOCALIZED_SOURCE") return catalog;
  return (
    String(it.displayLabel ?? "").trim() ||
    String(it.manualLabel ?? "").trim() ||
    String(it._label ?? "").trim() ||
    String(it.freeText ?? "").trim() ||
    String(it.catalogItem?.name ?? "").trim() ||
    String(it.catalogMedication?.name ?? "").trim() ||
    code
  );
}

/**
 * Project only outpatient (PHARMACY_DISPENSE) lines for print — never chart-admin / IV.
 * Prefers persisted API item fields; falls back to submit snapshot labels.
 */
export function projectPersistedOutpatientPrescriptionPrintLines(
  items: readonly D4c7ePersistedOrderItemLike[],
  language: string = "en"
): D4c7ePrintLineProjection[] {
  const out: D4c7ePrintLineProjection[] = [];
  for (const it of items) {
    if (!isAmbulatoryExternalPrescriptionItem(it)) continue;
    if (isIvOrInfusionRoute(it.route ?? it.catalogMedication?.route ?? it._route)) continue;
    const label = resolvePersistedMedicationLabel(it, language);
    if (!label) continue;
    out.push({
      catalogItemId: it.catalogItemId ?? undefined,
      manualLabel: label,
      strength: it.strength ?? it.catalogMedication?.strength ?? null,
      route: it.route ?? it.catalogMedication?.route ?? it._route ?? null,
      notes: it.notes ?? null,
      quantity: it.quantity ?? null,
      refillCount: it.refillCount ?? 0,
      medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE",
      catalogMedication: it.catalogMedication
        ? {
            ...it.catalogMedication,
            displayNameFr: it.catalogMedication.displayNameFr ?? label,
            name: it.catalogMedication.name ?? label,
          }
        : {
            displayNameFr: label,
            name: label,
            strength: it.strength ?? undefined,
            dosageForm: it._dosageForm ?? undefined,
            route: it.route ?? it._route ?? undefined,
          },
    });
  }
  return out;
}

export type D4c7ePrintGate =
  | { ok: true; lineCount: number; lines: D4c7ePrintLineProjection[] }
  | { ok: false; reasonKey: string };

/** Validate before opening browser print preview — block blank / chart-admin-only prints. */
export function validateOutpatientPrescriptionPrintProjection(
  items: readonly D4c7ePersistedOrderItemLike[],
  language: string = "en"
): D4c7ePrintGate {
  const lines = projectPersistedOutpatientPrescriptionPrintLines(items, language);
  if (lines.length === 0) {
    const anyFacility = items.some((it) => isAmbulatoryOnsiteMarMedicationItem(it));
    if (anyFacility) {
      return { ok: false, reasonKey: "clinicCareD4c7e.rx.printBlockedFacilityOnly" };
    }
    return { ok: false, reasonKey: "clinicCareD4c7e.rx.printBlockedEmpty" };
  }
  return { ok: true, lineCount: lines.length, lines };
}

/** Verbal facility order must not print as provider outpatient Rx without provider sign. */
export function canPrintVerbalOrderAsProviderOutpatientRx(input: {
  isVerbalOrder: boolean;
  providerCosignComplete: boolean;
  hasOutpatientDispenseLines: boolean;
}): { ok: true } | { ok: false; reasonKey: string } {
  if (!input.hasOutpatientDispenseLines) {
    return { ok: false, reasonKey: "clinicCareD4c7e.rx.printBlockedEmpty" };
  }
  if (input.isVerbalOrder && !input.providerCosignComplete) {
    return { ok: false, reasonKey: "clinicCareD4c7e.rx.printBlockedUnsignedVerbal" };
  }
  return { ok: true };
}

/** External pharmacy send honesty when no e-prescribing connector exists. */
export const D4C7E_EXTERNAL_PHARMACY_SEND_STATUS = {
  UNSENT_NO_CONNECTOR: "UNSENT_NO_CONNECTOR",
  SELECTED_MANUAL: "SELECTED_MANUAL",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;

export type D4c7eExternalPharmacySendStatus =
  (typeof D4C7E_EXTERNAL_PHARMACY_SEND_STATUS)[keyof typeof D4C7E_EXTERNAL_PHARMACY_SEND_STATUS];

export function resolveExternalPharmacySendStatus(input: {
  pharmacySelected: boolean;
  ePrescribingConnectorAvailable: boolean;
  sendAttempted?: boolean;
  sendSucceeded?: boolean;
}): D4c7eExternalPharmacySendStatus {
  if (input.sendAttempted === true && input.sendSucceeded === true) {
    return D4C7E_EXTERNAL_PHARMACY_SEND_STATUS.SENT;
  }
  if (input.sendAttempted === true && input.sendSucceeded === false) {
    return D4C7E_EXTERNAL_PHARMACY_SEND_STATUS.FAILED;
  }
  if (!input.ePrescribingConnectorAvailable) {
    return input.pharmacySelected
      ? D4C7E_EXTERNAL_PHARMACY_SEND_STATUS.SELECTED_MANUAL
      : D4C7E_EXTERNAL_PHARMACY_SEND_STATUS.UNSENT_NO_CONNECTOR;
  }
  return D4C7E_EXTERNAL_PHARMACY_SEND_STATUS.UNSENT_NO_CONNECTOR;
}

export function externalPharmacySendStatusDisplayKey(
  status: D4c7eExternalPharmacySendStatus
): string {
  switch (status) {
    case "SENT":
      return "clinicCareD4c7e.externalPharmacy.status.sent";
    case "FAILED":
      return "clinicCareD4c7e.externalPharmacy.status.failed";
    case "SELECTED_MANUAL":
      return "clinicCareD4c7e.externalPharmacy.status.selectedManual";
    default:
      return "clinicCareD4c7e.externalPharmacy.status.unsentNoConnector";
  }
}

/** Role matrix tokens for documentation / source guards (server enforces separately). */
export const D4C7E_ROLE_MATRIX = {
  PROVIDER: {
    facilityOrder: true,
    marView: true,
    marAdminister: false,
    outpatientRxAuthor: true,
    outpatientRxSign: true,
    pharmacyVerify: false,
  },
  RN: {
    facilityOrder: "verbal_only",
    marView: true,
    marAdminister: true,
    outpatientRxAuthor: false,
    outpatientRxSign: false,
    pharmacyVerify: false,
  },
  MA: {
    facilityOrder: false,
    marView: "delegated_only",
    marAdminister: "delegated_only",
    outpatientRxAuthor: false,
    outpatientRxSign: false,
    pharmacyVerify: false,
  },
  PHARMACY: {
    facilityOrder: false,
    marView: true,
    marAdminister: false,
    outpatientRxAuthor: false,
    outpatientRxSign: false,
    pharmacyVerify: true,
  },
  ADMIN: {
    facilityOrder: false,
    marView: true,
    marAdminister: false,
    outpatientRxAuthor: false,
    outpatientRxSign: false,
    pharmacyVerify: false,
  },
  FRONT_DESK: {
    facilityOrder: false,
    marView: false,
    marAdminister: false,
    outpatientRxAuthor: false,
    outpatientRxSign: false,
    pharmacyVerify: false,
  },
} as const;

/** Non-crossover: outpatient Rx must never look like facility MAR work. */
export function assertOutpatientRxDoesNotCreateMarTask(
  it: D4c5b3OrderItemLike
): boolean {
  if (!isAmbulatoryExternalPrescriptionItem(it)) return true;
  return !isAmbulatoryOnsiteMarMedicationItem(it);
}

/** Non-crossover: facility order must not auto-appear as outpatient Rx. */
export function assertFacilityOrderDoesNotCreateOutpatientRx(
  it: D4c5b3OrderItemLike
): boolean {
  if (!isAmbulatoryOnsiteMarMedicationItem(it)) return true;
  return !isAmbulatoryExternalPrescriptionItem(it);
}

/** Home med history must create neither order, Rx, nor MAR — classifier token only. */
export function isHomeMedicationHistoryIntent(intent: string | null | undefined): boolean {
  return (
    String(intent ?? "")
      .trim()
      .toUpperCase() === "HOME_MEDICATION_HISTORY"
  );
}

export function filterFacilityMarOrdersForClinic<T extends D4c5b3OrderLike>(
  orders: readonly T[]
): T[] {
  const out: T[] = [];
  for (const order of orders) {
    if (String(order.status ?? "").toUpperCase() === "CANCELLED") continue;
    const items = (order.items ?? []).filter((it) => isAmbulatoryOnsiteMarMedicationItem(it));
    if (items.length === 0) continue;
    out.push({ ...order, items } as T);
  }
  return out;
}

export function filterClinicOutpatientPrescriptionOrders<T extends D4c5b3OrderLike>(
  orders: readonly T[]
): T[] {
  return filterAmbulatoryExternalPrescriptionOrders(orders);
}

export function canPrintClinicOutpatientPrescriptions(
  orders: readonly D4c5b3OrderLike[]
): { ok: true; lineCount: number } | { ok: false; reasonKey: string } {
  const gate = canPrintAmbulatoryExternalPrescriptions(orders);
  if (!gate.ok) {
    return { ok: false, reasonKey: "clinicCareD4c7e.rx.printBlockedEmpty" };
  }
  return gate;
}

/** Idempotency token helper — same order ID across Orders / Pharmacy / MAR. */
export function sameEnterpriseOrderAuthorityId(
  ordersViewOrderId: string,
  marLinkedOrderId: string,
  pharmacyLinkedOrderId?: string | null
): boolean {
  const a = String(ordersViewOrderId ?? "").trim();
  const b = String(marLinkedOrderId ?? "").trim();
  if (!a || !b || a !== b) return false;
  if (pharmacyLinkedOrderId == null || pharmacyLinkedOrderId === "") return true;
  return a === String(pharmacyLinkedOrderId).trim();
}
