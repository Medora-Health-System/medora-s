/**
 * MEDUI.ED.POSTCERT.7 — Enterprise Governance V2 certification rules.
 * Informational + test-time validation only. No runtime clinical behavior changes.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import { collectTrackCViolations } from "./providerDocumentationComplaintIntelligenceTrackC";
import {
  auditHumanDocumentationForFamilyTemplate,
  HUMAN_DOCUMENTATION_AUDIT_FAMILIES,
} from "./providerDocumentationHumanDocumentationAudit";
import {
  ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES,
  ENTERPRISE_GOVERNANCE_REGISTRY,
  type EnterpriseGovernanceRegistryEntry,
} from "./providerDocumentationEnterpriseGovernanceRegistry";
import { templateUsesBackPainStickyNoteGovernance } from "./providerDocumentationBackPainGovernance";
import { templateUsesChestPainStickyNoteGovernance } from "./providerDocumentationChestPainGovernance";
import { isGiExtensionsGovernedTemplate } from "./providerDocumentationGiExtensionsGovernance";
import { isCardiacNonChestPainGovernedTemplate } from "./providerDocumentationCardiacNonChestPainGovernance";
import { isNeuroStrokeWeaknessGovernedTemplate } from "./providerDocumentationNeuroStrokeWeaknessGovernance";
import { isRenalMetabolicEndocrineGovernedTemplate } from "./providerDocumentationRenalMetabolicEndocrineGovernance";
import { templateUsesPediatricLegacyStickyNoteGovernance } from "./providerDocumentationPediatricLegacyGovernance";
import { isPsychBehavioralGovernedTemplate } from "./providerDocumentationPsychBehavioralGovernance";
import { isMedicationRefillGovernedTemplate } from "./providerDocumentationMedicationRefillGovernance";
import { isObservationReassessmentGovernedTemplate } from "./providerDocumentationObservationReassessmentGovernance";
import { templateUsesTraumaStickyNoteGovernance } from "./providerDocumentationTraumaGovernance";
import { templateUsesAbdominalPainStickyNoteGovernance } from "./providerDocumentationAbdominalPainGovernance";
import { templateUsesDizzinessVertigoStickyNoteGovernance } from "./providerDocumentationDizzinessVertigoGovernance";
import { templateUsesHeadacheStickyNoteGovernance } from "./providerDocumentationHeadacheGovernance";
import { templateUsesShortnessOfBreathStickyNoteGovernance } from "./providerDocumentationShortnessOfBreathGovernance";
import { templateUsesUrinarySymptomsStickyNoteGovernance } from "./providerDocumentationUrinarySymptomsGovernance";
import { templateUsesFemalePelvicGynStickyNoteGovernance } from "./providerDocumentationFemalePelvicGynGovernance";
import { templateUsesRashStickyNoteGovernance } from "./providerDocumentationRashGovernance";
import { templateUsesEarPainStickyNoteGovernance } from "./providerDocumentationEarPainGovernance";
import { templateUsesDentalOralStickyNoteGovernance } from "./providerDocumentationDentalOralGovernance";
import { templateUsesExtremityMskStickyNoteGovernance } from "./providerDocumentationExtremityMskGovernance";
import { templateUsesAdultFeverStickyNoteGovernance } from "./providerDocumentationAdultFeverGovernance";
import { templateUsesCoughUriStickyNoteGovernance } from "./providerDocumentationCoughUriGovernance";
import { templateUsesDiarrheaStickyNoteGovernance } from "./providerDocumentationDiarrheaGovernance";
import { templateUsesNauseaVomitingStickyNoteGovernance } from "./providerDocumentationNauseaVomitingGovernance";
import { templateUsesFlankPainRenalStickyNoteGovernance } from "./providerDocumentationFlankPainRenalGovernance";
import { templateUsesMaleGuStickyNoteGovernance } from "./providerDocumentationMaleGuGovernance";
import { templateUsesSoreThroatStickyNoteGovernance } from "./providerDocumentationSoreThroatGovernance";
import { templateUsesSinusSymptomsStickyNoteGovernance } from "./providerDocumentationSinusSymptomsGovernance";
import { templateUsesDehydrationViralIllnessStickyNoteGovernance } from "./providerDocumentationDehydrationViralIllnessGovernance";

export type EnterpriseGovernanceOwnerId =
  | "ChestPainGovernance"
  | "CardiacNonChestPainGovernance"
  | "NeuroStrokeWeaknessGovernance"
  | "BackPainGovernance"
  | "GiExtensionsGovernance"
  | "RenalMetabolicEndocrineGovernance"
  | "PediatricLegacyGovernance"
  | "PsychBehavioralGovernance"
  | "MedicationRefillGovernance"
  | "ObservationReassessmentGovernance"
  | "TraumaGovernance"
  | "AbdominalPainGovernance"
  | "DizzinessVertigoGovernance"
  | "HeadacheGovernance"
  | "ShortnessOfBreathGovernance"
  | "UrinarySymptomsGovernance"
  | "FemalePelvicGynGovernance"
  | "RashGovernance"
  | "EarPainGovernance"
  | "DentalOralGovernance"
  | "ExtremityMskGovernance"
  | "AdultFeverGovernance"
  | "CoughUriGovernance"
  | "DiarrheaGovernance"
  | "NauseaVomitingGovernance"
  | "FlankPainRenalGovernance"
  | "MaleGuGovernance"
  | "SoreThroatGovernance"
  | "SinusSymptomsGovernance"
  | "DehydrationViralIllnessGovernance";

export const ENTERPRISE_GOVERNANCE_V2_CERTIFICATION_REQUIREMENTS = [
  "track_c_pass",
  "human_documentation_pass",
  "mdm1_pass",
  "governance_owner_exists",
  "human_documentation_registered",
  "governance_isolation_exists",
] as const;

export type EnterpriseGovernanceV2CertificationRequirement =
  (typeof ENTERPRISE_GOVERNANCE_V2_CERTIFICATION_REQUIREMENTS)[number];

export const ENTERPRISE_MDM1_REQUIRED_SECTIONS = [
  "mdmWorkingAssessment",
  "mdmDifferentialSynthesis",
  "mdmDataReviewed",
  "mdmRiskStratification",
  "mdmClinicalRationale",
  "clinicalImpression",
  "mdmPlanSummary",
] as const;

/** Complete enterprise owner map (superset of POSTCERT.3 drift matrix). */
export const ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS: Record<
  EnterpriseGovernanceOwnerId,
  (templateId: ProviderDocumentationTemplateId | null) => boolean
