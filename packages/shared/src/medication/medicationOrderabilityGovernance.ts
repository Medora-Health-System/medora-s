/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Medication orderability governance — every catalog row must have explicit status + reason.
 */

import { ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES } from "./enterpriseFormularyPilotTrancheAManifest.js";
import type { EnterpriseWave1FormularyEntry } from "./enterpriseWave1Types.js";
import type { HaitiMedicationFormularyRow } from "./haitiCanonicalMedicationLinkageTypes.js";

export type MedicationOrderabilityStatus =
  | "ORDERABLE_READY"
  | "ORDERABLE_BUT_MAR_INCOMPLETE"
  | "CATALOG_ONLY_NOT_ORDERABLE"
  | "RESTRICTED_WITH_REASON"
  | "MISSING_FROM_ORDER_SEARCH"
  | "MISSING_FROM_MAR"
  | "MISSING_FROM_PHARMACY"
  | "NEEDS_CLINICAL_REVIEW";

export type MedicationCareSetting = "ED" | "INPATIENT" | "OUTPATIENT" | "PHARMACY" | "MAR";

export type MedicationOrderabilityRecord = {
  catalogCode: string;
  genericName: string;
  displayNameEn: string;
  displayNameFr: string;
  route: string;
  dosageForm: string;
  strength: string;
  orderabilityStatus: MedicationOrderabilityStatus;
  allowedCareSettings: MedicationCareSetting[];
  allowedRoutes: string[];
  defaultDoseOptions?: string[];
  requiresPharmacyReview: boolean;
  requiresClinicalReview: boolean;
  restrictedReason: string | null;
  notOrderableReason: string | null;
  marDocumentationRequirements: string[];
  inventoryNdcLinked: boolean;
  orderSearchEnabled: boolean;
  marEnabled: boolean;
  source: "haiti" | "enterprise" | "both";
};

const PILOT_ORDERABLE = new Set<string>(ENTERPRISE_FORMULARY_PILOT_TRANCHE_A_CATALOG_CODES);

function normalizeRoute(route: string): string {
  return route.trim().toLowerCase();
}

function defaultRoutesForEntry(route: string, administrationType?: string | null): string[] {
  const routes = new Set<string>();
  const r = normalizeRoute(route);
  if (r) routes.add(route.trim());
  const admin = (administrationType ?? "").toUpperCase();
  if (admin === "IM" || r.includes("intramuscular")) routes.add("IM");
  if (admin === "ORAL" || r.includes("oral")) routes.add("PO");
  if (admin === "IV" || r.includes("intravenous")) routes.add("IV");
  if (admin === "SQ" || r.includes("subcut")) routes.add("SQ");
  if (admin === "INFUSION") routes.add("IV infusion");
  return [...routes];
}

function resolveEnterpriseStatus(
  entry: EnterpriseWave1FormularyEntry,
  inHaiti: boolean
): Pick<
  MedicationOrderabilityRecord,
  | "orderabilityStatus"
  | "restrictedReason"
  | "notOrderableReason"
  | "requiresPharmacyReview"
  | "requiresClinicalReview"
  | "orderSearchEnabled"
  | "marEnabled"
> {
  const requiresPharmacyReview = entry.governance.requiresPharmacyVerification;
  const requiresClinicalReview =
    entry.governance.isHighAlert || entry.governance.isControlled || entry.bucket === "ANTICOAGULATION";

  if (entry.governance.isControlled) {
    return {
      orderabilityStatus: "RESTRICTED_WITH_REASON",
      restrictedReason: "Controlled substance — requires governance activation and witness workflow",
      notOrderableReason: null,
      requiresPharmacyReview: true,
      requiresClinicalReview: true,
      orderSearchEnabled: false,
      marEnabled: false,
    };
  }

  if (PILOT_ORDERABLE.has(entry.catalogCode)) {
    return {
      orderabilityStatus: "ORDERABLE_READY",
      restrictedReason: null,
      notOrderableReason: null,
      requiresPharmacyReview,
      requiresClinicalReview,
      orderSearchEnabled: true,
      marEnabled: true,
    };
  }

  if (entry.bucket === "VACCINE") {
    return {
      orderabilityStatus: "RESTRICTED_WITH_REASON",
      restrictedReason:
        "Vaccine requires formulary approval, enable-order-search, and documented vaccine administration workflow",
      notOrderableReason: null,
      requiresPharmacyReview: true,
      requiresClinicalReview: false,
      orderSearchEnabled: false,
      marEnabled: false,
    };
  }

  if (requiresClinicalReview) {
    return {
      orderabilityStatus: "RESTRICTED_WITH_REASON",
      restrictedReason: "High-alert medication — staged activation and pharmacy review required",
      notOrderableReason: null,
      requiresPharmacyReview: true,
      requiresClinicalReview: true,
      orderSearchEnabled: false,
      marEnabled: false,
    };
  }

  return {
    orderabilityStatus: inHaiti ? "CATALOG_ONLY_NOT_ORDERABLE" : "MISSING_FROM_ORDER_SEARCH",
    restrictedReason: null,
    notOrderableReason: "Enterprise catalog entry requires staged activation (formulary approve + enable-order-search)",
    requiresPharmacyReview,
    requiresClinicalReview,
    orderSearchEnabled: false,
    marEnabled: false,
  };
}

