import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import {
  assertMedicationAdministrationInfusionClinicalCorrectionAllowed,
  isMarUniversalClinicalTimeCorrectionEligible,
  medicationAdministrationRowIsInfusionStart,
  medicationAdministrationRowIsInfusionStop,
  parseMedicationAdministrationCorrectionReasonFields,
  resolveMedicationMarActionFromStorage,
  type MedicationAdministrationCorrectionReasonCode,
} from "@medora/shared";

export type MarClinicalCorrectionActionType =
  | "TIME"
  | "DOSE"
  | "ROUTE"
  | "CHARTED_NOT_GIVEN"
  | "DUPLICATE";

export type MarClinicalCorrectionBlockedActionType =
  | "WRONG_PATIENT"
  | "CHANGE_MEDICATION"
  | "CHANGE_PERFORMER";

export type MarClinicalCorrectionMenuItem =
  | {
      kind: "action";
      type: MarClinicalCorrectionActionType;
      labelKey: string;
      enabled: boolean;
      blockedReasonKey?: string;
    }
  | {
      kind: "blocked";
      type: MarClinicalCorrectionBlockedActionType;
      labelKey: string;
      blockedReasonKey: string;
    };

export type MarClinicalCorrectionChainStep = {
  id: string;
  stepKind: "ADMINISTRATION" | "CORRECTION";
  eventAt: string;
  performedByDisplay: string | null;
  reasonCode: string | null;
  reasonDetail: string | null;
  correctionTypeLabelKey: string | null;
  beforeSummary: string | null;
  afterSummary: string | null;
  reviewRecommended: boolean;
  reviewReviewedBy: string | null;
  reviewReviewedAt: string | null;
};

export type MarAdministrationCorrectedBadge = {
  show: boolean;
  readOnly: boolean;
  correctedByDisplay: string | null;
  correctedAtIso: string | null;
  latestReasonCode: string | null;
  latestReasonLabelKey: string | null;
  correctionCount: number;
};

const REVIEW_RECOMMENDED_REASON_CODES = new Set<string>([
  "DOCUMENTED_NOT_GIVEN",
  "DUPLICATE_ENTRY",
]);

export function isMarClinicalCorrectionReviewRecommended(
  reasonCode: string | null | undefined
): boolean {
  const code = reasonCode?.trim().toUpperCase() || "";
  return REVIEW_RECOMMENDED_REASON_CODES.has(code);
}

export function resolveMarClinicalCorrectionTypeLabelKey(
  reasonCode: string | null | undefined
): string | null {
  const code = reasonCode?.trim().toUpperCase() || "";
  if (!code) return null;
  if (code === "DOCUMENTED_WRONG_TIME") return "marClinicalCorrection.type.TIME";
  if (code === "DOCUMENTED_WRONG_DOSE") return "marClinicalCorrection.type.DOSE";
  if (code === "DOCUMENTED_WRONG_ROUTE") return "marClinicalCorrection.type.ROUTE";
  if (code === "DOCUMENTED_NOT_GIVEN") return "marClinicalCorrection.type.CHARTED_NOT_GIVEN";
  if (code === "DUPLICATE_ENTRY") return "marClinicalCorrection.type.DUPLICATE";
  return "marClinicalCorrection.type.OTHER";
}

export function marClinicalCorrectionDefaultReasonCode(
  type: MarClinicalCorrectionActionType
): MedicationAdministrationCorrectionReasonCode {
  switch (type) {
    case "TIME":
      return "DOCUMENTED_WRONG_TIME";
    case "DOSE":
      return "DOCUMENTED_WRONG_DOSE";
    case "ROUTE":
      return "DOCUMENTED_WRONG_ROUTE";
    case "CHARTED_NOT_GIVEN":
      return "DOCUMENTED_NOT_GIVEN";
    case "DUPLICATE":
      return "DUPLICATE_ENTRY";
  }
}

export function marClinicalCorrectionReasonRequiresDetail(
  type: MarClinicalCorrectionActionType
): boolean {
  return type === "DUPLICATE" || type === "CHARTED_NOT_GIVEN";
}

function infusionRow(infusionPhase?: string | null, notes?: string | null): boolean {
  return (
    medicationAdministrationRowIsInfusionStart(notes, infusionPhase) ||
    medicationAdministrationRowIsInfusionStop(notes, infusionPhase)
  );
}

