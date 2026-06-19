import {
  CLINICAL_VIEWPORT_DESKTOP_MIN,
  CLINICAL_VIEWPORT_TABLET_MIN,
  resolveClinicalViewportMode,
  type ClinicalViewportMode,
} from "@/lib/clinicalViewport";
import type { SupportedLanguage } from "@/i18n/config";
import type {
  MedicationAdministrationHistoryEntry,
  MedicationAdministrationHistoryEventType,
} from "@medora/shared";
import {
  resolveMedicationInfusionStopReasonI18nKey,
  resolveMedicationAdministrationCorrectionReasonI18nKey,
  resolveMarRescheduleReasonLabelKey,
  resolveMarMedicationTimingOverrideReasonLabelKey,
  resolveMarMedicationResponseLabelKey,
  formatMarPrnReasonForLocale,
} from "@medora/shared";
import {
  isMarClinicalCorrectionReviewRecommended,
  resolveMarClinicalCorrectionTypeLabelKey,
} from "@/features/mar/marClinicalCorrectionWorkflow";
import type { PriorityBadgeSoft } from "@/components/medora-card/medoraCardTokens";
import {
  NEUTRAL_BADGE,
  PATHWAY_BADGE,
  PRIORITY_BADGE_SOFT,
  SYNC_PENDING_BADGE,
} from "@/components/medora-card/medoraCardTokens";

export type MarAdministrationHistoryRailLayoutMode = "sideRail" | "stacked";

export type MedicationAdministrationHistoryRailEntry = {
  id: string;
  medicationLine: string;
  statusLabelKey: string;
  eventType: MedicationAdministrationHistoryEventType;
  clinicalTimeLabel: string;
  documentedTimeLabel: string | null;
  performerLine: string | null;
  reasonLine: string | null;
  prnIndicationLine: string | null;
  showAdjustedTime: boolean;
  badgeSoft: PriorityBadgeSoft;
  ariaStatusLabel: string;
  correctionTypeLabelKey: string | null;
  reviewRecommended: boolean;
  beforeSummary: string | null;
  afterSummary: string | null;
  scheduleSeverityLabelKey: string | null;
  scheduleChangedWhenLabel: string | null;
  varianceMinutesLabel: string | null;
  varianceScheduledTimeLabel: string | null;
  varianceActualTimeLabel: string | null;
  varianceSeverityLabelKey: string | null;
  medicationResponseLabel?: string | null;
  medicationResponseTimeLabel?: string | null;
  medicationResponseDocumentedLabel?: string | null;
  medicationResponsePainLabel?: string | null;
  medicationResponseCommentLine?: string | null;
  medicationResponseAdverseEscalationLine?: string | null;
  allergyReviewRecommendationLine?: string | null;
  allergyReviewMedicationLine?: string | null;
  allergyReviewReactionLine?: string | null;
  allergyReviewReporterLine?: string | null;
};

const HISTORY_BADGE_SOFT: Record<MedicationAdministrationHistoryEventType, PriorityBadgeSoft> = {
  ADMINISTERED: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
  PRN_ADMINISTERED: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  REFUSED: { bg: "#f3f4f6", text: "#4b5563", border: "#d1d5db" },
  HELD: { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  MISSED: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  NOT_AVAILABLE: NEUTRAL_BADGE,
  MD_CHANGED: PATHWAY_BADGE,
  INFUSION_START: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  INFUSION_STOP: { bg: "#f8fafc", text: "#475569", border: "#cbd5e1" },
  ORDER_CANCELED: { bg: "#f3f4f6", text: "#6b7280", border: "#9ca3af" },
  ADMINISTRATION_CORRECTION: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  SCHEDULE_TIME_CHANGED: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  EARLY_ADMINISTRATION: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  LATE_ADMINISTRATION: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  MEDICATION_RESPONSE_DOCUMENTED: { bg: "#ecfdf5", text: "#047857", border: "#a7f3d0" },
  ALLERGY_REVIEW_RECOMMENDED: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
};

export function resolveMarAdministrationHistoryRailLayoutMode(
  viewportWidth: number
): MarAdministrationHistoryRailLayoutMode {
  return viewportWidth >= CLINICAL_VIEWPORT_DESKTOP_MIN ? "sideRail" : "stacked";
}

export function resolveMarAdministrationHistoryRailDefaultExpanded(
  viewportMode: ClinicalViewportMode
): boolean {
  return viewportMode === "desktop";
}

export function resolveClinicalViewportModeFromWidth(viewportWidth: number): ClinicalViewportMode {
  return resolveClinicalViewportMode(viewportWidth);
}

export function marAdministrationHistoryRailStorageKey(
  facilityId: string,
  encounterId: string,
  userId: string
): string {
  return `medora.marHistoryRail.expanded.${facilityId}.${encounterId}.${userId}`;
}

export function readStoredMarAdministrationHistoryRailExpanded(
  facilityId: string,
  encounterId: string,
  userId: string
): boolean | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(
      marAdministrationHistoryRailStorageKey(facilityId, encounterId, userId)
    );
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function writeStoredMarAdministrationHistoryRailExpanded(
  facilityId: string,
  encounterId: string,
  userId: string,
  expanded: boolean
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      marAdministrationHistoryRailStorageKey(facilityId, encounterId, userId),
      expanded ? "1" : "0"
    );
  } catch {
    /* ignore */
  }
}

