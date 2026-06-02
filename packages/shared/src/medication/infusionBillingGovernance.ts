/**
 * M1.4D — Infusion billing governance (classification, duration, CPT companion readiness).
 * Uses existing MAR / catalog fields only. No payer-final claim logic.
 */

import { suggestInfusionBilling, type InfusionBillingClassSuggestion } from "../infusionBillingRules.js";
import {
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
} from "../mar/medicationAdministrationInfusionMar.js";
import { isMedicationAdministrationBillableMarAction } from "./medicationAdministrationMarBilling.js";
import { isMedicationInfusionCandidate, isRouteClearlyIvPushOrBolus } from "./infusionRoute.util.js";
import { parseMedicationCatalogBillingClass } from "./medicationCatalogClassification.js";

export const INFUSION_BILLING_EVENT_CATEGORIES = [
  "NON_INFUSION_ADMINISTRATION",
  "IV_PUSH",
  "IV_INFUSION_START",
  "IV_INFUSION_STOP",
  "IV_INFUSION_CONTINUOUS",
  "HYDRATION_START",
  "HYDRATION_STOP",
  "MEDICATION_INFUSION_UNKNOWN",
  "MANUAL_REVIEW_REQUIRED",
] as const;

export type InfusionBillingEventCategory = (typeof INFUSION_BILLING_EVENT_CATEGORIES)[number];

export const INFUSION_MANUAL_REVIEW_REASONS = [
  "MISSING_INFUSION_STOP",
  "MISSING_INFUSION_START",
  "AMBIGUOUS_INFUSION_PAIR",
  "NEGATIVE_INFUSION_DURATION",
  "INFUSION_TYPE_UNKNOWN",
  "ADMINISTRATION_CODE_UNCERTAIN",
  "HYDRATION_VS_MEDICATION_UNCLEAR",
  "CONTINUOUS_INFUSION_INSUFFICIENT_TIMING",
  "PAYER_VERIFICATION_REQUIRED",
] as const;

export type InfusionManualReviewReason = (typeof INFUSION_MANUAL_REVIEW_REASONS)[number];

export type InfusionAdministrationCodeType = "CPT";

export type InfusionCompanionCodeSource =
  | "ROUTE_INFERENCE"
  | "INFUSION_DURATION"
  | "HYDRATION_CLASS"
  | "THERAPEUTIC_CLASS"
  | "MANUAL_REVIEW";

export type SuggestedAdministrationCode = {
  suggestedAdministrationCode: string;
  suggestedAdministrationCodeType: InfusionAdministrationCodeType;
  companionCodeSource: InfusionCompanionCodeSource;
  manualReviewRequired: boolean;
  rationale: string;
};

export type InfusionBillingClassificationInput = {
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
  route?: string | null;
  catalogAdministrationType?: string | null;
  catalogMedicationBillingClass?: string | null;
  medicationLabel?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
};

export type InfusionMarRowForDuration = {
  id: string;
  encounterId: string;
  orderItemId?: string | null;
  catalogMedicationId?: string | null;
  infusionSessionKey?: string | null;
  infusionPhase?: string | null;
  notes?: string | null;
  administeredAtIso: string;
  effectiveAdministeredAtIso?: string | null;
};

export type InfusionDurationResult = {
  startTimeIso: string | null;
  stopTimeIso: string | null;
  durationMinutes: number | null;
  durationHoursInitial: number | null;
  durationHoursAdditional: number | null;
  manualReviewReasons: InfusionManualReviewReason[];
  pairStartRowId: string | null;
  pairStopRowId: string | null;
};

export type InfusionBillingGovernanceSnapshot = {
  infusionBillingCategory: InfusionBillingEventCategory;
  infusionStartTime: string | null;
  infusionStopTime: string | null;
  infusionDurationMinutes: number | null;
  suggestedAdministrationCodes: SuggestedAdministrationCode[];
  infusionManualReviewReasons: InfusionManualReviewReason[];
  infusionBillingReady: boolean;
};

