/**
 * MEDUI.ES.1H — Orders / MAR / Pharmacy / Medication catalog / Labs / Imaging
 * governed Spanish overlay.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES,
  productUiLanguageSelectOptions,
} from "@/i18n/config";
import {
  applyApprovedSpanishTerminology,
  ES_MEDICAL_TERMINOLOGY,
  isHiddenSpanishPlaceholder,
} from "@medora/shared";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";
import { i18nMessage } from "@/lib/i18nMessagesLookup";
import { resolveClientUiLanguage } from "@/i18n/resolveClientUiLanguage";
import { pickCatalogDisplayLabelForProductUi } from "@/i18n/config";
import {
  catalogSearchItemFullDisplayLine,
  getCatalogSearchItemDisplayLabel,
  getCatalogSearchItemSecondaryLine,
} from "@/lib/catalogDisplayLabel";
import { printT } from "@/lib/printI18n";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { existingOrderDisplayLabel } from "@medora/shared";
import en from "./en";
import fr from "./fr";
import es, { applyGovernedSpanishOverlay } from "./es";
import { createHiddenSpanishCatalog } from "./hiddenSpanishCatalog";
import { MEDUI_ES_1E_OVERLAY } from "./meduiEs1eCorePlatformOverlay";
import { MEDUI_ES_1F_OVERLAY } from "./meduiEs1fEmergencyDepartmentOverlay";
import { MEDUI_ES_1G_OVERLAY } from "./meduiEs1gHospitalInpatientObservationOverlay";
import {
  MEDUI_ES_1H_EMPTY_OVERLAY_PATHS,
  MEDUI_ES_1H_OVERLAY,
} from "./meduiEs1hOrdersMarPharmacyDiagnosticsOverlay";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function collectLeaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof obj === "string") {
    if (prefix) out.set(prefix, obj);
    return out;
  }
  if (obj !== null && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      for (const [p, s] of collectLeaves(v, next)) out.set(p, s);
    }
  }
  return out;
}

/**
 * Multi-word prose, i.e. text that still carries a lowercase-initial word of
 * 4+ letters once interpolation tokens are removed. Codes, measurements, and
 * token-only format strings are therefore not treated as prose.
 */
function isSentenceLike(value: string): boolean {
  const withoutTokens = value.replace(/\{[^{}]+\}/g, " ");
  return /\S\s\S/.test(withoutTokens) && /(^|[^\p{L}])\p{Ll}\p{L}{3,}/u.test(withoutTokens);
}

/** Prose whose governed Spanish is legitimately identical to the EN cognate. */
const EN_IDENTICAL_PROSE_ALLOWED = new Set(["erProcedureLauncher.centralLineType.TRIPLE_LUMEN"]);