export function buildMarClinicalCorrectionMenu(input: {
  encounterOpen: boolean;
  canAdjust: boolean;
  marActionResolved: string;
  infusionPhase?: string | null;
  notes?: string | null;
  readOnly?: boolean;
}): { visible: boolean; items: MarClinicalCorrectionMenuItem[] } {
  const items: MarClinicalCorrectionMenuItem[] = [];
  const isInfusion = infusionRow(input.infusionPhase, input.notes);
  const administered = input.marActionResolved === "administered";
  const timeCorrectionEligible = isMarUniversalClinicalTimeCorrectionEligible({
    marActionResolved: input.marActionResolved,
    notes: input.notes,
    infusionPhase: input.infusionPhase,
  });
  const baseEnabled = input.encounterOpen && input.canAdjust && !input.readOnly;

  const gate = (reasonCode: MedicationAdministrationCorrectionReasonCode) =>
    assertMedicationAdministrationInfusionClinicalCorrectionAllowed({
      correctionReasonCode: reasonCode,
      infusionPhase: input.infusionPhase,
      notes: input.notes,
    });

  items.push({
    kind: "action",
    type: "TIME",
    labelKey: "marClinicalCorrection.action.TIME",
    enabled: baseEnabled && timeCorrectionEligible,
    blockedReasonKey: !timeCorrectionEligible
      ? "marClinicalCorrection.blocked.notAdministered"
      : undefined,
  });

  const doseGate = gate("DOCUMENTED_WRONG_DOSE");
  items.push({
    kind: "action",
    type: "DOSE",
    labelKey: "marClinicalCorrection.action.DOSE",
    enabled: baseEnabled && administered && doseGate.ok,
    blockedReasonKey: !administered
      ? "marClinicalCorrection.blocked.notAdministered"
      : !doseGate.ok
        ? "marClinicalCorrection.blocked.infusionDose"
        : undefined,
  });

  const routeGate = gate("DOCUMENTED_WRONG_ROUTE");
  items.push({
    kind: "action",
    type: "ROUTE",
    labelKey: "marClinicalCorrection.action.ROUTE",
    enabled: baseEnabled && administered && routeGate.ok,
    blockedReasonKey: !administered
      ? "marClinicalCorrection.blocked.notAdministered"
      : !routeGate.ok
        ? "marClinicalCorrection.blocked.infusionRoute"
        : undefined,
  });

  const notGivenGate = gate("DOCUMENTED_NOT_GIVEN");
  items.push({
    kind: "action",
    type: "CHARTED_NOT_GIVEN",
    labelKey: "marClinicalCorrection.action.CHARTED_NOT_GIVEN",
    enabled: baseEnabled && administered && notGivenGate.ok,
    blockedReasonKey: !administered
      ? "marClinicalCorrection.blocked.notAdministered"
      : !notGivenGate.ok
        ? "marClinicalCorrection.blocked.infusionNotGiven"
        : undefined,
  });

  items.push({
    kind: "action",
    type: "DUPLICATE",
    labelKey: "marClinicalCorrection.action.DUPLICATE",
    enabled: baseEnabled && administered,
    blockedReasonKey: !administered ? "marClinicalCorrection.blocked.notAdministered" : undefined,
  });

  items.push({
    kind: "blocked",
    type: "WRONG_PATIENT",
    labelKey: "marClinicalCorrection.action.WRONG_PATIENT",
    blockedReasonKey: "marClinicalCorrection.blocked.wrongPatient",
  });
  items.push({
    kind: "blocked",
    type: "CHANGE_MEDICATION",
    labelKey: "marClinicalCorrection.action.CHANGE_MEDICATION",
    blockedReasonKey: "marClinicalCorrection.blocked.changeMedication",
  });
  items.push({
    kind: "blocked",
    type: "CHANGE_PERFORMER",
    labelKey: "marClinicalCorrection.action.CHANGE_PERFORMER",
    blockedReasonKey: "marClinicalCorrection.blocked.changePerformer",
  });

  const visible =
    baseEnabled &&
    (timeCorrectionEligible || administered || isInfusion) &&
    items.some((item) => item.kind === "action" && item.enabled);

  return { visible, items };
}

function splitCorrectionSummary(summary: string | null | undefined): {
  beforeSummary: string | null;
  afterSummary: string | null;
} {
  const text = summary?.trim() || "";
  if (!text || text === "duplicate_documentation_flagged") {
    return { beforeSummary: null, afterSummary: text || null };
  }
  const parts = text.split("→").map((p) => p.trim());
  if (parts.length === 2) {
    return { beforeSummary: parts[0] || null, afterSummary: parts[1] || null };
  }
  return { beforeSummary: null, afterSummary: text };
}