function resolveClinicalTimeIso(row: Pick<InfusionMarRowForDuration, "administeredAtIso" | "effectiveAdministeredAtIso">): string | null {
  const eff = row.effectiveAdministeredAtIso?.trim();
  if (eff && !Number.isNaN(Date.parse(eff))) return eff;
  const doc = row.administeredAtIso?.trim();
  if (doc && !Number.isNaN(Date.parse(doc))) return doc;
  return null;
}

function isHydrationContext(input: InfusionBillingClassificationInput): boolean {
  const parsed = parseMedicationCatalogBillingClass(input.catalogMedicationBillingClass ?? undefined);
  if (parsed === "HYDRATION") return true;
  const suggestion = suggestInfusionBilling({
    infusionDurationMinutes: 60,
    medicationLabel: input.medicationLabel ?? undefined,
    route: input.route ?? undefined,
    catalogMedicationBillingClass: input.catalogMedicationBillingClass ?? undefined,
    catalogCode: input.catalogCode ?? undefined,
  });
  return suggestion.billingClass === "HYDRATION";
}

/** Classify a MAR row into a billing-relevant infusion category (no workflow changes). */
export function classifyInfusionBillingEvent(
  input: InfusionBillingClassificationInput
): InfusionBillingEventCategory {
  if (!isMedicationAdministrationBillableMarAction(input.marAction ?? null, input.notes ?? null)) {
    return "MANUAL_REVIEW_REQUIRED";
  }

  const isStart = medicationAdministrationRowIsInfusionStart(input.notes, input.infusionPhase);
  const isStop = medicationAdministrationRowIsInfusionStop(input.notes, input.infusionPhase);
  const hydration = isHydrationContext(input);

  if (isStart) return hydration ? "HYDRATION_START" : "IV_INFUSION_START";
  if (isStop) return hydration ? "HYDRATION_STOP" : "IV_INFUSION_STOP";

  if (isRouteClearlyIvPushOrBolus(input.route)) return "IV_PUSH";

  const infusionCandidate = isMedicationInfusionCandidate({
    route: input.route,
    medicationLabel: input.medicationLabel,
    code: input.catalogCode,
    genericName: input.genericName,
    catalogAdministrationType: input.catalogAdministrationType,
  });

  if (!infusionCandidate) return "NON_INFUSION_ADMINISTRATION";

  if (hydration) return "MEDICATION_INFUSION_UNKNOWN";
  if (input.catalogMedicationBillingClass?.trim().toUpperCase() === "UNKNOWN") {
    return "MEDICATION_INFUSION_UNKNOWN";
  }

  return "IV_INFUSION_CONTINUOUS";
}

function sessionMatchKey(row: InfusionMarRowForDuration): string {
  return [
    row.encounterId,
    row.orderItemId?.trim() ?? "",
    row.infusionSessionKey?.trim() ?? "",
    row.catalogMedicationId?.trim() ?? "",
  ].join("|");
}

function rowIsStart(row: InfusionMarRowForDuration): boolean {
  return medicationAdministrationRowIsInfusionStart(row.notes, row.infusionPhase);
}

function rowIsStop(row: InfusionMarRowForDuration): boolean {
  return medicationAdministrationRowIsInfusionStop(row.notes, row.infusionPhase);
}

