/**
 * MEDUI.D4C.5B.2 — Haiti ambulatory clinical workspace completion helpers.
 *
 * Jurisdiction = Facility.country (never UI locale alone).
 * Presentation / filtering only — no parallel clinical engines.
 */

import { isHaitiPublicHealthJurisdiction } from "./facilityClinicCareProfileD4c1.js";
import {
  CLINIC_CARE_AMBULATORY_CLINICAL_DATA_BLOCKED_TYPE_IDS,
  isAmbulatoryClinicalDataDocumentAllowed,
} from "./clinicCareAmbulatoryEncounterWorkspaceD4c5b.js";

export const CLINIC_CARE_HAITI_AMBULATORY_WORKSPACE_CERTIFICATION_ID =
  "MEDUI.D4C.5B.2" as const;

/** Display-layer order status labels (i18n key suffixes under clinicCareD4c5b2.orderStatus.*). */
export const CLINIC_CARE_AMBULATORY_ORDER_STATUS_DISPLAY_KEYS = {
  PLACED: "placed",
  ACTIVE: "active",
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  RESULT_PENDING: "resultPending",
  SIGNED: "signed",
  ACKNOWLEDGED: "acknowledged",
  IN_PROGRESS: "inProgress",
  RESULTED: "resulted",
  VERIFIED: "verified",
} as const;

/** Display-layer order board column labels. */
export const CLINIC_CARE_AMBULATORY_ORDER_BOARD_LABEL_KEYS = {
  status: "clinicCareD4c5b2.orderBoard.status",
  provider: "clinicCareD4c5b2.orderBoard.provider",
  orderedBy: "clinicCareD4c5b2.orderBoard.orderedBy",
  priority: "clinicCareD4c5b2.orderBoard.priority",
} as const;

/**
 * True when Haiti ambulatory UI restrictions apply.
 * Requires Facility.country Haiti + ambulatory care setting — never language alone.
 */
export function isHaitiAmbulatoryWorkspaceContext(input: {
  facilityCountry?: string | null;
  ambulatoryCareSetting: boolean;
}): boolean {
  return (
    input.ambulatoryCareSetting === true &&
    isHaitiPublicHealthJurisdiction(input.facilityCountry ?? null)
  );
}

/** Hide inpatient MAR Shift Timeline chrome for Haiti ambulatory day visits. */
export function shouldHideMarShiftTimelineForHaitiAmbulatory(input: {
  facilityCountry?: string | null;
  ambulatoryCareSetting: boolean;
}): boolean {
  return isHaitiAmbulatoryWorkspaceContext(input);
}

/**
 * Provider documentation template ids blocked as Haiti AMBULATORY defaults
 * (trauma / ED / stroke pathway). Does not delete templates globally.
 */
export const HAITI_AMBULATORY_BLOCKED_PROVIDER_TEMPLATE_ID_FRAGMENTS = [
  "trauma",
  "mvc",
  "assault",
  "gunshot",
  "stab",
  "stroke",
  "thrombolysis",
  "tpa",
  "code_stroke",
  "major_trauma",
  "polytrauma",
  "cspine",
  "penetrating",
] as const;

export function isHaitiAmbulatoryProviderTemplateAllowed(templateId: string | null | undefined): boolean {
  const id = String(templateId ?? "")
    .trim()
    .toLowerCase();
  if (!id) return true;
  return !HAITI_AMBULATORY_BLOCKED_PROVIDER_TEMPLATE_ID_FRAGMENTS.some((frag) => id.includes(frag));
}

export function filterHaitiAmbulatoryProviderTemplates<T extends { id: string }>(
  templates: readonly T[]
): T[] {
  return templates.filter((t) => isHaitiAmbulatoryProviderTemplateAllowed(t.id));
}

/**
 * Hide routine unsigned Haiti ambulatory Med Eval chrome:
 * Workup Evaluation (admit/observe/discharge MDM), duplicate Clinical Impression,
 * Provider Addendum (addendum remains via signed-document lifecycle).
 */
export function shouldHideHaitiAmbulatoryRoutineMedEvalFields(input: {
  facilityCountry?: string | null;
  encounterMode: "ED" | "OBSERVATION" | "AMBULATORY" | string;
}): boolean {
  return (
    String(input.encounterMode).toUpperCase() === "AMBULATORY" &&
    isHaitiPublicHealthJurisdiction(input.facilityCountry ?? null)
  );
}

