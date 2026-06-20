/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Shadow-mode comparator — audit-only; no production routing changes.
 */

import type { ClinicalConditionFamilyRoutingStatus } from "./providerDischargeConditionFamilyTypes";
import {
  resolveClinicalConditionFamily,
  type ClinicalConditionFamilyResolveContext,
} from "./providerDischargeConditionFamilyResolver";
import {
  evaluatePediatricFeverAgePolicy,
  isAdultToPediatricPreventedOutcome,
} from "./providerDischargePediatricFeverAgePolicy";
import {
  GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { buildTemplateToFamilyMap } from "./providerDischargeClinicalFamilyCoverage";

export type ShadowFamilyOutcomeClassification =
  | "identical"
  | "safer_family"
  | "needs_review"
  | "unsafe_no_map"
  | "regression_risk"
  | "generic_fallback";

export type ShadowResolverCompareResult = {
  registryTemplateId: string;
  familyTemplateId: string;
  same: boolean;
  familyOutcome: ShadowFamilyOutcomeClassification;
  familyRoutingStatus: ClinicalConditionFamilyRoutingStatus | null;
  explanation: string;
  recommendedAction: string;
};

export type ShadowModeResolverComparatorReport = {
  comparisons: ShadowResolverCompareResult[];
  identicalCount: number;
  saferFamilyCount: number;
  needsReviewCount: number;
  unsafeNoMapCount: number;
  regressionRiskCount: number;
  genericFallbackCount: number;
};

function refineShadowOutcomeForAgePolicy(input: {
  compare: ShadowResolverCompareResult;
  feverPolicyStatus: ReturnType<typeof evaluatePediatricFeverAgePolicy>["status"];
  registryTemplateId: string;
  familyTemplateId: string;
}): ShadowResolverCompareResult {
  const { compare, feverPolicyStatus, registryTemplateId, familyTemplateId } = input;

  if (
    isAdultToPediatricPreventedOutcome({
      registryTemplateId,
      familyTemplateId,
      policyStatus: feverPolicyStatus,
    })
  ) {
    return {
      ...compare,
      same: false,
      familyOutcome: "safer_family",
      explanation:
        "Age policy prevented unsafe pediatric routing when age was unavailable or adult-confirmed.",
      recommendedAction:
        "Accept family adult fever default; registry pediatric route requires age context review.",
    };
  }

  if (
    compare.familyOutcome === "regression_risk" &&
    familyTemplateId.includes("pediatric") &&
    feverPolicyStatus !== "pediatric_confirmed"
  ) {
    return {
      ...compare,
      familyOutcome: "needs_review",
      explanation: "Pediatric fever template blocked without confirmed pediatric age context.",
      recommendedAction: "Provide patient age or use adult fever policy default.",
    };
  }

  if (feverPolicyStatus === "needs_review_pediatric_label_no_age") {
    return {
      ...compare,
      familyOutcome: "needs_review",
      explanation: "Explicit pediatric label without age — clinical review required before routing.",
      recommendedAction: "Confirm patient age or keep registry resolver.",
    };
  }

  return compare;
}

function buildShadowCompareContext(input: {
  code?: string;
  displayName?: string;
  label?: string;
  context?: ClinicalConditionFamilyResolveContext;
}): ClinicalConditionFamilyResolveContext | undefined {
  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: input.code,
    displayName: input.displayName,
    label: input.label,
    patientAgeYears: input.context?.patientAgeYears,
    patientDob: input.context?.patientDob,
  });

  return {
    ...input.context,
    patientAgeYears: feverPolicy.resolvedAgeYears ?? input.context?.patientAgeYears,
    feverAdultDefaultUnknownAge: feverPolicy.feverAdultDefaultUnknownAge,
    feverForceGenericFallback: feverPolicy.forceGenericFallback,
  };
}