/** Pair START/STOP MAR rows and compute duration (documented times only). */
export function computeInfusionDurationFromMarRows(
  rows: InfusionMarRowForDuration[],
  targetRowId: string
): InfusionDurationResult {
  const empty: InfusionDurationResult = {
    startTimeIso: null,
    stopTimeIso: null,
    durationMinutes: null,
    durationHoursInitial: null,
    durationHoursAdditional: null,
    manualReviewReasons: [],
    pairStartRowId: null,
    pairStopRowId: null,
  };

  const target = rows.find((r) => r.id === targetRowId);
  if (!target) return { ...empty, manualReviewReasons: ["MISSING_INFUSION_START"] };

  const key = sessionMatchKey(target);
  const sessionRows = rows.filter((r) => sessionMatchKey(r) === key);

  if (rowIsStart(target)) {
    const stopCandidates = sessionRows.filter((r) => rowIsStop(r) && r.id !== target.id);
    if (stopCandidates.length === 0) {
      return {
        ...empty,
        startTimeIso: resolveClinicalTimeIso(target),
        pairStartRowId: target.id,
        manualReviewReasons: ["MISSING_INFUSION_STOP"],
      };
    }
    if (stopCandidates.length > 1) {
      return {
        ...empty,
        startTimeIso: resolveClinicalTimeIso(target),
        pairStartRowId: target.id,
        manualReviewReasons: ["AMBIGUOUS_INFUSION_PAIR"],
      };
    }
    return computeInfusionDurationFromMarRows(rows, stopCandidates[0]!.id);
  }

  if (!rowIsStop(target)) {
    return { ...empty, manualReviewReasons: ["CONTINUOUS_INFUSION_INSUFFICIENT_TIMING"] };
  }

  const stopTimeIso = resolveClinicalTimeIso(target);
  const startRows = sessionRows
    .filter((r) => rowIsStart(r) && r.id !== target.id)
    .sort((a, b) => Date.parse(resolveClinicalTimeIso(a) ?? "") - Date.parse(resolveClinicalTimeIso(b) ?? ""));

  if (startRows.length === 0) {
    return {
      ...empty,
      stopTimeIso,
      pairStopRowId: target.id,
      manualReviewReasons: ["MISSING_INFUSION_START"],
    };
  }

  const stopMs = stopTimeIso ? Date.parse(stopTimeIso) : NaN;
  const eligibleStarts = startRows.filter((s) => {
    const startIso = resolveClinicalTimeIso(s);
    if (!startIso || !Number.isFinite(stopMs)) return false;
    return Date.parse(startIso) <= stopMs;
  });

  if (eligibleStarts.length === 0) {
    const afterStop = startRows.filter((s) => {
      const startIso = resolveClinicalTimeIso(s);
      return startIso && Number.isFinite(stopMs) && Date.parse(startIso) > stopMs;
    });
    if (afterStop.length > 0) {
      const startRow = afterStop[afterStop.length - 1]!;
      const startTimeIso = resolveClinicalTimeIso(startRow);
      const durationMinutes =
        startTimeIso && stopTimeIso
          ? Math.floor((Date.parse(stopTimeIso) - Date.parse(startTimeIso)) / 60_000)
          : null;
      return {
        startTimeIso: startTimeIso ?? null,
        stopTimeIso,
        durationMinutes,
        durationHoursInitial: null,
        durationHoursAdditional: null,
        manualReviewReasons: ["NEGATIVE_INFUSION_DURATION"],
        pairStartRowId: startRow.id,
        pairStopRowId: target.id,
      };
    }
    return {
      ...empty,
      stopTimeIso,
      pairStopRowId: target.id,
      manualReviewReasons: ["MISSING_INFUSION_START"],
    };
  }

  if (eligibleStarts.length > 1) {
    return {
      ...empty,
      stopTimeIso,
      pairStopRowId: target.id,
      manualReviewReasons: ["AMBIGUOUS_INFUSION_PAIR"],
    };
  }

  const startRow = eligibleStarts[0]!;
  const startTimeIso = resolveClinicalTimeIso(startRow);
  if (!startTimeIso || !stopTimeIso) {
    return {
      ...empty,
      startTimeIso,
      stopTimeIso,
      pairStartRowId: startRow.id,
      pairStopRowId: target.id,
      manualReviewReasons: ["CONTINUOUS_INFUSION_INSUFFICIENT_TIMING"],
    };
  }

  const durationMinutes = Math.floor((Date.parse(stopTimeIso) - Date.parse(startTimeIso)) / 60_000);
  if (durationMinutes < 0) {
    return {
      startTimeIso,
      stopTimeIso,
      durationMinutes,
      durationHoursInitial: null,
      durationHoursAdditional: null,
      manualReviewReasons: ["NEGATIVE_INFUSION_DURATION"],
      pairStartRowId: startRow.id,
      pairStopRowId: target.id,
    };
  }

  const durationHoursInitial = durationMinutes >= 31 ? 1 : 0;
  const durationHoursAdditional = durationMinutes >= 91 ? Math.floor((durationMinutes - 91) / 60) + 1 : 0;

  return {
    startTimeIso,
    stopTimeIso,
    durationMinutes,
    durationHoursInitial,
    durationHoursAdditional,
    manualReviewReasons: [],
    pairStartRowId: startRow.id,
    pairStopRowId: target.id,
  };
}