> = {
  ChestPainGovernance: (id) => templateUsesChestPainStickyNoteGovernance(id),
  CardiacNonChestPainGovernance: (id) => isCardiacNonChestPainGovernedTemplate(id),
  NeuroStrokeWeaknessGovernance: (id) => isNeuroStrokeWeaknessGovernedTemplate(id),
  BackPainGovernance: (id) => templateUsesBackPainStickyNoteGovernance(id),
  GiExtensionsGovernance: (id) => isGiExtensionsGovernedTemplate(id),
  RenalMetabolicEndocrineGovernance: (id) => isRenalMetabolicEndocrineGovernedTemplate(id),
  PediatricLegacyGovernance: (id) => templateUsesPediatricLegacyStickyNoteGovernance(id),
  PsychBehavioralGovernance: (id) => isPsychBehavioralGovernedTemplate(id),
  MedicationRefillGovernance: (id) => isMedicationRefillGovernedTemplate(id),
  ObservationReassessmentGovernance: (id) => isObservationReassessmentGovernedTemplate(id),
  TraumaGovernance: (id) => templateUsesTraumaStickyNoteGovernance(id),
  AbdominalPainGovernance: (id) => templateUsesAbdominalPainStickyNoteGovernance(id),
  DizzinessVertigoGovernance: (id) => templateUsesDizzinessVertigoStickyNoteGovernance(id),
  HeadacheGovernance: (id) => templateUsesHeadacheStickyNoteGovernance(id),
  ShortnessOfBreathGovernance: (id) => templateUsesShortnessOfBreathStickyNoteGovernance(id),
  UrinarySymptomsGovernance: (id) => templateUsesUrinarySymptomsStickyNoteGovernance(id),
  FemalePelvicGynGovernance: (id) => templateUsesFemalePelvicGynStickyNoteGovernance(id),
  RashGovernance: (id) => templateUsesRashStickyNoteGovernance(id),
  EarPainGovernance: (id) => templateUsesEarPainStickyNoteGovernance(id),
  DentalOralGovernance: (id) => templateUsesDentalOralStickyNoteGovernance(id),
  ExtremityMskGovernance: (id) => templateUsesExtremityMskStickyNoteGovernance(id),
  AdultFeverGovernance: (id) => templateUsesAdultFeverStickyNoteGovernance(id),
  CoughUriGovernance: (id) => templateUsesCoughUriStickyNoteGovernance(id),
  DiarrheaGovernance: (id) => templateUsesDiarrheaStickyNoteGovernance(id),
  NauseaVomitingGovernance: (id) => templateUsesNauseaVomitingStickyNoteGovernance(id),
  FlankPainRenalGovernance: (id) => templateUsesFlankPainRenalStickyNoteGovernance(id),
  MaleGuGovernance: (id) => templateUsesMaleGuStickyNoteGovernance(id),
  SoreThroatGovernance: (id) => templateUsesSoreThroatStickyNoteGovernance(id),
  SinusSymptomsGovernance: (id) => templateUsesSinusSymptomsStickyNoteGovernance(id),
  DehydrationViralIllnessGovernance: (id) => templateUsesDehydrationViralIllnessStickyNoteGovernance(id),
};

