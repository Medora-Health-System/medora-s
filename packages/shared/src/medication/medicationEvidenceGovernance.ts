/**
 * Phase 14A — source acquisition, evidence governance, knowledge completion.
 * Knowledge is advisory only. No order/dispense/admin workflow control.
 */

export const PHASE14A_EVIDENCE_GOVERNANCE_DEFAULTS = {
  providerFacingAlertsEnabled: false,
  orderBlockingEnabled: false,
  clinicalActivationEnabled: false,
  activeCdsModeAvailable: false,
  automaticKnowledgeApprovalEnabled: false,
  automaticMedicationIdentityCreationEnabled: false,
  knowledgeControlsPatientCare: false,
  orderingChanged: false,
  dispensingChanged: false,
  administrationChanged: false,
  marChanged: false,
  billingChanged: false,
  knowledgeWithoutProvenanceAllowed: false,
} as const;

export const PHASE14A_BATCH_KEY = "EM_WAVE1_EVIDENCE_COMPLETION_V1";
export const PHASE14A_PROGRAM_VERSION = "1.0.0";

export const PHASE14A_SOURCE_TIER_VALUES = [
  "TIER_1_REGULATORY",
  "TIER_2_GOVERNMENT",
  "TIER_3_PROFESSIONAL_GUIDELINE",
  "TIER_4_LICENSED_COMPENDIUM",
  "TIER_5_INSTITUTIONAL_POLICY",
  "TIER_6_MANUFACTURER",
  "TIER_7_EXPERT_CONSENSUS",
] as const;

export type Phase14ASourceTier = (typeof PHASE14A_SOURCE_TIER_VALUES)[number];

export const PHASE14A_ACQUISITION_STATUS_VALUES = [
  "PLANNED",
  "REGISTERED",
  "RETRIEVED",
  "NORMALIZED",
  "LINKED",
  "UNDER_REVIEW",
  "ACCEPTED_FOR_KNOWLEDGE_USE",
  "REJECTED",
  "SUPERSEDED",
  "RETIRED",
] as const;

export const PHASE14A_COMPLETENESS_DOMAIN_VALUES = [
  "PROVENANCE",
  "CLINICAL_PROFILE",
  "ADULT_DOSING",
  "ADMINISTRATION",
  "MONITORING",
  "CONTRAINDICATIONS",
  "THERAPEUTIC_CLASS",
  "ALLERGEN_MAPPING",
  "DUPLICATE_THERAPY",
  "EMERGENCY_CONTEXT",
] as const;

export type Phase14ACompletenessDomain =
  (typeof PHASE14A_COMPLETENESS_DOMAIN_VALUES)[number];

export const PHASE14A_DOMAIN_STATUS_VALUES = [
  "MISSING",
  "PLACEHOLDER",
  "PROVENANCE_LINKED",
  "STRUCTURED_DRAFT",
  "UNDER_REVIEW",
  "COMPLETE_WITH_EVIDENCE",
  "DEFERRED_WITH_REASON",
  "NOT_APPLICABLE",
] as const;

/** Markers that remain non-evidence (must not satisfy provenance). */
export const PHASE14A_NON_EVIDENCE_MARKERS = [
  "PHASE12_KNOWLEDGE_FIXTURE",
  "INSTITUTIONAL_SCAFFOLDING",
  "PHASE12_CLINICAL_FRAMEWORK",
  "PHASE12_SAFETY_FRAMEWORK",
  "GENERIC_SCAFFOLDING",
  "LLM_GENERATED",
  "CURSOR_PROMPT",
  "UNCITED",
] as const;

export const PHASE14A_EVIDENCE_SOURCE_CODES = {
  clinical: "PHASE14A_EM_CLINICAL_EVIDENCE_CATALOG",
  safety: "PHASE14A_EM_SAFETY_EVIDENCE_CATALOG",
} as const;

export function assertPhase14ANoWorkflowControl(enabled: boolean): void {
  if (enabled) {
    throw new Error(
      "Phase 14A forbids Medication Intelligence controlling patient-care workflows."
    );
  }
}

export function assertPhase14ANoClinicalActivation(enabled: boolean): void {
  if (enabled) {
    throw new Error("Phase 14A forbids clinicalActivationEnabled=true.");
  }
}

export function assertPhase14ANoProviderFacingAlerts(enabled: boolean): void {
  if (enabled) throw new Error("Phase 14A forbids provider-facing alerts.");
}

export function assertPhase14ANoOrderBlocking(enabled: boolean): void {
  if (enabled) throw new Error("Phase 14A forbids order blocking.");
}

export function assertPhase14ANoAutomaticApproval(auto: boolean): void {
  if (auto) {
    throw new Error("Phase 14A forbids automatic knowledge approval.");
  }
}