function pushUniqueReason(list: InfusionManualReviewReason[], reason: InfusionManualReviewReason): void {
  if (!list.includes(reason)) list.push(reason);
}

/** Suggest administration CPT companion codes (readiness only — not payer-final). */
export function suggestInfusionAdministrationCptCompanions(input: {
  category: InfusionBillingEventCategory;
  route?: string | null;
  billingClass?: InfusionBillingClassSuggestion;
  durationMinutes?: number | null;
  durationHoursInitial?: number | null;
  durationHoursAdditional?: number | null;
}): SuggestedAdministrationCode[] {
  const out: SuggestedAdministrationCode[] = [];
  const payerNote = "Suggestion only; payer and facility rules must be verified.";

  if (input.category === "IV_PUSH" || isRouteClearlyIvPushOrBolus(input.route)) {
    const route = input.route?.toLowerCase() ?? "";
    if (route.includes("im") || route.includes("sq") || route.includes("sc")) {
      out.push({
        suggestedAdministrationCode: "96372",
        suggestedAdministrationCodeType: "CPT",
        companionCodeSource: "ROUTE_INFERENCE",
        manualReviewRequired: true,
        rationale: `Therapeutic SC/IM injection administration readiness. ${payerNote}`,
      });
    } else {
      out.push({
        suggestedAdministrationCode: "96374",
        suggestedAdministrationCodeType: "CPT",
        companionCodeSource: "ROUTE_INFERENCE",
        manualReviewRequired: true,
        rationale: `IV push / bolus administration readiness. ${payerNote}`,
      });
    }
    return out;
  }

  if (input.category === "NON_INFUSION_ADMINISTRATION") {
    const route = input.route?.toLowerCase() ?? "";
    if (route.includes("im") || route.includes("sq") || route.includes("sc")) {
      out.push({
        suggestedAdministrationCode: "96372",
        suggestedAdministrationCodeType: "CPT",
        companionCodeSource: "ROUTE_INFERENCE",
        manualReviewRequired: true,
        rationale: `Non-infusion injectable — IM/SQ administration readiness. ${payerNote}`,
      });
    }
    return out;
  }

  const hydration =
    input.billingClass === "HYDRATION" ||
    input.category === "HYDRATION_START" ||
    input.category === "HYDRATION_STOP";

  const dm = input.durationMinutes;
  const hasDuration = dm != null && Number.isFinite(dm) && dm > 0;

  if (hydration) {
    out.push({
      suggestedAdministrationCode: "96360",
      suggestedAdministrationCodeType: "CPT",
      companionCodeSource: "HYDRATION_CLASS",
      manualReviewRequired: true,
      rationale: `Hydration infusion initial hour readiness. ${payerNote}`,
    });
    if ((input.durationHoursAdditional ?? 0) > 0 || (hasDuration && dm >= 91)) {
      out.push({
        suggestedAdministrationCode: "96361",
        suggestedAdministrationCodeType: "CPT",
        companionCodeSource: "INFUSION_DURATION",
        manualReviewRequired: true,
        rationale: `Hydration infusion additional hour readiness. ${payerNote}`,
      });
    }
    return out;
  }

  if (
    input.category === "IV_INFUSION_START" ||
    input.category === "IV_INFUSION_STOP" ||
    input.category === "IV_INFUSION_CONTINUOUS"
  ) {
    out.push({
      suggestedAdministrationCode: "96365",
      suggestedAdministrationCodeType: "CPT",
      companionCodeSource: "THERAPEUTIC_CLASS",
      manualReviewRequired: true,
      rationale: `Therapeutic IV infusion initial hour readiness. ${payerNote}`,
    });
    if ((input.durationHoursAdditional ?? 0) > 0 || (hasDuration && dm >= 91)) {
      out.push({
        suggestedAdministrationCode: "96366",
        suggestedAdministrationCodeType: "CPT",
        companionCodeSource: "INFUSION_DURATION",
        manualReviewRequired: true,
        rationale: `Therapeutic IV infusion additional hour readiness. ${payerNote}`,
      });
    }
    return out;
  }

  if (
    input.category === "MEDICATION_INFUSION_UNKNOWN" ||
    input.category === "MANUAL_REVIEW_REQUIRED"
  ) {
    out.push({
      suggestedAdministrationCode: "96365",
      suggestedAdministrationCodeType: "CPT",
      companionCodeSource: "MANUAL_REVIEW",
      manualReviewRequired: true,
      rationale: `Infusion type uncertain — default therapeutic infusion readiness with manual review. ${payerNote}`,
    });
  }

  return out;
}

