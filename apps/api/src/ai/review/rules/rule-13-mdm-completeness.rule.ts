import type { EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const PROVIDER_DOCUMENTATION_NAMESPACE = "erprovidermsev1";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function providerDocumentation(snapshot: EncounterAiSnapshot): Record<string, unknown> | null {
  const entries = [
    ...(snapshot.clinicalDocumentation.structuredEntries ?? []),
    ...(snapshot.clinicalDocumentation.reassessments ?? []),
  ];
  const entry = entries.find(
    (candidate) => candidate.namespace.trim().toLowerCase() === PROVIDER_DOCUMENTATION_NAMESPACE
  );
  return asObject(entry?.payloadSummary);
}

/**
 * Phase 2I — MDM completeness review.
 *
 * Reviews only structured provider-documentation fields already present in the
 * chart. It does not decide that the clinician's assessment is correct, infer
 * a diagnosis, assign an E/M level, or create orders. Missing/partial MDM is
 * surfaced for clinician review in the medical-evaluation workspace.
 */
export function rule13MdmCompleteness(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  const providerDoc = providerDocumentation(snapshot);
  if (!providerDoc) return [];

  const domains = [
    {
      label: "working assessment",
      present:
        hasText(providerDoc.mdmWorkingAssessment) ||
        hasText(providerDoc.differentialAssessmentText) ||
        hasText(providerDoc.mdmDifferentialSynthesis),
    },
    { label: "data reviewed", present: hasText(providerDoc.mdmDataReviewed) },
    {
      label: "risk/management reasoning",
      present:
        hasText(providerDoc.mdmRiskLevel) ||
        hasText(providerDoc.mdmRiskStratification) ||
        hasText(providerDoc.mdmClinicalRationale),
    },
    {
      label: "plan/disposition reasoning",
      present:
        hasText(providerDoc.mdmPlanSummary) ||
        hasText(providerDoc.mdmAdmitObserveDischarge) ||
        hasText(providerDoc.treatmentPlan),
    },
  ];

  const presentCount = domains.filter((domain) => domain.present).length;
  const missing = domains.filter((domain) => !domain.present).map((domain) => domain.label);
  if (missing.length === 0) return [];

  const noMdmDocumented = presentCount === 0;
  return [
    buildAiSuggestion(ctx, {
      category: "MDM_GAP",
      priority: noMdmDocumented ? "MEDIUM" : missing.length >= 2 ? "MEDIUM" : "LOW",
      title: noMdmDocumented
        ? "Medical decision-making documentation is not present"
        : "Medical decision-making documentation may be incomplete",
      summary: noMdmDocumented
        ? "Provider documentation is present, but medical decision-making does not include documented clinical reasoning."
        : `Medical decision-making is missing documented ${missing.join(", ")}.`,
      reasoningSummary:
        "This finding checks documentation completeness only. It does not determine whether the clinician's assessment, diagnosis, treatment, or disposition is clinically correct.",
      evidence: [
        {
          sourceType: "MDM",
          label: "MDM domains documented",
          value: presentCount,
        },
        {
          sourceType: "MDM",
          label: "MDM domains reviewed",
          value: domains.length,
        },
      ],
      recommendedActions: [
        {
          actionType: "NAVIGATE",
          targetSection: "medical-evaluation",
          label: "Review medical decision making",
        },
      ],
    }),
  ];
}