function interpolationTokens(value: string): string[] {
  return [...value.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort();
}

function countPlaceholders(tree: unknown): { totalLeaves: number; placeholders: number } {
  const leaves = collectLeaves(tree);
  let placeholders = 0;
  for (const value of leaves.values()) {
    if (isHiddenSpanishPlaceholder(value)) placeholders += 1;
  }
  return { totalLeaves: leaves.size, placeholders };
}

const ORDERS_PREFIXES = [
  "erProcedureLauncher.",
  "createOrderModal.",
  "orderDetail.",
  "edHosp1dObservationOrders.",
  "erEmergencyOrders.",
  "edHosp1eAdmissionOrders.",
  "medicationOrderLifecycle.",
  "orderEvent.",
  "cancelOrderModal.",
  "orders.",
  "ordersets.",
  "orderItemStatus.",
  "enterpriseOrderOrigin.",
  "orderCancelReason.",
  "orderLifecycle.",
  "orderAuthority.",
  "procedureCapture.",
  "procedureExecutionLinkage.",
  "procedureOrderDocumentationLinkage.",
  "encounterConsultDiagnostics.",
] as const;

const MAR_PREFIXES = [
  "marTab.",
  "marShiftTimeline.",
  "marMedicationResponse.",
  "marClinicalCorrection.",
  "marRespiratoryMedicationResponse.",
  "marPrnGovernance.",
  "marTimingOverride.",
  "marGovernance.",
  "marReschedule.",
  "marAdministrationHistory.",
  "marScheduleTiming.",
  "marControlled.",
  "marAllergyReview.",
  "marHighAlert.",
  "marLasa.",
  "marAdministrationVariance.",
  "marPassQueue.",
  "marDoseScheduleAdjustment.",
  "marAdministrationCorrection.",
  "marHistorical.",
  "marInfusionStopReason.",
  "marClinicalTime.",
  "medicationAdministrationLifecycle.",
  "medicationFollowUp.",
  "marPharmacy.",
  "continuousInfusionRuntime.",
  "infusionTimeline.",
  "medicationSoftSafety.",
  "advancedMedicationSafety.",
  "medicationTimingSafety.",
  "medicationSafety.",
  "secondClinicianVerification.",
  "mar.",
] as const;

const PHARMACY_PREFIXES = [
  "pharmacyWorklistPage.",
  "pharmacyDispense.",
  "pharmacyAdjustStock.",
  "pharmacyInventoryPage.",
  "pharmacyAlertsCard.",
  "pharmacyInventoryTable.",
  "pharmacyReceiveStock.",
  "pharmacyQuickAdd.",
  "pharmacyHomePage.",
  "pharmacyExpiringPage.",
  "pharmacyLowStockPage.",
  "pharmacyInventoryToolbar.",
  "pharmacyInventoryFilters.",
  "pharmacyFavorites.",
  "worklistDepartments.pharmacy.",
] as const;

const MEDICATION_CATALOG_PREFIXES = ["pharmacyMedicationSearch.", "medicationsPage."] as const;

const LABS_PREFIXES = [
  "labRadTechnicianDashboard.",
  "clinicalResultViewer.",
  "labRadEscalation.",
  "labRadReconciliation.",
  "labRadTime.",
  "structuredDiagnosticResult.",
  "worklistDepartments.lab.",
] as const;

const IMAGING_PREFIXES = ["worklistDepartments.rad."] as const;

const SHARED_PREFIXES = [
  "worklistDepartments.shared.",
  "sharedCatalogAutocomplete.",
  "attribution.",
] as const;

const GENERIC_PREFIXES = ["unifiedTimeline."] as const;

/** Imaging chrome carved out of the otherwise lab-owned diagnostic sections. */
const IMAGING_EXACT = [
  "clinicalResultViewer.mainSectionReport",
  "clinicalResultViewer.complement",
  "clinicalResultViewer.imagingExam",
  "clinicalResultViewer.imagingCriticalBanner",
  "structuredDiagnosticResult.findings",
  "structuredDiagnosticResult.impression",
  "structuredDiagnosticResult.technique",
  "structuredDiagnosticResult.comparison",
  "structuredDiagnosticResult.recommendation",
  "structuredDiagnosticResult.indication",
  "structuredDiagnosticResult.imagingNeedContent",
] as const;

/** The only patientChartUi keys 1H is allowed to claim. */
const PATIENT_CHART_ALLOW = new Set([
  "patientChartUi.orderDisplayFallback.medication",
  "patientChartUi.orderDisplayFallback.labTest",
  "patientChartUi.orderDisplayFallback.imaging",
  "patientChartUi.orderDisplayFallback.care",
  "patientChartUi.orderDisplayFallback.supply",
  "patientChartUi.orderDisplayFallback.englishLabelPending",
  "patientChartUi.tabsOrders",
  "patientChartUi.tabsResults",
  "patientChartUi.tabsMedications",
  "patientChartUi.tabsImaging",
  "patientChartUi.placeholderOrders",
  "patientChartUi.placeholderResults",
  "patientChartUi.placeholderMedications",
  "patientChartUi.placeholderImaging",
]);

function matches(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => path === p.slice(0, -1) || path.startsWith(p));
}

const STABLE_CODE_VALUES = new Set([
  "BMP",
  "BNP",
  "CBC",
  "CMP",
  "COVID",
  "COVID / Influenza / RSV",
  "Influenza A/B",
  "RSV",
  "PRN",
  "IV",
  "IM",
  "PO",
  "CT",
  "MRI",
  "XR",
  "US",
  "ECG",
  "EKG",
  "ED",
  "LAB",
  "CARE",
  "MED",
  "MAR",
  "PDF",
  "—",
]);

/**
 * Overlay-path catalog-safety class. Only LOCALIZED_UI_CONTENT may receive
 * ordinary Spanish. STABLE_CODE may appear identically. Everything else must
 * remain UNLOCALIZED_ES / canonical-source rather than invented Spanish.
 */
export function classify1hCatalogSafety(path: string, enVal: string, esVal: string): string {
  if (enVal === "" && esVal === "") return "LOCALIZED_UI_CONTENT";
  if (STABLE_CODE_VALUES.has(enVal.trim()) && esVal === enVal) return "STABLE_CODE";
  if (/^[A-Z][A-Z0-9]{1,5}$/.test(enVal.trim()) && esVal === enVal) return "STABLE_CODE";
  if (path.startsWith("createOrderModal.orderSetItems.")) {
    return "CANONICAL_SOURCE_IDENTITY";
  }
  return "LOCALIZED_UI_CONTENT";
}

function isInScope1hPath(path: string): boolean {
  return classify1hPath(path) !== "OUT_OF_SCOPE";
}

export function classify1hPath(path: string): string {
  if (path === "orders" || matches(path, ORDERS_PREFIXES)) return "ORDERS";
  if (path === "mar" || matches(path, MAR_PREFIXES)) return "MAR";
  if (matches(path, PHARMACY_PREFIXES)) return "PHARMACY";
  if (
    matches(path, MEDICATION_CATALOG_PREFIXES) ||
    path === "patientChartUi.orderDisplayFallback.medication"
  ) {
    return "MEDICATION_CATALOG";
  }
  if (matches(path, IMAGING_PREFIXES)) return "IMAGING";
  if (
    path.startsWith("clinicalResultViewer.imaging") ||
    IMAGING_EXACT.some((p) => path === p || path.startsWith(`${p}.`))
  ) {
    return "IMAGING";
  }
  if (matches(path, LABS_PREFIXES)) return "LABS";
  if (matches(path, SHARED_PREFIXES) || PATIENT_CHART_ALLOW.has(path)) {
    return "CLINICAL_CATALOG_SHARED";
  }
  if (matches(path, GENERIC_PREFIXES)) return "GENERIC_DEPENDENCY_REQUIRED_BY_1H";
  return "OUT_OF_SCOPE";
}