export function buildOrderabilityFromHaitiRow(row: HaitiMedicationFormularyRow): MedicationOrderabilityRecord {
  const restrictedReason = row.isControlled
    ? "Controlled substance — restricted ordering"
    : !row.isActive
      ? "Inactive Haiti catalog row"
      : null;
  const status: MedicationOrderabilityStatus =
    !row.isActive
      ? "CATALOG_ONLY_NOT_ORDERABLE"
      : row.isControlled
        ? "RESTRICTED_WITH_REASON"
        : "ORDERABLE_READY";

  return {
    catalogCode: row.code,
    genericName: row.genericName,
    displayNameEn: row.displayNameEn ?? row.genericName,
    displayNameFr: row.displayNameFr,
    route: row.route,
    dosageForm: row.dosageForm,
    strength: row.strength,
    orderabilityStatus: status,
    allowedCareSettings: ["ED", "INPATIENT", "OUTPATIENT", "MAR", "PHARMACY"],
    allowedRoutes: defaultRoutesForEntry(row.route, row.administrationType),
    defaultDoseOptions: row.strength?.trim() ? [row.strength.trim()] : undefined,
    requiresPharmacyReview: Boolean(row.requiresWitness || row.isControlled),
    requiresClinicalReview: Boolean(row.isControlled || row.requiresDoubleSign),
    restrictedReason,
    notOrderableReason: !row.isActive ? "Inactive in Haiti formulary catalog" : null,
    marDocumentationRequirements: row.isControlled ? ["witness", "double_sign"] : [],
    inventoryNdcLinked: false,
    orderSearchEnabled: row.isActive && !row.isControlled,
    marEnabled: row.isActive,
    source: "haiti",
  };
}

export function buildOrderabilityFromEnterpriseEntry(
  entry: EnterpriseWave1FormularyEntry,
  inHaiti: boolean
): MedicationOrderabilityRecord {
  const resolved = resolveEnterpriseStatus(entry, inHaiti);
  return {
    catalogCode: entry.catalogCode,
    genericName: entry.genericName,
    displayNameEn: entry.displayNameEn,
    displayNameFr: entry.displayNameFr,
    route: entry.route,
    dosageForm: entry.dosageForm,
    strength: entry.strength,
    orderabilityStatus: resolved.orderabilityStatus,
    allowedCareSettings: ["ED", "INPATIENT", "OUTPATIENT", "MAR", "PHARMACY"],
    allowedRoutes: defaultRoutesForEntry(entry.route, entry.administrationType),
    defaultDoseOptions: entry.strength?.trim() ? [entry.strength.trim()] : undefined,
    requiresPharmacyReview: resolved.requiresPharmacyReview,
    requiresClinicalReview: resolved.requiresClinicalReview,
    restrictedReason: resolved.restrictedReason,
    notOrderableReason: resolved.notOrderableReason,
    marDocumentationRequirements: entry.administrationType === "IM" ? ["injection_site", "lot", "expiration"] : [],
    inventoryNdcLinked: Boolean(entry.bucket !== "VACCINE"),
    orderSearchEnabled: resolved.orderSearchEnabled,
    marEnabled: resolved.marEnabled,
    source: inHaiti ? "both" : "enterprise",
  };
}

export function isProviderOrderSearchCandidate(record: MedicationOrderabilityRecord): boolean {
  return (
    record.orderabilityStatus === "ORDERABLE_READY" &&
    record.orderSearchEnabled &&
    !record.notOrderableReason
  );
}

export function medicationHasDocumentedNonOrderableReason(record: MedicationOrderabilityRecord): boolean {
  if (record.orderabilityStatus === "ORDERABLE_READY") return false;
  return Boolean(record.restrictedReason?.trim() || record.notOrderableReason?.trim());
}
