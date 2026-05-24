/**
 * Phase 19R — Documentation readiness score (advisory only).
 *
 * Non-blocking completeness summary. Not used for billing, CPT, or coding.
 */
import { buildDocumentationCorpus } from "./providerDocumentationDynamicIntelligence";
import type { ActiveDynamicClinicalCluster } from "./providerDocumentationDynamicClinicalClusters";
import type { DocumentationGuardrail } from "./providerDocumentationQualityGuardrails";
import type {
  ProviderDocumentationTemplateId,
  ProviderDocumentationWorkspaceState,
} from "./providerDocumentationModel";
import { countNonEmptyText } from "./providerDocumentationSectionSummary";

export type DocumentationReadinessLevel = "low" | "moderate" | "strong";

export type DocumentationReadinessScore = {
  score: number;
  level: DocumentationReadinessLevel;
  strongSections: string[];
  needsAttentionSections: string[];
  warningCount: number;
  highSeverityWarningCount: number;
};

export type DocumentationReadinessScoreArgs = {
  templateId: ProviderDocumentationTemplateId | null;
  state: ProviderDocumentationWorkspaceState;
  guardrails: DocumentationGuardrail[];
  dynamicClusters: ActiveDynamicClinicalCluster[];
};

export const READINESS_SECTION_LABEL_KEYS = {
  chiefComplaintHpi: "providerDocumentationReadinessScore.sections.chiefComplaintHpi",
  ros: "providerDocumentationReadinessScore.sections.ros",
  physicalExam: "providerDocumentationReadinessScore.sections.physicalExam",
  mdm: "providerDocumentationReadinessScore.sections.mdm",
  reassessment: "providerDocumentationReadinessScore.sections.reassessment",
  dispositionPlan: "providerDocumentationReadinessScore.sections.dispositionPlan",
} as const;

export type ReadinessSectionId = keyof typeof READINESS_SECTION_LABEL_KEYS;

const SECTION_WEIGHTS: Record<ReadinessSectionId, number> = {
  chiefComplaintHpi: 20,
  ros: 10,
  physicalExam: 20,
  mdm: 25,
  reassessment: 15,
  dispositionPlan: 10,
};

export const DOCUMENTATION_READINESS_LEVEL_LABEL_KEYS: Record<DocumentationReadinessLevel, string> = {
  low: "providerDocumentationReadinessScore.levelLow",
  moderate: "providerDocumentationReadinessScore.levelModerate",
  strong: "providerDocumentationReadinessScore.levelStrong",
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resolveReadinessLevel(score: number): DocumentationReadinessLevel {
  if (score >= 75) return "strong";
  if (score >= 45) return "moderate";
  return "low";
}

function hasChiefComplaintHpi(state: ProviderDocumentationWorkspaceState): boolean {
  return countNonEmptyText(state.chiefComplaint, state.hpi, state.reasonForVisit) > 0;
}

function hasRos(state: ProviderDocumentationWorkspaceState): boolean {
  return (
    countNonEmptyText(
      state.rosFocusedImpression,
      state.rosImportantPositives,
      state.rosImportantNegatives,
      state.rosRedFlags
    ) > 0
  );
}

function hasPhysicalExam(state: ProviderDocumentationWorkspaceState): boolean {
  const { reassessment: _reassessment, ...examSections } = state.physicalExam;
  return countNonEmptyText(...Object.values(examSections)) > 0;
}

function hasMdm(state: ProviderDocumentationWorkspaceState): boolean {
  return (
    countNonEmptyText(
      state.mdmWorkingAssessment,
      state.mdmDifferentialSynthesis,
      state.mdmDataReviewed,
      state.mdmClinicalRationale,
      state.mdmPlanSummary,
      state.mdmImmediateActionsRationale,
      state.mdmConsultsDiscussed,
      state.mdmAdmitObserveDischarge,
      state.mdmRiskLevel
    ) > 0
  );
}

function hasReassessment(state: ProviderDocumentationWorkspaceState, corpus: string): boolean {
  if (state.physicalExam.reassessment.trim().length > 0) return true;
  const normalized = corpus.toLowerCase();
  return [
    "reassess",
    "réévalu",
    "on reassessment",
    "repeat exam",
    "serial reassessment",
    "repeat neurologic",
    "repeat abdominal",
    "repeat chest pain",
    "repeat lung exam",
  ].some((term) => normalized.includes(term));
}

function hasDispositionPlan(state: ProviderDocumentationWorkspaceState, corpus: string): boolean {
  if (
    countNonEmptyText(
      state.mdmAdmitObserveDischarge,
      state.followUpDisposition,
      state.treatmentPlan,
      state.clinicalImpression
    ) > 0
  ) {
    return true;
  }
  const normalized = corpus.toLowerCase();
  return [
    "admission considered",
    "observation considered",
    "discharge",
    "transfer considered",
    "disposition",
    "follow-up",
    "return precaution",
    "return for",
  ].some((term) => normalized.includes(term));
}

function sectionCompletion(state: ProviderDocumentationWorkspaceState, corpus: string): Record<ReadinessSectionId, boolean> {
  return {
    chiefComplaintHpi: hasChiefComplaintHpi(state),
    ros: hasRos(state),
    physicalExam: hasPhysicalExam(state),
    mdm: hasMdm(state),
    reassessment: hasReassessment(state, corpus),
    dispositionPlan: hasDispositionPlan(state, corpus),
  };
}

function guardrailPenalty(guardrails: DocumentationGuardrail[]): number {
  let penalty = 0;
  let infoPenalty = 0;

  for (const guardrail of guardrails) {
    if (guardrail.severity === "high") penalty += 10;
    else if (guardrail.severity === "warning") penalty += 5;
    else if (guardrail.severity === "info") infoPenalty += 2;
  }

  return penalty + Math.min(infoPenalty, 2);
}

export function computeDocumentationReadinessScore(
  args: DocumentationReadinessScoreArgs
): DocumentationReadinessScore {
  void args.dynamicClusters;
  void args.templateId;

  const corpus = buildDocumentationCorpus(args.state);
  const completion = sectionCompletion(args.state, corpus);

  let baseScore = 0;
  const strongSections: string[] = [];
  const needsAttentionSections: string[] = [];

  for (const sectionId of Object.keys(SECTION_WEIGHTS) as ReadinessSectionId[]) {
    const labelKey = READINESS_SECTION_LABEL_KEYS[sectionId];
    if (completion[sectionId]) {
      baseScore += SECTION_WEIGHTS[sectionId];
      strongSections.push(labelKey);
    } else {
      needsAttentionSections.push(labelKey);
    }
  }

  const highSeverityWarningCount = args.guardrails.filter((guardrail) => guardrail.severity === "high").length;
  const warningCount = args.guardrails.length;
  const score = clampScore(baseScore - guardrailPenalty(args.guardrails));
  const level = resolveReadinessLevel(score);

  return {
    score,
    level,
    strongSections,
    needsAttentionSections,
    warningCount,
    highSeverityWarningCount,
  };
}

export function documentationReadinessScoreBlocksSigning(_score: DocumentationReadinessScore): boolean {
  return false;
}