export type EnterpriseGovernanceCertificationViolation = {
  templateId: string;
  requirement: EnterpriseGovernanceV2CertificationRequirement;
  detail: string;
};

export function resolveEnterpriseGovernanceOwners(
  templateId: ProviderDocumentationTemplateId
): EnterpriseGovernanceOwnerId[] {
  return (
    Object.entries(ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS) as [
      EnterpriseGovernanceOwnerId,
      (id: ProviderDocumentationTemplateId | null) => boolean,
    ][]
  )
    .filter(([, assert]) => assert(templateId))
    .map(([owner]) => owner);
}

export function bundlePassesEnterpriseMdm1(bundle: ProviderDocumentationComplaintIntelligence): boolean {
  return ENTERPRISE_MDM1_REQUIRED_SECTIONS.every((section) => (bundle[section]?.length ?? 0) > 0);
}

export function bundlePassesEnterpriseTrackC(bundle: ProviderDocumentationComplaintIntelligence): boolean {
  return collectTrackCViolations(bundle).length === 0;
}

export function registryEntryHasGovernanceIsolation(entry: EnterpriseGovernanceRegistryEntry): boolean {
  return entry.deniedNamespacePrefixes.length > 0;
}

export function humanDocumentationAuditPhaseForTemplate(templateId: string): string | null {
  for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
    if (family.templates.some((template) => template.templateId === templateId)) {
      return family.phase;
    }
  }
  return null;
}

export function auditEnterpriseCertificationForTemplate(
  templateId: string,
  bundle: ProviderDocumentationComplaintIntelligence
): EnterpriseGovernanceCertificationViolation[] {
  const violations: EnterpriseGovernanceCertificationViolation[] = [];
  const owners = resolveEnterpriseGovernanceOwners(templateId as ProviderDocumentationTemplateId);
  const auditPhase = humanDocumentationAuditPhaseForTemplate(templateId);
  const registryEntry = ENTERPRISE_GOVERNANCE_REGISTRY.find((entry) => entry.templateIds.includes(templateId));

  if (!bundlePassesEnterpriseTrackC(bundle)) {
    violations.push({ templateId, requirement: "track_c_pass", detail: "Track C violations present" });
  }
  if (!bundlePassesEnterpriseMdm1(bundle)) {
    violations.push({ templateId, requirement: "mdm1_pass", detail: "Missing one or more MDM.1 sections" });
  }
  if (owners.length === 0) {
    violations.push({ templateId, requirement: "governance_owner_exists", detail: "No governance owner" });
  }
  if (!auditPhase) {
    violations.push({
      templateId,
      requirement: "human_documentation_registered",
      detail: "Not registered in HUMAN_DOCUMENTATION_AUDIT_FAMILIES",
    });
  }
  if (auditPhase) {
    const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === auditPhase);
    if (family) {
      const humanViolations = auditHumanDocumentationForFamilyTemplate(family, templateId);
      if (humanViolations.length > 0) {
        violations.push({
          templateId,
          requirement: "human_documentation_pass",
          detail: `${humanViolations.length} human documentation violation(s)`,
        });
      }
    }
  }
  if (registryEntry && !registryEntryHasGovernanceIsolation(registryEntry)) {
    violations.push({
      templateId,
      requirement: "governance_isolation_exists",
      detail: `Registry entry ${registryEntry.familyId} has no denied namespace prefixes`,
    });
  }

  return violations;
}

export const ENTERPRISE_GOVERNANCE_V2_DRIFT_FAILURE_MODES = [
  "Adding a template to HUMAN_DOCUMENTATION_AUDIT_FAMILIES without a governance owner fails enterprise certification audit.",
  "Adding a template to HUMAN_DOCUMENTATION_AUDIT_FAMILIES without MDM.1 sections fails enterprise certification audit.",
  "Adding a template to HUMAN_DOCUMENTATION_AUDIT_FAMILIES with Track C key/value violations fails enterprise certification audit.",
  "Adding a certified family to ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES without denied namespace prefixes fails isolation check.",
  "Registering a governance module in ENTERPRISE_GOVERNANCE_REGISTRY without matching OWNER_ASSERTIONS leaves templates ownerless.",
  "Removing a template from ENTERPRISE_GOVERNANCE_REGISTRY while it remains human-doc audited fails registry completeness tests.",
] as const;

export function allCertifiedAuditTemplateIds(): string[] {
  return HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) => family.templates.map((template) => template.templateId));
}

export function allEnterpriseGovernanceModuleIds(): EnterpriseGovernanceOwnerId[] {
  return Object.keys(ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS) as EnterpriseGovernanceOwnerId[];
}

export function certifiedFamilyCount(): number {
  return ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length;
}
