/**
 * MEDUI.ED.DISCHARGE.TEMPLATE_FAMILY_COVERAGE.3
 * Disabled-by-default feature flag for condition-family resolver transition.
 */

/** Default OFF — production continues using registry resolver. */
export const ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER = false;

export type EdDischargeResolverFeatureFlags = {
  ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER?: boolean;
};

export function isEdDischargeConditionFamilyResolverEnabled(
  flags: EdDischargeResolverFeatureFlags = {}
): boolean {
  return flags.ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER ?? ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER;
}

export type FeatureFlagScaffoldReport = {
  flagName: "ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER";
  defaultValue: false;
  productionUsesRegistryResolver: true;
  familyResolverAvailable: true;
  fallbackPolicy: {
    unsafeNoMap: "registry_resolver";
    needsReview: "registry_resolver";
    deferredSpecialtyOnly: "registry_resolver";
    ready: "family_resolver_when_flag_on";
  };
  notes: string[];
};

export function buildFeatureFlagScaffoldReport(): FeatureFlagScaffoldReport {
  return {
    flagName: "ED_DISCHARGE_USE_CONDITION_FAMILY_RESOLVER",
    defaultValue: false,
    productionUsesRegistryResolver: true,
    familyResolverAvailable: true,
    fallbackPolicy: {
      unsafeNoMap: "registry_resolver",
      needsReview: "registry_resolver",
      deferredSpecialtyOnly: "registry_resolver",
      ready: "family_resolver_when_flag_on",
    },
    notes: [
      "Flag is a compile-time constant defaulting to false — no environment variable dependency.",
      "resolveProviderDischargeTemplateForDiagnosis() is unchanged; use resolveDischargeTemplateForDiagnosisGated() for controlled tests.",
      "When flag ON, NEEDS_REVIEW / UNSAFE / DEFERRED families fall back to registry resolver.",
    ],
  };
}
