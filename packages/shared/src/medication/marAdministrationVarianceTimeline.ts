/** MEDUI.ED.MAR.H9B/H9D — MAR timeline administration variance visibility projection. */

import {
  assessMarAdministrationVariance,
  resolveEffectiveVarianceScheduledTime,
  resolveMarAdministrationVarianceBadgeLabel,
  type MarAdministrationVarianceClassification,
  type MarAdministrationVarianceSeverity,
} from "../mar/marAdministrationVarianceGovernance.js";
import { reconstructMarAdministrationVarianceFromNotes } from "../mar/marVarianceReconstructionGovernance.js";

export type MarAdministrationVarianceTimelineProjection = {
  hasVariance: boolean;
  classification: MarAdministrationVarianceClassification | null;
  badgeLabel: "ON_TIME" | "EARLY" | "LATE" | null;
  /** Effective scheduled time used for variance (current dose schedule). */
  scheduledAt: string | null;
  /** Actual administration instant (effective administered time when present). */
  administeredAt: string | null;
  /** @deprecated use scheduledAt */
  effectiveScheduledAt: string | null;
  /** @deprecated use administeredAt */
  actualAdministrationAt: string | null;
  varianceMinutes: number | null;
  severity: MarAdministrationVarianceSeverity | null;
  reviewRecommended: boolean;
  reasonCode: string | null;
  reasonDetail: string | null;
  performedByDisplay: string | null;
  performedAt: string | null;
};

function emptyProjection(): MarAdministrationVarianceTimelineProjection {
  return {
    hasVariance: false,
    classification: null,
    badgeLabel: null,
    scheduledAt: null,
    administeredAt: null,
    effectiveScheduledAt: null,
    actualAdministrationAt: null,
    varianceMinutes: null,
    severity: null,
    reviewRecommended: false,
    reasonCode: null,
    reasonDetail: null,
    performedByDisplay: null,
    performedAt: null,
  };
}

export function buildMarAdministrationVarianceTimelineProjection(input: {
  scheduledAt: string;
  administeredAt?: string | null;
  orderedDoseSnapshotJson?: unknown;
  administrationNotes?: string | null;
  performedByDisplay?: string | null;
  performedAt?: string | null;
}): MarAdministrationVarianceTimelineProjection {
  const administeredAt = input.administeredAt?.trim();
  if (!administeredAt) return emptyProjection();

  const effectiveScheduledAt = resolveEffectiveVarianceScheduledTime({
    scheduledAt: input.scheduledAt,
    orderedDoseSnapshotJson: input.orderedDoseSnapshotJson,
  });
  const assessment = assessMarAdministrationVariance({
    actualAdministrationTime: administeredAt,
    effectiveScheduledTime: effectiveScheduledAt,
  });
  const reconstruction = reconstructMarAdministrationVarianceFromNotes(input.administrationNotes);
  const performedAt = input.performedAt?.trim() || administeredAt;

  return {
    hasVariance: true,
    classification: assessment.classification,
    badgeLabel: resolveMarAdministrationVarianceBadgeLabel(assessment.classification),
    scheduledAt: assessment.effectiveScheduledAt,
    administeredAt: assessment.actualAdministrationAt,
    effectiveScheduledAt: assessment.effectiveScheduledAt,
    actualAdministrationAt: assessment.actualAdministrationAt,
    varianceMinutes: assessment.varianceMinutes,
    severity: assessment.severity,
    reviewRecommended: assessment.reviewRecommended,
    reasonCode: reconstruction?.reasonCode ?? null,
    reasonDetail: reconstruction?.reasonDetail ?? null,
    performedByDisplay: input.performedByDisplay?.trim() || null,
    performedAt,
  };
}