describe("MEDUI.ES.1H order entry / order lifecycle coverage", () => {
  it("order entry, order detail, and order lifecycle chrome are translated", () => {
    const paths = [
      "createOrderModal.titleCreate",
      "cancelOrderModal.cancelReasonTitle",
      "orderDetail.labTitle",
      "orderDetail.radTitle",
      "orderDetail.pharmacyTitle",
      "medicationOrderLifecycle.status.DISCONTINUED",
      "erEmergencyOrders.acknowledgeResult",
      "edHosp1dObservationOrders.title",
      "edHosp1eAdmissionOrders.title",
      "erProcedureLauncher.fieldUrgency",
    ];
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v, p).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
  });
});

describe("MEDUI.ES.1H MAR / pharmacy / medication catalog coverage", () => {
  it("MAR, pharmacy, and medication catalog chrome are translated", () => {
    const paths = [
      "marTab.empty",
      "marPassQueue.bucket.OVERDUE",
      "marAdministrationHistory.eventType.ADMINISTERED",
      "marHighAlert.title",
      "secondClinicianVerification.confirmSecondClinician",
      "pharmacyWorklistPage.title",
      "pharmacyInventoryPage.title",
      "pharmacyDispense.historyTitle",
      "medicationsPage.title",
      "pharmacyMedicationSearch.badgeHighAlert",
      "patientChartUi.orderDisplayFallback.medication",
      "patientChartUi.tabsMedications",
    ];
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v, p).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
  });
});

describe("MEDUI.ES.1H laboratory / imaging / shared catalog coverage", () => {
  it("lab, imaging, shared catalog, and timeline chrome are translated", () => {
    const paths = [
      "labRadTechnicianDashboard.labTitle",
      "labRadTechnicianDashboard.radTitle",
      "clinicalResultViewer.imagingExam",
      "clinicalResultViewer.imagingCriticalBanner",
      "structuredDiagnosticResult.findings",
      "structuredDiagnosticResult.impression",
      "worklistDepartments.lab.title",
      "worklistDepartments.shared.start",
      "sharedCatalogAutocomplete.searching",
      "attribution.orderedBy",
      "unifiedTimeline.empty",
      "patientChartUi.tabsImaging",
      "patientChartUi.tabsResults",
      "patientChartUi.orderDisplayFallback.labTest",
      "patientChartUi.orderDisplayFallback.imaging",
    ];
    for (const p of paths) {
      const v = getByPath(es, p);
      expect(typeof v, p).toBe("string");
      expect(isHiddenSpanishPlaceholder(v as string), p).toBe(false);
    }
  });
});