export function assertKnowledgeRequiresProvenance(
  evidenceLinkId: string | null | undefined
): void {
  if (!evidenceLinkId) {
    throw new Error("Phase 14A forbids knowledge without provenance.");
  }
}

export function isNonEvidenceContent(value: string | null | undefined): boolean {
  if (!value) return false;
  const upper = value.toUpperCase();
  return PHASE14A_NON_EVIDENCE_MARKERS.some((m) => upper.includes(m));
}

export function scoreDomainCompleteness(status: string): number {
  switch (status) {
    case "COMPLETE_WITH_EVIDENCE":
      return 100;
    case "UNDER_REVIEW":
      return 80;
    case "STRUCTURED_DRAFT":
      return 60;
    case "PROVENANCE_LINKED":
      return 40;
    case "DEFERRED_WITH_REASON":
    case "NOT_APPLICABLE":
      return 100; // does not reduce score
    case "PLACEHOLDER":
      return 10;
    case "MISSING":
    default:
      return 0;
  }
}

export function aggregateCompletenessScore(
  domainStatuses: Record<string, string>
): {
  overallScore: number;
  provenanceScore: number;
  clinicalScore: number;
  safetyScore: number;
  domainsComplete: number;
  domainsTotal: number;
} {
  const entries = Object.entries(domainStatuses);
  const applicable = entries.filter(
    ([, s]) => s !== "NOT_APPLICABLE" && s !== "DEFERRED_WITH_REASON"
  );
  const scored = applicable.map(([, s]) => scoreDomainCompleteness(s));
  const overall =
    scored.length === 0
      ? 0
      : Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);

  const provenanceScore = scoreDomainCompleteness(
    domainStatuses.PROVENANCE ?? "MISSING"
  );
  const clinicalKeys = [
    "CLINICAL_PROFILE",
    "ADULT_DOSING",
    "ADMINISTRATION",
    "MONITORING",
    "CONTRAINDICATIONS",
    "EMERGENCY_CONTEXT",
  ];
  const safetyKeys = [
    "THERAPEUTIC_CLASS",
    "ALLERGEN_MAPPING",
    "DUPLICATE_THERAPY",
  ];
  const avg = (keys: string[]) => {
    const vals = keys
      .map((k) => domainStatuses[k])
      .filter((s) => s && s !== "NOT_APPLICABLE" && s !== "DEFERRED_WITH_REASON")
      .map((s) => scoreDomainCompleteness(s!));
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  };

  return {
    overallScore: overall,
    provenanceScore,
    clinicalScore: avg(clinicalKeys),
    safetyScore: avg(safetyKeys),
    domainsComplete: applicable.filter(
      ([, s]) => s === "COMPLETE_WITH_EVIDENCE" || s === "UNDER_REVIEW"
    ).length,
    domainsTotal: applicable.length,
  };
}

export function defaultWave1DomainStatuses(input: {
  hasEvidenceLink: boolean;
  isPlaceholder: boolean;
  hasClinicalProfile: boolean;
  hasTherapeuticClass: boolean;
  hasAllergenMapping: boolean;
  hasDuplicateTherapy: boolean;
}): Record<Phase14ACompletenessDomain, string> {
  const provenance = input.hasEvidenceLink
    ? input.isPlaceholder
      ? "PLACEHOLDER"
      : "PROVENANCE_LINKED"
    : "MISSING";
  const profile = !input.hasClinicalProfile
    ? "MISSING"
    : input.isPlaceholder
      ? "PLACEHOLDER"
      : input.hasEvidenceLink
        ? "STRUCTURED_DRAFT"
        : "PLACEHOLDER";

  return {
    PROVENANCE: provenance,
    CLINICAL_PROFILE: profile,
    ADULT_DOSING: "DEFERRED_WITH_REASON",
    ADMINISTRATION: input.hasEvidenceLink ? "PROVENANCE_LINKED" : "MISSING",
    MONITORING: "DEFERRED_WITH_REASON",
    CONTRAINDICATIONS: input.hasEvidenceLink ? "PROVENANCE_LINKED" : "MISSING",
    THERAPEUTIC_CLASS: input.hasTherapeuticClass
      ? input.hasEvidenceLink
        ? "STRUCTURED_DRAFT"
        : "PLACEHOLDER"
      : "MISSING",
    ALLERGEN_MAPPING: input.hasAllergenMapping
      ? input.hasEvidenceLink
        ? "STRUCTURED_DRAFT"
        : "PLACEHOLDER"
      : "MISSING",
    DUPLICATE_THERAPY: input.hasDuplicateTherapy
      ? input.hasEvidenceLink
        ? "STRUCTURED_DRAFT"
        : "PLACEHOLDER"
      : "MISSING",
    EMERGENCY_CONTEXT: input.hasEvidenceLink
      ? "PROVENANCE_LINKED"
      : "MISSING",
  };
}
