/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Gated discharge template resolver — registry default; family resolver when flag ON and safe.
 */

import {
  isEdDischargeConditionFamilyResolverEnabled,
  type EdDischargeResolverFeatureFlags,
} from "./providerDischargeConditionFamilyFeatureFlag";
import {
  resolveClinicalConditionFamily,
  type ClinicalConditionFamilyResolveContext,
} from "./providerDischargeConditionFamilyResolver";
import {
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
  type ProviderDischargeTemplateMatchLevel,
  type ProviderDischargeTemplateResolveResult,
} from "./providerDischargeTemplateRegistry";

export type GatedDischargeTemplateResolveInput = {
  code?: string;
  displayName?: string;
  label?: string;
  context?: ClinicalConditionFamilyResolveContext;
};

export type GatedDischargeTemplateResolveOptions = {
  featureFlags?: EdDischargeResolverFeatureFlags;
};

function mapFamilyMatchToRegistryLevel(
  level: string
): ProviderDischargeTemplateMatchLevel {
  switch (level) {
    case "icdExact":
      return "icdExact";
    case "icdPrefix":
      return "icdFamily";
    case "keyword":
      return "keyword";
    default:
      return "generic";
  }
}

function templateById(id: string) {
  return PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === id);
}

/**
 * Gated resolver — defaults to registry path (flag OFF).
 * When flag ON and family routingStatus is READY, delegates to family template.
 */
export function resolveDischargeTemplateForDiagnosisGated(
  input: GatedDischargeTemplateResolveInput,
  options: GatedDischargeTemplateResolveOptions = {}
): ProviderDischargeTemplateResolveResult & {
  resolverPath: "registry" | "family" | "family_fallback_registry";
} {
  const registryResult = resolveProviderDischargeTemplateForDiagnosis({
    code: input.code,
    displayName: input.displayName ?? input.label,
  });

  if (!isEdDischargeConditionFamilyResolverEnabled(options.featureFlags)) {
    return { ...registryResult, resolverPath: "registry" };
  }

  const familyResult = resolveClinicalConditionFamily({
    code: input.code,
    displayName: input.displayName,
    label: input.label,
    context: input.context,
  });

  const family = familyResult.family;
  if (!family || familyResult.matchLevel === "generic") {
    return { ...registryResult, resolverPath: "family_fallback_registry" };
  }

  if (
    family.routingStatus === "UNSAFE_DO_NOT_MAP" ||
    family.routingStatus === "NEEDS_REVIEW" ||
    family.routingStatus === "DEFERRED_SPECIALTY_ONLY"
  ) {
    return { ...registryResult, resolverPath: "family_fallback_registry" };
  }

  const template = templateById(familyResult.templateId);
  if (!template) {
    return { ...registryResult, resolverPath: "family_fallback_registry" };
  }

  return {
    template,
    matchLevel: mapFamilyMatchToRegistryLevel(familyResult.matchLevel),
    resolverPath: "family",
  };
}