describe("MEDUI.ES.1H MAR administration state distinctness", () => {
  it("Administered / Held / Refused / Missed / Due / Overdue / Discontinued stay distinct", () => {
    const administered = getByPath(es, "marAdministrationHistory.eventType.ADMINISTERED") as string;
    const held = getByPath(es, "marAdministrationHistory.eventType.HELD") as string;
    const refused = getByPath(es, "marAdministrationHistory.eventType.REFUSED") as string;
    const missed = getByPath(es, "marAdministrationHistory.eventType.MISSED") as string;
    const due = getByPath(es, "marPassQueue.bucket.DUE") as string;
    const overdue = getByPath(es, "marPassQueue.bucket.OVERDUE") as string;
    const discontinued = getByPath(es, "medicationOrderLifecycle.status.DISCONTINUED") as string;

    expect(administered).toBe("Administrado");
    expect(held).toBe("Retenido");
    expect(refused).toBe("Rechazado");
    expect(missed).toBe("Omitido");
    expect(due).toBe("Pendiente de administrar");
    expect(overdue).toBe("Vencido");
    expect(discontinued).toBe("Suspendido");

    const set = new Set([administered, held, refused, missed, due, overdue, discontinued]);
    expect(set.size).toBe(7);
  });

  it("expired medication orders never reuse the deceased-patient wording", () => {
    expect(getByPath(es, "medicationOrderLifecycle.status.EXPIRED")).toBe("Caducado");
  });

  it("LATE_ADMINISTRATION is governed administered-late, distinct from DUE/OVERDUE/HELD", () => {
    const lateCanon = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.mar.late");
    const administeredLateCanon = ES_MEDICAL_TERMINOLOGY.find(
      (e) => e.key === "clinical.mar.administeredLate",
    );
    expect(lateCanon?.status).toBe("APPROVED");
    expect(lateCanon?.es).toBe("Con retraso");
    expect(lateCanon?.uiMessageKeys).toEqual(["marAdministrationVariance.badge.LATE"]);
    expect(administeredLateCanon?.status).toBe("APPROVED");
    expect(administeredLateCanon?.es).toBe("Administrado con retraso");
    expect(administeredLateCanon?.uiMessageKeys).toEqual([
      "marAdministrationHistory.eventType.LATE_ADMINISTRATION",
    ]);

    const due = getByPath(es, "marPassQueue.bucket.DUE") as string;
    const overdue = getByPath(es, "marPassQueue.bucket.OVERDUE") as string;
    const held = getByPath(es, "marAdministrationHistory.eventType.HELD") as string;
    const administered = getByPath(es, "marAdministrationHistory.eventType.ADMINISTERED") as string;
    const administeredLate = getByPath(
      es,
      "marAdministrationHistory.eventType.LATE_ADMINISTRATION",
    ) as string;
    const lateBadge = getByPath(es, "marAdministrationVariance.badge.LATE") as string;
    const refused = getByPath(es, "marAdministrationHistory.eventType.REFUSED") as string;
    const notGiven = getByPath(es, "marClinicalCorrection.type.CHARTED_NOT_GIVEN") as string;
    const discontinued = getByPath(es, "medicationOrderLifecycle.status.DISCONTINUED") as string;

    expect(due).toBe("Pendiente de administrar");
    expect(overdue).toBe("Vencido");
    expect(held).toBe("Retenido");
    expect(administered).toBe("Administrado");
    expect(administeredLate).toBe("Administrado con retraso");
    expect(lateBadge).toBe("Con retraso");
    expect(refused).toBe("Rechazado");
    expect(notGiven).toBe("Registrado como no administrado");
    expect(discontinued).toBe("Suspendido");

    const distinct = new Set([
      due,
      overdue,
      held,
      administered,
      administeredLate,
      lateBadge,
      refused,
      notGiven,
      discontinued,
    ]);
    expect(distinct.size).toBe(9);
    expect(MEDUI_ES_1H_OVERLAY["marAdministrationHistory.eventType.LATE_ADMINISTRATION"]).toBeUndefined();
    expect(MEDUI_ES_1H_OVERLAY["marAdministrationVariance.badge.LATE"]).toBeUndefined();
  });

  it("late administration chrome never uses REVIEW_REQUIRED 'Tardío'", () => {
    for (const [path, value] of Object.entries(MEDUI_ES_1H_OVERLAY)) {
      expect(/\bTard[íi]o\b/.test(value), `${path}: ${value}`).toBe(false);
    }
    expect(getByPath(es, "marAdministrationHistory.eventType.LATE_ADMINISTRATION")).not.toBe("Tardío");
    expect(getByPath(es, "marAdministrationVariance.badge.LATE")).not.toBe("Tardío");
  });
});

describe("MEDUI.ES.1H 1I / 1J / authored stay unlocalized", () => {
  it("1H overlay never claims 1I clinic/dental/billing keys", () => {
    for (const prefix of ["clinicCareD4c1", "dentalCareD5a2", "billingPage"]) {
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      for (const [path] of leaves) {
        expect(MEDUI_ES_1H_OVERLAY[path], path).toBeUndefined();
      }
    }
  });

  it("Medora-authored complaint-intel narrative remains placeholders", () => {
    const prefix = "providerDocumentationComplaintIntel";
      const leaves = collectLeaves(getByPath(es, prefix), prefix);
      expect(leaves.size, prefix).toBeGreaterThan(0);
      let n = 0;
      for (const [path, value] of leaves) {
        expect(MEDUI_ES_1H_OVERLAY[path], path).toBeUndefined();
        expect(isHiddenSpanishPlaceholder(value), path).toBe(true);
        n += 1;
        if (n >= 40) break;
      }
  });

  it("1H overlay never claims 1I or catalog-admin modules", () => {
    const forbiddenPrefixes = [
      "clinicCare",
      "dentalCare",
      "billing",
      "revenue",
      "claim",
      "printOutput",
      "admin",
      "catalogAudit",
      "catalogImport",
      "medicationMaster",
      "medicationGovernance",
      "medicationRxNorm",
      "medicationClinicalKnowledge",
      "medicationSafetyKnowledge",
      "medicationSafetyEvaluation",
      "medicationSafetyValidation",
      "medicationKnowledge",
      "medicationSourceBacked",
      "medicationEvidence",
      "medicationExpert",
      "medicationShadow",
      "medicationPhase",
      "highRiskMedicationReview",
      "erProcedureCatalog",
      "goLive",
      "mspp",
      "diseaseReports",
      "publicHealth",
      "nursingDischargeNotes",
      "procedureBillingReadiness",
      "procedureRevenueReview",
    ];
    for (const path of Object.keys(MEDUI_ES_1H_OVERLAY)) {
      for (const prefix of forbiddenPrefixes) {
        expect(path.startsWith(prefix), `${path} matched ${prefix}`).toBe(false);
      }
      if (path.startsWith("patientChartUi.")) {
        expect(PATIENT_CHART_ALLOW.has(path), path).toBe(true);
      }
    }
  });

  it("1H never overwrites keys already owned by 1E / 1F / 1G", () => {
    const earlier = new Set([
      ...Object.keys(MEDUI_ES_1E_OVERLAY),
      ...Object.keys(MEDUI_ES_1F_OVERLAY),
      ...Object.keys(MEDUI_ES_1G_OVERLAY),
    ]);
    for (const path of Object.keys(MEDUI_ES_1H_OVERLAY)) {
      expect(earlier.has(path), path).toBe(false);
    }
  });
});