/** Build infusion billing governance snapshot for capture enrichment. */
export function buildInfusionBillingGovernanceSnapshot(input: {
  classification: InfusionBillingClassificationInput;
  duration?: InfusionDurationResult | null;
  existingDurationMinutes?: number | null;
}): InfusionBillingGovernanceSnapshot {
  const category = classifyInfusionBillingEvent(input.classification);
  const manualReviewReasons: InfusionManualReviewReason[] = [...(input.duration?.manualReviewReasons ?? [])];

  const durationMinutes =
    input.duration?.durationMinutes ??
    (input.existingDurationMinutes != null && Number.isFinite(input.existingDurationMinutes)
      ? Math.floor(input.existingDurationMinutes)
      : null);

  if (category === "MEDICATION_INFUSION_UNKNOWN") {
    pushUniqueReason(manualReviewReasons, "INFUSION_TYPE_UNKNOWN");
  }
  if (category === "MANUAL_REVIEW_REQUIRED") {
    pushUniqueReason(manualReviewReasons, "ADMINISTRATION_CODE_UNCERTAIN");
  }
  if (
    (category === "HYDRATION_START" || category === "HYDRATION_STOP" || category === "IV_INFUSION_STOP") &&
    durationMinutes == null
  ) {
    pushUniqueReason(manualReviewReasons, "MISSING_INFUSION_START");
  }
  if (category === "IV_INFUSION_CONTINUOUS" && durationMinutes == null) {
    pushUniqueReason(manualReviewReasons, "CONTINUOUS_INFUSION_INSUFFICIENT_TIMING");
  }

  const billingClass = suggestInfusionBilling({
    infusionDurationMinutes: durationMinutes ?? 0,
    medicationLabel: input.classification.medicationLabel ?? undefined,
    route: input.classification.route ?? undefined,
    catalogMedicationBillingClass: input.classification.catalogMedicationBillingClass ?? undefined,
    catalogCode: input.classification.catalogCode ?? undefined,
  }).billingClass;

  if (billingClass === "UNKNOWN" && category !== "NON_INFUSION_ADMINISTRATION" && category !== "IV_PUSH") {
    pushUniqueReason(manualReviewReasons, "HYDRATION_VS_MEDICATION_UNCLEAR");
  }

  pushUniqueReason(manualReviewReasons, "PAYER_VERIFICATION_REQUIRED");

  const suggestedAdministrationCodes = suggestInfusionAdministrationCptCompanions({
    category,
    route: input.classification.route,
    billingClass,
    durationMinutes,
    durationHoursInitial: input.duration?.durationHoursInitial ?? null,
    durationHoursAdditional: input.duration?.durationHoursAdditional ?? null,
  });

  if (suggestedAdministrationCodes.length === 0 && category !== "NON_INFUSION_ADMINISTRATION") {
    pushUniqueReason(manualReviewReasons, "ADMINISTRATION_CODE_UNCERTAIN");
  }

  const infusionBillingReady =
    manualReviewReasons.filter((r) => r !== "PAYER_VERIFICATION_REQUIRED").length === 0 &&
    category !== "MANUAL_REVIEW_REQUIRED" &&
    category !== "MEDICATION_INFUSION_UNKNOWN";

  return {
    infusionBillingCategory: category,
    infusionStartTime: input.duration?.startTimeIso ?? null,
    infusionStopTime: input.duration?.stopTimeIso ?? null,
    infusionDurationMinutes: durationMinutes,
    suggestedAdministrationCodes,
    infusionManualReviewReasons: manualReviewReasons,
    infusionBillingReady,
  };
}