/** Clinical Data hub care setting for ambulatory Clinic (not ED). */
export const CLINIC_CARE_AMBULATORY_CLINICAL_DATA_HUB_CARE_SETTING = "CLINIC" as const;

/**
 * Registry-level ambulatory clinical data allow check (extends D4C.5B blocklist).
 * Used by Clinical Data hub + Summary — not CSS.
 */
export function isHaitiAmbulatoryClinicalDataCardAllowed(input: {
  typeId?: string | null;
  id?: string | null;
  careSettings?: readonly string[] | null;
  category?: string | null;
  title?: string | null;
}): boolean {
  const typeId = String(input.typeId ?? input.id ?? "")
    .trim()
    .toUpperCase();
  if (
    (CLINIC_CARE_AMBULATORY_CLINICAL_DATA_BLOCKED_TYPE_IDS as readonly string[]).includes(typeId)
  ) {
    return false;
  }
  const title = String(input.title ?? "")
    .trim()
    .toUpperCase();
  if (
    title.includes("THROMBOLYSIS") ||
    title.includes("CIWA") ||
    title.includes("COWS") ||
    title.includes("TRAUMA") ||
    title.includes("STROKE") ||
    title.includes("RTS")
  ) {
    return false;
  }
  return isAmbulatoryClinicalDataDocumentAllowed({
    typeId: input.typeId ?? input.id,
    careSettings: input.careSettings,
    category: input.category,
  });
}

export function filterHaitiAmbulatoryClinicalDataCards<
  T extends {
    typeId?: string | null;
    id?: string | null;
    careSettings?: readonly string[] | null;
    category?: string | null;
    title?: string | null;
  },
>(docs: readonly T[]): T[] {
  return docs.filter((d) =>
    isHaitiAmbulatoryClinicalDataCardAllowed({
      typeId: d.typeId,
      id: d.id,
      careSettings: d.careSettings,
      category: d.category,
      title: d.title,
    })
  );
}

/** Map raw order status enum → i18n key under clinicCareD4c5b2.orderStatus.* */
export function ambulatoryOrderStatusDisplayKey(status: string | null | undefined): string {
  const s = String(status ?? "")
    .trim()
    .toUpperCase();
  const map: Record<string, string> = {
    PLACED: "clinicCareD4c5b2.orderStatus.placed",
    ACTIVE: "clinicCareD4c5b2.orderStatus.active",
    PENDING: "clinicCareD4c5b2.orderStatus.pending",
    COMPLETED: "clinicCareD4c5b2.orderStatus.completed",
    CANCELLED: "clinicCareD4c5b2.orderStatus.cancelled",
    CANCELED: "clinicCareD4c5b2.orderStatus.cancelled",
    RESULT_PENDING: "clinicCareD4c5b2.orderStatus.resultPending",
    RESULTPENDING: "clinicCareD4c5b2.orderStatus.resultPending",
    SIGNED: "clinicCareD4c5b2.orderStatus.signed",
    ACKNOWLEDGED: "clinicCareD4c5b2.orderStatus.acknowledged",
    IN_PROGRESS: "clinicCareD4c5b2.orderStatus.inProgress",
    INPROGRESS: "clinicCareD4c5b2.orderStatus.inProgress",
    RESULTED: "clinicCareD4c5b2.orderStatus.resulted",
    VERIFIED: "clinicCareD4c5b2.orderStatus.verified",
  };
  return map[s] ?? "clinicCareD4c5b2.orderStatus.placed";
}

/** Map raw priority enum → i18n key. */
export function ambulatoryOrderPriorityDisplayKey(priority: string | null | undefined): string {
  const p = String(priority ?? "")
    .trim()
    .toUpperCase();
  if (p === "STAT" || p === "URGENT" || p === "ASAP") return "clinicCareD4c5b2.orderPriority.urgent";
  if (p === "ROUTINE" || p === "NORMAL") return "clinicCareD4c5b2.orderPriority.routine";
  return "clinicCareD4c5b2.orderPriority.routine";
}

export function emptyClinicalValueLabelKey(): string {
  return "clinicCareD4c5b2.empty.notDocumented";
}