describe("MEDUI.ES.1H six-direction isolation", () => {
  const scoped = [
    "createOrderModal.titleCreate",
    "marTab.empty",
    "pharmacyWorklistPage.title",
    "labRadTechnicianDashboard.labTitle",
    "unifiedTimeline.empty",
  ];

  it("EN/FR/ES 1H chrome do not leak across languages", () => {
    for (const key of scoped) {
      const enVal = i18nMessage("en", key);
      const frVal = i18nMessage("fr", key);
      const esVal = i18nMessage("es", key);
      expect(esVal).not.toBe(enVal);
      expect(esVal).not.toBe(frVal);
      if (enVal && frVal && enVal !== frVal) expect(enVal).not.toBe(frVal);
      expect(isHiddenSpanishPlaceholder(esVal)).toBe(false);
      expect(resolveClinicalUiMessage("en", key)).toBe(enVal);
      expect(resolveClinicalUiMessage("fr", key)).toBe(frVal);
      expect(resolveClinicalUiMessage("es", key)).toBe(esVal);
    }
  });

  it("1H ES prose never copies EN or FR source strings", () => {
    const enLeaves = collectLeaves(en);
    const frLeaves = collectLeaves(fr);
    // Codes, measurements, and proper-noun catalog labels ("COVID / Influenza /
    // RSV", "28 Fr", "Mallampati") legitimately match their source; only prose
    // is checked, and every prose exception must be enumerated.
    const enIdenticalProse: string[] = [];
    for (const [path, value] of Object.entries(MEDUI_ES_1H_OVERLAY)) {
      if (value === "") continue;
      const enVal = enLeaves.get(path);
      const frVal = frLeaves.get(path);
      if (enVal && isSentenceLike(enVal) && value === enVal) enIdenticalProse.push(path);
      if (frVal && isSentenceLike(frVal)) {
        expect(value, `${path} copies FR`).not.toBe(frVal);
      }
    }
    expect(enIdenticalProse.sort()).toEqual([...EN_IDENTICAL_PROSE_ALLOWED].sort());
  });

  it("missing ES keys never fall back to EN or FR", () => {
    const missing = "meduiEs1h.missing.orders.key";
    expect(resolveClinicalUiMessage("es", missing)).toBe(missing);
  });
});

describe("MEDUI.ES.1H public exposure", () => {
  it("Español is publicly selectable after MEDUI.ES.1K", () => {
    expect([...PUBLICLY_SELECTABLE_PRODUCT_UI_LANGUAGES]).toEqual(["fr", "en", "es"]);
    expect(productUiLanguageSelectOptions().map((o) => o.value)).toEqual(["fr", "en", "es"]);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(true);
  });

  it("patient preferredLanguage remains distinct from product UI locale; stored product es hydrates after 1K", () => {
    expect(resolveClientUiLanguage.toString()).not.toMatch(/preferredLanguage/);
    expect(resolveClientUiLanguage({ storedLanguage: "es" })).toBe("es");
  });
});