export function buildMarClinicalCorrectionChain(input: {
  administrationId: string;
  historyEntries: MedicationAdministrationHistoryEntry[];
}): MarClinicalCorrectionChainStep[] {
  const adminId = input.administrationId.trim();
  const adminEntry = input.historyEntries.find(
    (e) => e.source === "MAR" && e.id === adminId
  );
  const corrections = input.historyEntries
    .filter(
      (e) =>
        e.eventType === "ADMINISTRATION_CORRECTION" &&
        e.originalAdministrationId?.trim() === adminId
    )
    .sort((a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime());

  const steps: MarClinicalCorrectionChainStep[] = [];

  if (adminEntry) {
    steps.push({
      id: adminEntry.id,
      stepKind: "ADMINISTRATION",
      eventAt: adminEntry.eventAt,
      performedByDisplay: adminEntry.performedByDisplay,
      reasonCode: adminEntry.reasonCode,
      reasonDetail: adminEntry.reasonDetail,
      correctionTypeLabelKey: null,
      beforeSummary: adminEntry.doseDisplay,
      afterSummary: null,
      reviewRecommended: false,
      reviewReviewedBy: null,
      reviewReviewedAt: null,
    });
  }

  for (const correction of corrections) {
    const reason = parseMedicationAdministrationCorrectionReasonFields(
      correction.reasonDetail
        ? `${correction.reasonCode ?? ""} — ${correction.reasonDetail}`
        : correction.reasonCode
    );
    const effectiveSummary = correction.effectiveChangeSummary?.trim() || null;
    const split = splitCorrectionSummary(effectiveSummary);
    steps.push({
      id: correction.id,
      stepKind: "CORRECTION",
      eventAt: correction.eventAt,
      performedByDisplay: correction.performedByDisplay,
      reasonCode: reason.reasonCode,
      reasonDetail: reason.reasonDetail,
      correctionTypeLabelKey: resolveMarClinicalCorrectionTypeLabelKey(reason.reasonCode),
      beforeSummary: split.beforeSummary,
      afterSummary:
        effectiveSummary === "duplicate_documentation_flagged"
          ? "duplicate_documentation_flagged"
          : split.afterSummary,
      reviewRecommended: isMarClinicalCorrectionReviewRecommended(reason.reasonCode),
      reviewReviewedBy: null,
      reviewReviewedAt: null,
    });
  }

  return steps;
}

export function resolveMarAdministrationCorrectedBadge(input: {
  administrationId: string;
  historyEntries: MedicationAdministrationHistoryEntry[];
  readOnly?: boolean;
}): MarAdministrationCorrectedBadge | null {
  const adminId = input.administrationId.trim();
  const corrections = input.historyEntries
    .filter(
      (e) =>
        e.eventType === "ADMINISTRATION_CORRECTION" &&
        e.originalAdministrationId?.trim() === adminId
    )
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

  if (corrections.length === 0) return null;

  const latest = corrections[0]!;
  const reason = parseMedicationAdministrationCorrectionReasonFields(
    latest.reasonCode && latest.reasonDetail
      ? `${latest.reasonCode} — ${latest.reasonDetail}`
      : latest.reasonCode
  );

  return {
    show: true,
    readOnly: input.readOnly === true,
    correctedByDisplay: latest.performedByDisplay,
    correctedAtIso: latest.eventAt,
    latestReasonCode: reason.reasonCode,
    latestReasonLabelKey: reason.reasonCode
      ? `marAdministrationCorrection.reason.${reason.reasonCode}`
      : null,
    correctionCount: corrections.length,
  };
}

export function formatMarClinicalCorrectionDoseDisplay(
  doseValue?: string | number | null,
  doseUnit?: string | null
): string | null {
  const value =
    doseValue == null
      ? null
      : typeof doseValue === "number"
        ? String(doseValue)
        : doseValue.trim();
  const unit = doseUnit?.trim() || null;
  if (value && unit) return `${value} ${unit}`;
  return value || unit || null;
}

export function buildMarClinicalCorrectionBeforeAfterPreview(input: {
  type: MarClinicalCorrectionActionType;
  current: {
    doseValue?: string | number | null;
    doseUnit?: string | null;
    route?: string | null;
    marAction?: string | null;
    notes?: string | null;
  };
  correctedDoseValue?: string;
  correctedDoseUnit?: string;
  correctedRoute?: string;
}): { before: string; after: string } {
  const marAction = resolveMedicationMarActionFromStorage({
    marAction: input.current.marAction ?? null,
    notes: input.current.notes,
  });

  if (input.type === "DOSE") {
    const before = formatMarClinicalCorrectionDoseDisplay(
      input.current.doseValue,
      input.current.doseUnit
    );
    const after = formatMarClinicalCorrectionDoseDisplay(
      input.correctedDoseValue,
      input.correctedDoseUnit ?? input.current.doseUnit
    );
    return {
      before: before ?? "—",
      after: after ?? "—",
    };
  }

  if (input.type === "ROUTE") {
    return {
      before: input.current.route?.trim() || "—",
      after: input.correctedRoute?.trim() || "—",
    };
  }

  if (input.type === "CHARTED_NOT_GIVEN") {
    return {
      before: "administered",
      after: "refused",
    };
  }

  if (input.type === "DUPLICATE") {
    return {
      before: formatMarClinicalCorrectionDoseDisplay(
        input.current.doseValue,
        input.current.doseUnit
      ) ?? marAction,
      after: "duplicate_documentation_flagged",
    };
  }

  return { before: "—", after: "—" };
}