function formatMedicationLine(entry: MedicationAdministrationHistoryEntry): string {
  const label = entry.medicationLabel.trim() || "Medication";
  const dose = entry.doseDisplay?.trim();
  const route = entry.route?.trim();
  const parts = [label];
  if (dose) parts.push(dose);
  if (route) parts.push(route);
  if (entry.isPrn && entry.eventType === "PRN_ADMINISTERED") {
    return `${parts.join(" ")} PRN`;
  }
  return parts.join(" ");
}

function formatPerformerLine(entry: MedicationAdministrationHistoryEntry): string | null {
  const name = entry.performedByDisplay?.trim();
  const role = entry.performedByRole?.trim();
  if (!name && !role) return null;
  if (name && role) return `${name} ${role}`;
  return name ?? role ?? null;
}

function formatReasonLine(
  entry: MedicationAdministrationHistoryEntry,
  t: (key: string) => string,
  language: SupportedLanguage
): string | null {
  const code = entry.reasonCode?.trim();
  const detail = entry.reasonDetail?.trim();
  if (!code && !detail) return null;
  const prefix = t("marAdministrationHistory.reasonPrefix");
  const locale = language === "en" ? "en" : "fr";
  if (entry.eventType === "PRN_ADMINISTERED") {
    const label = formatMarPrnReasonForLocale({ code, label: detail }, locale);
    return label ? `${prefix}${label}` : null;
  }
  if (entry.eventType === "INFUSION_STOP" && code) {
    const labelKey = resolveMedicationInfusionStopReasonI18nKey(code);
    const label = labelKey ? t(labelKey) : code;
    return detail ? `${prefix}${label} — ${detail}` : `${prefix}${label}`;
  }
  if (entry.eventType === "ADMINISTRATION_CORRECTION" && code) {
    const labelKey = resolveMedicationAdministrationCorrectionReasonI18nKey(code);
    const label = labelKey ? t(labelKey) : code;
    const summary = entry.effectiveChangeSummary?.trim();
    if (summary === "duplicate_documentation_flagged") {
      return `${prefix}${label} — ${t("marAdministrationCorrection.duplicateFlagged")}`;
    }
    if (summary) {
      return `${prefix}${label} — ${t("marAdministrationCorrection.correctedPrefix")}${summary}`;
    }
    return detail ? `${prefix}${label} — ${detail}` : `${prefix}${label}`;
  }
  if (entry.eventType === "SCHEDULE_TIME_CHANGED" && code) {
    const labelKey = resolveMarRescheduleReasonLabelKey(code);
    const label = labelKey ? t(labelKey) : code;
    return detail ? `${prefix}${label} — ${detail}` : `${prefix}${label}`;
  }
  if (entry.eventType === "MEDICATION_RESPONSE_DOCUMENTED") {
    const responseCode = entry.medicationResponseCode ?? code;
    const labelKey = resolveMarMedicationResponseLabelKey(responseCode);
    const label = labelKey ? t(labelKey) : responseCode;
    return `${t("marMedicationResponse.history.response")}: ${label}`;
  }
  if (entry.eventType === "ALLERGY_REVIEW_RECOMMENDED") {
    const messageKey = entry.allergyReviewRecommendationMessageKey?.trim();
    const label = messageKey ? t(messageKey) : t("marAllergyReview.history.title");
    return `${t("marAllergyReview.panel.recommendationLabel")}: ${label}`;
  }
  if (
    (entry.eventType === "EARLY_ADMINISTRATION" || entry.eventType === "LATE_ADMINISTRATION") &&
    code
  ) {
    const labelKey = resolveMarMedicationTimingOverrideReasonLabelKey(code);
    const label = labelKey ? t(labelKey) : code;
    return detail ? `${prefix}${label} — ${detail}` : `${prefix}${label}`;
  }
  if (code && detail) return `${prefix}${code} — ${detail}`;
  return `${prefix}${detail ?? code}`;
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

export function buildMedicationAdministrationHistoryRailEntry(
  entry: MedicationAdministrationHistoryEntry,
  input: {
    formatClinicalTime: (iso: string) => string;
    t: (key: string) => string;
    language?: SupportedLanguage;
  }
): MedicationAdministrationHistoryRailEntry {
  const statusLabelKey = `marAdministrationHistory.eventType.${entry.eventType}`;
  const badgeSoft = HISTORY_BADGE_SOFT[entry.eventType] ?? NEUTRAL_BADGE;
  const showAdjustedTime =
    entry.documentedAt != null &&
    entry.documentedAt.trim() !== "" &&
    entry.documentedAt !== entry.eventAt;
  const correctionSplit =
    entry.eventType === "ADMINISTRATION_CORRECTION"
      ? splitCorrectionSummary(entry.effectiveChangeSummary)
      : { beforeSummary: null, afterSummary: null };
  const scheduleSplit =
    entry.eventType === "SCHEDULE_TIME_CHANGED"
      ? {
          beforeSummary: entry.previousScheduledAt
            ? input.formatClinicalTime(entry.previousScheduledAt)
            : entry.originalScheduledAt
              ? input.formatClinicalTime(entry.originalScheduledAt)
              : null,
          afterSummary: entry.newScheduledAt
            ? input.formatClinicalTime(entry.newScheduledAt)
            : null,
        }
      : { beforeSummary: null, afterSummary: null };
  const resolvedSplit =
    entry.eventType === "SCHEDULE_TIME_CHANGED" ? scheduleSplit : correctionSplit;
  const isVarianceEvent =
    entry.eventType === "EARLY_ADMINISTRATION" || entry.eventType === "LATE_ADMINISTRATION";
  const isMedicationResponseEvent = entry.eventType === "MEDICATION_RESPONSE_DOCUMENTED";
  const isAllergyReviewEvent = entry.eventType === "ALLERGY_REVIEW_RECOMMENDED";
  const responseCode = entry.medicationResponseCode ?? entry.reasonCode;
  const responseLabelKey = resolveMarMedicationResponseLabelKey(responseCode);
  const responsePainLabel =
    isMedicationResponseEvent &&
    entry.medicationResponsePainBefore != null &&
    entry.medicationResponsePainAfter != null
      ? `${input.t("marMedicationResponse.history.pain")}: ${entry.medicationResponsePainBefore}/10 → ${entry.medicationResponsePainAfter}/10`
      : null;

  return {
    id: entry.id,
    medicationLine: formatMedicationLine(entry),
    statusLabelKey,
    eventType: entry.eventType,
    clinicalTimeLabel: input.formatClinicalTime(entry.eventAt),
    documentedTimeLabel: showAdjustedTime
      ? input.formatClinicalTime(entry.documentedAt!)
      : null,
    performerLine: formatPerformerLine(entry),
    reasonLine: formatReasonLine(entry, input.t, input.language ?? "fr"),
    prnIndicationLine: entry.prnIndication?.trim()
      ? `${input.t("marAdministrationHistory.prnIndicationPrefix")}${entry.prnIndication.trim()}`
      : null,
    showAdjustedTime,
    badgeSoft,
    ariaStatusLabel: input.t(statusLabelKey),
    correctionTypeLabelKey:
      entry.eventType === "ADMINISTRATION_CORRECTION"
        ? resolveMarClinicalCorrectionTypeLabelKey(entry.reasonCode)
        : null,
    reviewRecommended:
      (entry.eventType === "ADMINISTRATION_CORRECTION" &&
        isMarClinicalCorrectionReviewRecommended(entry.reasonCode)) ||
      (entry.eventType === "SCHEDULE_TIME_CHANGED" && entry.reviewRecommended === true) ||
      (isVarianceEvent && entry.varianceReviewRecommended === true),
    beforeSummary: resolvedSplit.beforeSummary,
    afterSummary: resolvedSplit.afterSummary,
    scheduleSeverityLabelKey:
      entry.eventType === "SCHEDULE_TIME_CHANGED" && entry.riskSeverity?.trim()
        ? `marReschedule.severity.${entry.riskSeverity.trim().toUpperCase()}`
        : null,
    scheduleChangedWhenLabel:
      entry.eventType === "SCHEDULE_TIME_CHANGED" && entry.documentedAt?.trim()
        ? input.formatClinicalTime(entry.documentedAt)
        : null,
    varianceMinutesLabel:
      isVarianceEvent && entry.varianceMinutes != null
        ? `${entry.varianceMinutes > 0 ? "+" : ""}${entry.varianceMinutes} min`
        : null,
    varianceScheduledTimeLabel:
      isVarianceEvent && entry.effectiveScheduledAt?.trim()
        ? input.formatClinicalTime(entry.effectiveScheduledAt)
        : null,
    varianceActualTimeLabel: isVarianceEvent ? input.formatClinicalTime(entry.eventAt) : null,
    varianceSeverityLabelKey:
      isVarianceEvent && entry.varianceSeverity?.trim()
        ? `marAdministrationVariance.severity.${entry.varianceSeverity.trim().toUpperCase()}`
        : null,
    medicationResponseLabel:
      isMedicationResponseEvent && responseLabelKey ? input.t(responseLabelKey) : null,
    medicationResponseTimeLabel:
      isMedicationResponseEvent && (entry.medicationResponseTime ?? entry.eventAt)?.trim()
        ? `${input.t("marMedicationResponse.history.responseTime")}: ${input.formatClinicalTime(
            (entry.medicationResponseTime ?? entry.eventAt)!
          )}`
        : null,
    medicationResponseDocumentedLabel:
      isMedicationResponseEvent && entry.documentedAt?.trim()
        ? `${input.t("marMedicationResponse.history.documentedAt")}: ${input.formatClinicalTime(entry.documentedAt)}`
        : null,
    medicationResponsePainLabel: responsePainLabel,
    medicationResponseCommentLine:
      isMedicationResponseEvent &&
      (entry.medicationResponseDetail ?? entry.reasonDetail)?.trim()
        ? `${input.t("marMedicationResponse.history.comment")}: ${(entry.medicationResponseDetail ?? entry.reasonDetail)!.trim()}`
        : null,
    medicationResponseAdverseEscalationLine:
      isMedicationResponseEvent &&
      (entry.medicationResponseCode ?? entry.reasonCode) === "ADVERSE_REACTION_REPORTED"
        ? entry.allergyReviewRecommendationMessageKey
          ? `${input.t("marAllergyReview.panel.recommendationLabel")}: ${input.t(entry.allergyReviewRecommendationMessageKey)}`
          : input.t("marMedicationResponse.followUp.adverseEscalation")
        : null,
    allergyReviewRecommendationLine:
      isAllergyReviewEvent && entry.allergyReviewRecommendationMessageKey?.trim()
        ? `${input.t("marAllergyReview.panel.recommendationLabel")}: ${input.t(entry.allergyReviewRecommendationMessageKey)}`
        : null,
    allergyReviewMedicationLine:
      isAllergyReviewEvent && entry.allergyReviewMedicationName?.trim()
        ? `${input.t("marAllergyReview.panel.medication")}: ${entry.allergyReviewMedicationName}`
        : null,
    allergyReviewReactionLine:
      isAllergyReviewEvent && entry.allergyReviewReactionText?.trim()
        ? `${input.t("marAllergyReview.panel.reaction")}: ${entry.allergyReviewReactionText}`
        : null,
    allergyReviewReporterLine:
      isAllergyReviewEvent && entry.allergyReviewDocumentedBy?.trim()
        ? `${input.t("marAllergyReview.panel.reporter")}: ${entry.allergyReviewDocumentedBy}`
        : null,
  };
}

export function buildMedicationAdministrationHistoryRailEntries(
  entries: MedicationAdministrationHistoryEntry[],
  input: {
    formatClinicalTime: (iso: string) => string;
    t: (key: string) => string;
    language?: SupportedLanguage;
  }
): MedicationAdministrationHistoryRailEntry[] {
  return entries.map((entry) => buildMedicationAdministrationHistoryRailEntry(entry, input));
}

export function marAdministrationHistoryRailSideWidthPercent(): number {
  return 30;
}

export function marAdministrationHistoryRailTimelineWidthPercent(): number {
  return 70;
}

export function isClinicalViewportTabletOrBelow(viewportWidth: number): boolean {
  return viewportWidth < CLINICAL_VIEWPORT_DESKTOP_MIN;
}

export function isClinicalViewportMobile(viewportWidth: number): boolean {
  return viewportWidth < CLINICAL_VIEWPORT_TABLET_MIN;
}

/** History rail badge palette is informational only — never reuse operational MAR timeline colors. */
export function marAdministrationHistoryRailBadgeForEventType(
  eventType: MedicationAdministrationHistoryEventType
): PriorityBadgeSoft {
  return HISTORY_BADGE_SOFT[eventType] ?? PRIORITY_BADGE_SOFT.ROUTINE;
}