describe("MEDUI.ES.1H catalog safety classification", () => {
  it("overlay contains only LOCALIZED_UI_CONTENT or identical STABLE_CODE", () => {
    const enLeaves = collectLeaves(en);
    const safety: Record<string, number> = {};
    const unsafe: Array<{ path: string; class: string; en: string; es: string }> = [];
    for (const [path, esVal] of Object.entries(MEDUI_ES_1H_OVERLAY)) {
      const enVal = enLeaves.get(path) ?? "";
      const cls = classify1hCatalogSafety(path, enVal, esVal);
      safety[cls] = (safety[cls] || 0) + 1;
      if (cls !== "LOCALIZED_UI_CONTENT" && cls !== "STABLE_CODE") {
        unsafe.push({ path, class: cls, en: enVal, es: esVal });
      }
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ overlaySafetyClass: safety, unsafe }, null, 2));
    expect(unsafe).toEqual([]);
    expect(safety.CANONICAL_SOURCE_IDENTITY ?? 0).toBe(0);
    expect(safety.CLINICIAN_AUTHORED_SOURCE ?? 0).toBe(0);
    expect(safety.EXTERNAL_SOURCE_CONTENT ?? 0).toBe(0);
    expect(safety.UNKNOWN_UNLOCALIZED ?? 0).toBe(0);
  });

  it("1H overlay does not bypass REVIEW_REQUIRED canon Spanish", () => {
    const reviewRequiredSpanish = ES_MEDICAL_TERMINOLOGY.filter((e) => e.status === "REVIEW_REQUIRED").map(
      (e) => e.es,
    );
    const bypasses: Array<{ path: string; value: string }> = [];
    for (const [path, value] of Object.entries(MEDUI_ES_1H_OVERLAY)) {
      if (reviewRequiredSpanish.includes(value)) bypasses.push({ path, value });
    }
    expect(bypasses).toEqual([]);
    expect(reviewRequiredSpanish).toContain("Diagnóstico principal de egreso");
    expect(reviewRequiredSpanish).not.toContain("Tardío");
    expect(reviewRequiredSpanish).not.toContain("Administrado con retraso");
    expect(reviewRequiredSpanish).not.toContain("Con retraso");
  });

  it("invented Spanish lab/imaging catalog names are not overlaid", () => {
    const forbidden = [
      "createOrderModal.orderSetItems.bloodCulture",
      "createOrderModal.orderSetItems.chestXray",
      "createOrderModal.orderSetItems.ctAbdomenPelvis",
      "createOrderModal.orderSetItems.ctCervicalSpine",
      "createOrderModal.orderSetItems.ctHead",
      "createOrderModal.orderSetItems.lactate",
      "createOrderModal.orderSetItems.lipase",
      "createOrderModal.orderSetItems.troponin",
      "createOrderModal.orderSetItems.typeScreen",
      "createOrderModal.orderSetItems.urinalysis",
    ];
    for (const path of forbidden) {
      expect(MEDUI_ES_1H_OVERLAY[path], path).toBeUndefined();
      const live = getByPath(es, path);
      expect(typeof live, path).toBe("string");
      expect(isHiddenSpanishPlaceholder(live as string), path).toBe(false);
      expect(live, path).not.toMatch(/\bBlood culture\b|\bChest X-ray\b|\bTroponin\b|\bUrinalysis\b|\bType and screen\b/i);
    }
  });

  it("stable catalog abbreviations remain identical codes, not translated", () => {
    const kept = [
      "createOrderModal.orderSetItems.bmp",
      "createOrderModal.orderSetItems.bnp",
      "createOrderModal.orderSetItems.cbc",
      "createOrderModal.orderSetItems.cmp",
      "createOrderModal.orderSetItems.covid",
      "createOrderModal.orderSetItems.covidInfluenzaRsv",
      "createOrderModal.orderSetItems.influenzaAb",
      "createOrderModal.orderSetItems.rsv",
    ];
    for (const path of kept) {
      const enVal = getByPath(en, path);
      expect(MEDUI_ES_1H_OVERLAY[path], path).toBe(enVal);
    }
  });

  it("reports remaining in-scope placeholders after 1H (must not be ordinary UI chrome)", () => {
    const hidden = createHiddenSpanishCatalog(en);
    const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
    const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
    const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
    const { tree: after1h } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
    const remaining: string[] = [];
    for (const [path, value] of collectLeaves(after1h)) {
      if (!isInScope1hPath(path)) continue;
      if (isHiddenSpanishPlaceholder(value)) remaining.push(path);
    }
    const remainingPrefixes = remaining.reduce<Record<string, number>>((acc, path) => {
      const pref = path.split(".")[0] ?? path;
      acc[pref] = (acc[pref] || 0) + 1;
      return acc;
    }, {});
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ remainingInScopeAfter1h: remaining.length, remainingPrefixes, remaining }, null, 2));
    // Remaining in-scope leaves are catalog/source identity left unlocalized on purpose.
    expect(remaining.sort()).toEqual(
      [
        "createOrderModal.orderSetItems.bloodCulture",
        "createOrderModal.orderSetItems.chestXray",
        "createOrderModal.orderSetItems.ctAbdomenPelvis",
        "createOrderModal.orderSetItems.ctCervicalSpine",
        "createOrderModal.orderSetItems.ctHead",
        "createOrderModal.orderSetItems.lactate",
        "createOrderModal.orderSetItems.lipase",
        "createOrderModal.orderSetItems.troponin",
        "createOrderModal.orderSetItems.typeScreen",
        "createOrderModal.orderSetItems.urinalysis",
      ].sort(),
    );
  });
});