function classifyShadowOutcome(input: {
  registryTemplateId: string;
  familyTemplateId: string;
  routingStatus: ClinicalConditionFamilyRoutingStatus | null;
  familyMatchLevel: string;
}): ShadowResolverCompareResult {
  const { registryTemplateId, familyTemplateId, routingStatus, familyMatchLevel } = input;

  if (routingStatus === "UNSAFE_DO_NOT_MAP") {
    return {
      registryTemplateId,
      familyTemplateId,
      same: registryTemplateId === familyTemplateId,
      familyOutcome: "unsafe_no_map",
      familyRoutingStatus: routingStatus,
      explanation: "Family marked UNSAFE_DO_NOT_MAP — must not route in production.",
      recommendedAction: "Keep registry resolver; do not enable family routing for this input.",
    };
  }

  if (routingStatus === "NEEDS_REVIEW" || routingStatus === "DEFERRED_SPECIALTY_ONLY") {
    return {
      registryTemplateId,
      familyTemplateId,
      same: registryTemplateId === familyTemplateId,
      familyOutcome: "needs_review",
      familyRoutingStatus: routingStatus,
      explanation: `Family routing status ${routingStatus} — requires clinical review before production.`,
      recommendedAction: "Use registry resolver until family is promoted to READY.",
    };
  }

  if (familyTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
    if (registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
      return {
        registryTemplateId,
        familyTemplateId,
        same: true,
        familyOutcome: "identical",
        familyRoutingStatus: routingStatus,
        explanation: "Both resolvers agree on generic fallback.",
        recommendedAction: "No action — acceptable generic agreement.",
      };
    }
    return {
      registryTemplateId,
      familyTemplateId,
      same: false,
      familyOutcome: "generic_fallback",
      familyRoutingStatus: routingStatus,
      explanation: "Family resolver fell back to generic template.",
      recommendedAction: "Extend family mapping for this ICD/label.",
    };
  }

  if (registryTemplateId === familyTemplateId) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: true,
      familyOutcome: "identical",
      familyRoutingStatus: routingStatus,
      explanation: "Registry and family resolvers agree.",
      recommendedAction: "No action — safe for shadow monitoring.",
    };
  }

  const templateToFamily = buildTemplateToFamilyMap();
  const registryFamily = templateToFamily.get(registryTemplateId);
  const familyFamily = templateToFamily.get(familyTemplateId);
  if (registryFamily && familyFamily && registryFamily === familyFamily) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: true,
      familyOutcome: "identical",
      familyRoutingStatus: routingStatus,
      explanation: "Different template IDs but same clinical family — functionally equivalent.",
      recommendedAction: "No action — family override within same family.",
    };
  }

  if (registryTemplateId === GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: false,
      familyOutcome: "safer_family",
      familyRoutingStatus: routingStatus,
      explanation: "Family improves coverage over registry generic fallback.",
      recommendedAction: "Candidate for family resolver when flag enabled.",
    };
  }

  if (
    registryTemplateId.includes("pediatric") &&
    !familyTemplateId.includes("pediatric")
  ) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: false,
      familyOutcome: "regression_risk",
      familyRoutingStatus: routingStatus,
      explanation: "Family routes adult template where registry used pediatric.",
      recommendedAction: "Apply age guardrails or block family routing.",
    };
  }

  if (
    !registryTemplateId.includes("pediatric") &&
    familyTemplateId.includes("pediatric")
  ) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: false,
      familyOutcome: "regression_risk",
      familyRoutingStatus: routingStatus,
      explanation: "Family routes pediatric template without registry agreement.",
      recommendedAction: "Require pediatric age context before routing.",
    };
  }

  if (familyMatchLevel === "keyword" && registryTemplateId !== GENERIC_PROVIDER_DISCHARGE_TEMPLATE_ID) {
    return {
      registryTemplateId,
      familyTemplateId,
      same: false,
      familyOutcome: "needs_review",
      familyRoutingStatus: routingStatus,
      explanation: "Family used keyword routing where registry had ICD match.",
      recommendedAction: "Prefer ICD family routing; narrow keywords.",
    };
  }

  return {
    registryTemplateId,
    familyTemplateId,
    same: false,
    familyOutcome: "needs_review",
    familyRoutingStatus: routingStatus,
    explanation: "Template mismatch — review before production switch.",
    recommendedAction: "Compare clinical content and align family or registry mapping.",
  };
}

export function compareRegistryResolverToFamilyResolver(input: {
  code?: string;
  displayName?: string;
  label?: string;
  context?: ClinicalConditionFamilyResolveContext;
}): ShadowResolverCompareResult {
  const context = buildShadowCompareContext(input);
  const feverPolicy = evaluatePediatricFeverAgePolicy({
    code: input.code,
    displayName: input.displayName,
    label: input.label,
    patientAgeYears: context?.patientAgeYears,
    patientDob: context?.patientDob,
  });

  const registry = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName ?? input.label,
  });
  const family = resolveClinicalConditionFamily({
    code: input.code,
    displayName: input.displayName,
    label: input.label,
    context,
  });

  const raw = classifyShadowOutcome({
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
    routingStatus: family.family?.routingStatus ?? null,
    familyMatchLevel: family.matchLevel,
  });

  return refineShadowOutcomeForAgePolicy({
    compare: raw,
    feverPolicyStatus: feverPolicy.status,
    registryTemplateId: registry.template.id,
    familyTemplateId: family.templateId,
  });
}

export function buildShadowModeResolverComparatorReport(
  probes: Array<{
    code?: string;
    displayName?: string;
    label?: string;
    context?: ClinicalConditionFamilyResolveContext;
  }>
): ShadowModeResolverComparatorReport {
  const comparisons = probes.map((p) => compareRegistryResolverToFamilyResolver(p));
  return {
    comparisons,
    identicalCount: comparisons.filter((c) => c.familyOutcome === "identical").length,
    saferFamilyCount: comparisons.filter((c) => c.familyOutcome === "safer_family").length,
    needsReviewCount: comparisons.filter((c) => c.familyOutcome === "needs_review").length,
    unsafeNoMapCount: comparisons.filter((c) => c.familyOutcome === "unsafe_no_map").length,
    regressionRiskCount: comparisons.filter((c) => c.familyOutcome === "regression_risk").length,
    genericFallbackCount: comparisons.filter((c) => c.familyOutcome === "generic_fallback").length,
  };
}