describe("MEDUI.ES.1H historical catalog leakage", () => {
  const lab: CatalogSearchItem = {
    id: "lab-cbc",
    code: "CBC",
    type: "LAB_TEST",
    displayNameEn: "Complete Blood Count",
    displayNameFr: "Numération formule sanguine",
    secondaryText: "CBC · Hématologie",
    secondaryTextFr: "CBC · Hématologie",
    secondaryTextEn: "CBC · Hematology",
  };
  const imaging: CatalogSearchItem = {
    id: "img-ct",
    code: "CT_HEAD",
    type: "IMAGING_STUDY",
    displayNameEn: "CT head",
    displayNameFr: "Scanner cérébral",
    secondaryText: "CT_HEAD · TDM",
    secondaryTextFr: "CT_HEAD · TDM",
    secondaryTextEn: "CT_HEAD · CT",
  };
  const med: CatalogSearchItem = {
    id: "med-met",
    code: "MET500",
    type: "MEDICATION",
    displayNameEn: "Metformin",
    displayNameFr: "Metformine",
    secondaryText: "500 mg · comprimé · orale",
    secondaryTextFr: "500 mg · comprimé · orale",
    secondaryTextEn: "500 mg · tablet · oral",
    metadata: { strength: "500 mg", dosageForm: "comprimé", route: "orale" },
  };

  it("A/B/C English catalog display never shows French secondary text", () => {
    expect(getCatalogSearchItemSecondaryLine(med, "en")).not.toMatch(/comprimé|orale|Metformine/i);
    expect(getCatalogSearchItemSecondaryLine(imaging, "en")).not.toMatch(/TDM|Scanner/i);
    expect(getCatalogSearchItemSecondaryLine(lab, "en")).not.toMatch(/Hématologie|Numération/i);
    expect(getCatalogSearchItemDisplayLabel(med, "en")).toBe("Metformin");
    expect(getCatalogSearchItemDisplayLabel(lab, "en")).toBe("Complete Blood Count");
    expect(getCatalogSearchItemDisplayLabel(imaging, "en")).toBe("CT head");
  });

  it("D/E/F Spanish catalog display never selects EN or FR localized labels", () => {
    expect(getCatalogSearchItemDisplayLabel(med, "es")).not.toBe("Metformin");
    expect(getCatalogSearchItemDisplayLabel(med, "es")).not.toBe("Metformine");
    expect(getCatalogSearchItemDisplayLabel(lab, "es")).not.toBe("Complete Blood Count");
    expect(getCatalogSearchItemDisplayLabel(lab, "es")).not.toBe("Numération formule sanguine");
    expect(getCatalogSearchItemDisplayLabel(imaging, "es")).not.toBe("CT head");
    expect(getCatalogSearchItemDisplayLabel(imaging, "es")).not.toBe("Scanner cérébral");
    expect(pickCatalogDisplayLabelForProductUi("es", {
      displayNameEn: "Metformin",
      displayNameFr: "Metformine",
      code: "MET500",
    })).toBe("MET500");
    expect(catalogSearchItemFullDisplayLine(med, "es")).not.toMatch(/\bMetformin\b|\bMetformine\b/);
  });

  it("G persist/reload does not switch catalog display language", () => {
    const reloadedLab = existingOrderDisplayLabel(
      {
        id: "lab-es",
        type: "LAB",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelEn: "Complete Blood Count",
            displayLabelFr: "Numération formule sanguine",
            catalogLabTest: {
              code: "CBC",
              displayNameEn: "Complete Blood Count",
              displayNameFr: "Numération formule sanguine",
            },
          },
        ],
      },
      "es",
    );
    const reloadedMed = existingOrderDisplayLabel(
      {
        id: "med-es",
        type: "MEDICATION",
        items: [
          {
            catalogItemType: "MEDICATION",
            displayLabelEn: "Metformin",
            displayLabelFr: "Metformine",
            catalogMedication: { code: "MET500", displayNameEn: "Metformin", displayNameFr: "Metformine" },
          },
        ],
      },
      "es",
    );
    const reloadedImg = existingOrderDisplayLabel(
      {
        id: "img-es",
        type: "IMAGING",
        items: [
          {
            catalogItemType: "IMAGING_STUDY",
            displayLabelEn: "CT head",
            displayLabelFr: "Scanner cérébral",
            catalogImagingStudy: { code: "CT_HEAD", displayNameEn: "CT head", displayNameFr: "Scanner cérébral" },
          },
        ],
      },
      "es",
    );
    expect(reloadedLab).toBe("Hemograma completo");
    expect(reloadedMed).toBe("Metformina");
    expect(reloadedImg).toBe("TC de cráneo");
  });

  it("H/I unsupported locale is not interpreted as EN or FR", () => {
    expect(pickCatalogDisplayLabelForProductUi("ht", {
      displayNameEn: "Metformin",
      displayNameFr: "Metformine",
      code: "MET500",
    })).toBe("MET500");
    expect(pickCatalogDisplayLabelForProductUi("de", {
      displayNameEn: "CT head",
      displayNameFr: "Scanner cérébral",
      code: "CT_HEAD",
    })).toBe("CT_HEAD");
  });

  it("J print/detail chrome does not fall back across Medora languages", () => {
    expect(printT("es", "printOutput.discharge.documentH1")).not.toBe(printT("en", "printOutput.discharge.documentH1"));
    expect(printT("es", "printOutput.discharge.documentH1")).not.toBe(printT("fr", "printOutput.discharge.documentH1"));
    expect(i18nMessage("es", "orderDetail.labTitle")).not.toBe(i18nMessage("en", "orderDetail.labTitle"));
    expect(i18nMessage("es", "orderDetail.labTitle")).not.toBe(i18nMessage("fr", "orderDetail.labTitle"));
    expect(i18nMessage("es", "clinicalResultViewer.imagingExam")).not.toBe(
      i18nMessage("fr", "clinicalResultViewer.imagingExam"),
    );
    expect(isHiddenSpanishPlaceholder(i18nMessage("es", "createOrderModal.orderSetItems.troponin"))).toBe(false);
    expect(i18nMessage("es", "createOrderModal.orderSetItems.troponin")).toBe("Troponina");
  });
});

describe("MEDUI.ES.1H overlay accounting", () => {
  it("computes exact placeholder and overlay counts", () => {
    const overlayEntries = Object.entries(MEDUI_ES_1H_OVERLAY);
    const overlayPaths = overlayEntries.map(([path]) => path);
    expect(new Set(overlayPaths).size, "duplicate overlay key paths").toBe(overlayPaths.length);

    const hidden = createHiddenSpanishCatalog(en);
    const { tree: afterCanon } = applyApprovedSpanishTerminology(hidden);
    const { tree: after1e } = applyGovernedSpanishOverlay(afterCanon, MEDUI_ES_1E_OVERLAY);
    const { tree: after1f } = applyGovernedSpanishOverlay(after1e, MEDUI_ES_1F_OVERLAY);
    const { tree: after1g } = applyGovernedSpanishOverlay(after1f, MEDUI_ES_1G_OVERLAY);
    const before1h = countPlaceholders(after1g);

    const reviewRequiredUiKeys = new Set<string>();
    for (const entry of ES_MEDICAL_TERMINOLOGY) {
      if (entry.status === "REVIEW_REQUIRED") {
        for (const k of entry.uiMessageKeys ?? []) reviewRequiredUiKeys.add(k);
      }
    }

    const byClass: Record<string, number> = {};
    const outOfScope: string[] = [];
    const reviewRequiredOverlays: string[] = [];
    const emptyOverlayEntries: string[] = [];
    const notReplacing: string[] = [];
    const enLeaves = collectLeaves(en);

    // applyGovernedSpanishOverlay mutates in place, so the pre-1H state of every
    // overlay path must be sampled before the overlay is applied.
    for (const [path, value] of overlayEntries) {
      const cls = classify1hPath(path);
      byClass[cls] = (byClass[cls] || 0) + 1;
      if (cls === "OUT_OF_SCOPE") outOfScope.push(path);
      if (reviewRequiredUiKeys.has(path)) reviewRequiredOverlays.push(path);
      if (value === "") emptyOverlayEntries.push(path);
      const prior = getByPath(after1g, path);
      if (typeof prior !== "string" || !isHiddenSpanishPlaceholder(prior)) notReplacing.push(path);
      const enVal = enLeaves.get(path);
      expect(enVal, `overlay path missing in EN: ${path}`).toBeDefined();
      if (value === "") expect(enVal).toBe("");
      else expect(interpolationTokens(value), `token parity: ${path}`).toEqual(interpolationTokens(enVal as string));
    }

    const { tree: after1hTree, replaced } = applyGovernedSpanishOverlay(after1g, MEDUI_ES_1H_OVERLAY);
    const after = countPlaceholders(after1hTree);

    expect(outOfScope).toEqual([]);
    expect(reviewRequiredOverlays).toEqual([]);
    expect(notReplacing).toEqual([]);
    expect([...emptyOverlayEntries].sort()).toEqual([...MEDUI_ES_1H_EMPTY_OVERLAY_PATHS].sort());

    const report = {
      totalEsStringLeaves: before1h.totalLeaves,
      placeholdersBefore1h: before1h.placeholders,
      placeholdersAfter1h: after.placeholders,
      placeholdersReplacedBy1h: replaced,
      overlayEntriesTotal: overlayEntries.length,
      uniqueOverlayPaths: overlayPaths.length,
      nonEmptyOverlayEntries: overlayEntries.length - emptyOverlayEntries.length,
      emptyOverlayEntries,
      overlaysActuallyReplacingPlaceholders: replaced,
      overlaysNotReplacingPlaceholders: notReplacing,
      byClass,
      outOfScope,
      reviewRequiredOverlays,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));

    expect(before1h.totalLeaves).toBe(44266);
    expect(replaced).toBe(overlayEntries.length);
    expect(after.placeholders).toBe(before1h.placeholders - replaced);
    expect(byClass.OUT_OF_SCOPE ?? 0).toBe(0);
  });

  it("overlay keys are sorted and every classified bucket is populated", () => {
    const keys = Object.keys(MEDUI_ES_1H_OVERLAY);
    expect(keys).toEqual([...keys].sort());
    const buckets = new Set(keys.map(classify1hPath));
    for (const cls of [
      "ORDERS",
      "MAR",
      "PHARMACY",
      "MEDICATION_CATALOG",
      "LABS",
      "IMAGING",
      "CLINICAL_CATALOG_SHARED",
      "GENERIC_DEPENDENCY_REQUIRED_BY_1H",
    ]) {
      expect(buckets.has(cls), cls).toBe(true);
    }
    expect(buckets.has("OUT_OF_SCOPE")).toBe(false);
  });

  it("live es tree exposes every 1H overlay value", () => {
    for (const [path, value] of Object.entries(MEDUI_ES_1H_OVERLAY)) {
      expect(getByPath(es, path), path).toBe(value);
    }
  });
});

describe("MEDUI.ES.1H no ungoverned Spanish component literals", () => {
  it("1H production TSX files do not hardcode Spanish clinical chrome", () => {
    const files = [
      "src/components/orders/CreateOrderModal.tsx",
      "src/components/orders/CancelOrderModal.tsx",
      "src/components/mar/MarAdministrationRowCorrectionControls.tsx",
      "src/components/medication/MarPharmacyVerificationPanel.tsx",
      "src/components/pharmacy/PharmacyAlertsCard.tsx",
      "src/components/pharmacy/PharmacyInventoryToolbar.tsx",
    ];
    const forbidden =
      /\b(Administrado|Retenido|Pendiente de administrar|Órdenes|Imagenología|Lista de farmacia)\b/g;
    let hits = 0;
    for (const rel of files) {
      try {
        const src = readFileSync(join(webRoot, rel), "utf8");
        hits += src.match(forbidden)?.length ?? 0;
      } catch {
        // file may live under a slightly different path; skip missing
      }
    }
    expect(hits).toBe(0);
    expect(productUiLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(true);
  });
});
