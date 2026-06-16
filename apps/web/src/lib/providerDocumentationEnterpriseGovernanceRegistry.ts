/**
 * MEDUI.ED.POSTCERT.7 — Enterprise governance registry (informational only).
 * Maps certified complaint-intelligence families to governance, audit, and certification suites.
 * No runtime clinical behavior changes.
 */
import { PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationPediatricLegacyGovernance";
import { NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationNeuroStrokeWeaknessGovernance";
import { CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationCardiacNonChestPainGovernance";
import { RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationRenalMetabolicEndocrineGovernance";
import { GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationGiExtensionsGovernance";
import { PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationPsychBehavioralGovernance";
import { MEDICATION_REFILL_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationMedicationRefillGovernance";
import { OBSERVATION_REASSESSMENT_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationObservationReassessmentGovernance";
import { CHEST_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationChestPainGovernance";
import { SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationShortnessOfBreathGovernance";
import { ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationAbdominalPainGovernance";
import { FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationFlankPainRenalGovernance";
import { MALE_GU_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationMaleGuGovernance";
import { URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID } from "./providerDocumentationUrinarySymptomsGovernance";
import { FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationFemalePelvicGynGovernance";
import { TRAUMA_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationTraumaGovernance";
import { DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationDizzinessVertigoGovernance";
import { HEADACHE_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationHeadacheGovernance";
import { BACK_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationBackPainGovernance";
import { COUGH_URI_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationCoughUriGovernance";
import { DIARRHEA_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationDiarrheaGovernance";
import { NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationNauseaVomitingGovernance";
import { RASH_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationRashGovernance";
import { EAR_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationEarPainGovernance";
import { DENTAL_ORAL_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationDentalOralGovernance";
import { EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationExtremityMskGovernance";
import { ADULT_FEVER_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationAdultFeverGovernance";
import { SORE_THROAT_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationSoreThroatGovernance";
import { SINUS_SYMPTOMS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationSinusSymptomsGovernance";
import { DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationDehydrationViralIllnessGovernance";
import { NEURO_STROKE_WEAKNESS_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationNeuroStrokeWeaknessGovernance";
import { CARDIAC_NON_CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationCardiacNonChestPainGovernance";
import { PSYCH_BEHAVIORAL_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationPsychBehavioralGovernance";
import { MEDICATION_REFILL_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationMedicationRefillGovernance";
import { OBSERVATION_REASSESSMENT_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationObservationReassessmentGovernance";
import { PEDIATRIC_LEGACY_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationPediatricLegacyGovernance";
import { GI_EXTENSIONS_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationGiExtensionsGovernance";
import { RENAL_METABOLIC_ENDOCRINE_DENIED_HPI_FRAGMENT_PREFIXES } from "./providerDocumentationRenalMetabolicEndocrineGovernance";

export type EnterpriseGovernanceFamilyId =
  | "pediatric_legacy"
  | "neuro_stroke_weakness"
  | "cardiac_non_chest_pain"
  | "renal_metabolic_endocrine"
  | "gi_extensions"
  | "psychiatric_behavioral"
  | "medication_refill"
  | "observation_reassessment"
  | "chest_pain"
  | "shortness_of_breath"
  | "abdominal_pain"
  | "gu_renal"
  | "trauma"
  | "dizziness_vertigo"
  | "headache"
  | "back_pain"
  | "cough_uri"
  | "nausea_vomiting"
  | "diarrhea"
  | "rash_skin"
  | "ent_infectious"
  | "extremity_msk"
  | "adult_fever";

export type EnterpriseGovernanceRegistryEntry = {
  familyId: EnterpriseGovernanceFamilyId;
  displayName: string;
  auditPhase: string | null;
  templateIds: readonly string[];
  governanceModule: string;
  governanceOwnerId: string;
  trackCTestSuite: string | null;
  goldStandardTestSuite: string | null;
  deniedNamespacePrefixes: readonly string[];
};

/** Certified program families (human documentation audit phases). */
export const ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES: readonly EnterpriseGovernanceRegistryEntry[] = [
  {
    familyId: "pediatric_legacy",
    displayName: "Pediatric Legacy",
    auditPhase: "MEDUI.ED.ME.2V-RA",
    templateIds: PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationPediatricLegacyGovernance.ts",
    governanceOwnerId: "PediatricLegacyGovernance",
    trackCTestSuite: "providerDocumentationPediatricLegacyTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: PEDIATRIC_LEGACY_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "neuro_stroke_weakness",
    displayName: "Neuro Stroke Weakness",
    auditPhase: "MEDUI.ED.ME.2W-R",
    templateIds: NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationNeuroStrokeWeaknessGovernance.ts",
    governanceOwnerId: "NeuroStrokeWeaknessGovernance",
    trackCTestSuite: "providerDocumentationNeuroStrokeWeaknessTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: NEURO_STROKE_WEAKNESS_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "cardiac_non_chest_pain",
    displayName: "Cardiac Non-Chest-Pain",
    auditPhase: "MEDUI.ED.ME.2Y-R",
    templateIds: [...CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS, "near_syncope_complaint_v1"],
    governanceModule: "providerDocumentationCardiacNonChestPainGovernance.ts",
    governanceOwnerId: "CardiacNonChestPainGovernance",
    trackCTestSuite: "providerDocumentationCardiacNonChestPainTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: CARDIAC_NON_CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "renal_metabolic_endocrine",
    displayName: "Renal / Metabolic / Endocrine",
    auditPhase: "MEDUI.ED.ME.2Z-R",
    templateIds: [...RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS, "nausea_vomiting_metabolic_complaint_v1"],
    governanceModule: "providerDocumentationRenalMetabolicEndocrineGovernance.ts",
    governanceOwnerId: "RenalMetabolicEndocrineGovernance",
    trackCTestSuite: "providerDocumentationRenalMetabolicEndocrineTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: RENAL_METABOLIC_ENDOCRINE_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "gi_extensions",
    displayName: "GI Extensions",
    auditPhase: "MEDUI.ED.ME.2AA-R",
    templateIds: GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationGiExtensionsGovernance.ts",
    governanceOwnerId: "GiExtensionsGovernance",
    trackCTestSuite: "providerDocumentationGiExtensionsTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: GI_EXTENSIONS_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "psychiatric_behavioral",
    displayName: "Psychiatric / Behavioral",
    auditPhase: "MEDUI.ED.ME.2X-R",
    templateIds: PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationPsychBehavioralGovernance.ts",
    governanceOwnerId: "PsychBehavioralGovernance",
    trackCTestSuite: "providerDocumentationPsychBehavioralTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: PSYCH_BEHAVIORAL_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "medication_refill",
    displayName: "Medication Refill",
    auditPhase: "MEDUI.ED.POSTCERT.1B",
    templateIds: MEDICATION_REFILL_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationMedicationRefillGovernance.ts",
    governanceOwnerId: "MedicationRefillGovernance",
    trackCTestSuite: "providerDocumentationLegacyAdultUtilitiesTrackC.test.ts",
    goldStandardTestSuite: "providerDocumentationMedicationRefillGoldStandard.test.ts",
    deniedNamespacePrefixes: MEDICATION_REFILL_DENIED_HPI_FRAGMENT_PREFIXES,
  },
  {
    familyId: "observation_reassessment",
    displayName: "Observation Reassessment",
    auditPhase: "MEDUI.ED.POSTCERT.1C",
    templateIds: OBSERVATION_REASSESSMENT_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationObservationReassessmentGovernance.ts",
    governanceOwnerId: "ObservationReassessmentGovernance",
    trackCTestSuite: "providerDocumentationLegacyAdultUtilitiesTrackC.test.ts",
    goldStandardTestSuite: "providerDocumentationObservationReassessmentGoldStandard.test.ts",
    deniedNamespacePrefixes: OBSERVATION_REASSESSMENT_DENIED_HPI_FRAGMENT_PREFIXES,
  },
] as const;

/** Complaint-level governance modules (distributed ownership; informational registry). */
export const ENTERPRISE_COMPLAINT_GOVERNANCE_MODULES: readonly EnterpriseGovernanceRegistryEntry[] = [
  {
    familyId: "chest_pain",
    displayName: "Chest Pain",
    auditPhase: null,
    templateIds: CHEST_PAIN_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationChestPainGovernance.ts",
    governanceOwnerId: "ChestPainGovernance",
    trackCTestSuite: "providerDocumentationChestPainTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "shortness_of_breath",
    displayName: "Shortness of Breath",
    auditPhase: null,
    templateIds: SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationShortnessOfBreathGovernance.ts",
    governanceOwnerId: "ShortnessOfBreathGovernance",
    trackCTestSuite: "providerDocumentationShortnessOfBreathTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "abdominal_pain",
    displayName: "Abdominal Pain",
    auditPhase: null,
    templateIds: ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationAbdominalPainGovernance.ts",
    governanceOwnerId: "AbdominalPainGovernance",
    trackCTestSuite: "providerDocumentationAbdominalPainTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "gu_renal",
    displayName: "GU / Renal",
    auditPhase: null,
    templateIds: [...FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS, ...MALE_GU_GOVERNED_TEMPLATE_IDS, URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID],
    governanceModule: "providerDocumentationFlankPainRenalGovernance.ts",
    governanceOwnerId: "FlankPainRenalGovernance",
    trackCTestSuite: "providerDocumentationFlankPainRenalTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "trauma",
    displayName: "Trauma",
    auditPhase: null,
    templateIds: TRAUMA_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationTraumaGovernance.ts",
    governanceOwnerId: "TraumaGovernance",
    trackCTestSuite: "providerDocumentationTraumaInjuryTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "dizziness_vertigo",
    displayName: "Dizziness / Vertigo / Syncope",
    auditPhase: null,
    templateIds: DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationDizzinessVertigoGovernance.ts",
    governanceOwnerId: "DizzinessVertigoGovernance",
    trackCTestSuite: "providerDocumentationDizzinessVertigoTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "headache",
    displayName: "Headache",
    auditPhase: null,
    templateIds: HEADACHE_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationHeadacheGovernance.ts",
    governanceOwnerId: "HeadacheGovernance",
    trackCTestSuite: "providerDocumentationHeadacheTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "back_pain",
    displayName: "Back Pain",
    auditPhase: null,
    templateIds: BACK_PAIN_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationBackPainGovernance.ts",
    governanceOwnerId: "BackPainGovernance",
    trackCTestSuite: null,
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "cough_uri",
    displayName: "Cough / URI",
    auditPhase: null,
    templateIds: COUGH_URI_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationCoughUriGovernance.ts",
    governanceOwnerId: "CoughUriGovernance",
    trackCTestSuite: "providerDocumentationCoughUriTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "nausea_vomiting",
    displayName: "Nausea / Vomiting",
    auditPhase: null,
    templateIds: NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationNauseaVomitingGovernance.ts",
    governanceOwnerId: "NauseaVomitingGovernance",
    trackCTestSuite: "providerDocumentationNauseaVomitingTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "diarrhea",
    displayName: "Diarrhea",
    auditPhase: null,
    templateIds: DIARRHEA_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationDiarrheaGovernance.ts",
    governanceOwnerId: "DiarrheaGovernance",
    trackCTestSuite: "providerDocumentationDiarrheaTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "rash_skin",
    displayName: "Rash / Skin",
    auditPhase: null,
    templateIds: RASH_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationRashGovernance.ts",
    governanceOwnerId: "RashGovernance",
    trackCTestSuite: "providerDocumentationRashTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "ent_infectious",
    displayName: "ENT / Infectious",
    auditPhase: null,
    templateIds: [...EAR_PAIN_GOVERNED_TEMPLATE_IDS, ...SORE_THROAT_GOVERNED_TEMPLATE_IDS, ...SINUS_SYMPTOMS_GOVERNED_TEMPLATE_IDS, ...DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS],
    governanceModule: "providerDocumentationEarPainGovernance.ts",
    governanceOwnerId: "EarPainGovernance",
    trackCTestSuite: "providerDocumentationComplaintIntelligenceTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "extremity_msk",
    displayName: "Extremity MSK",
    auditPhase: null,
    templateIds: EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationExtremityMskGovernance.ts",
    governanceOwnerId: "ExtremityMskGovernance",
    trackCTestSuite: "providerDocumentationExtremityMskTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
  {
    familyId: "adult_fever",
    displayName: "Adult Fever",
    auditPhase: null,
    templateIds: ADULT_FEVER_GOVERNED_TEMPLATE_IDS,
    governanceModule: "providerDocumentationAdultFeverGovernance.ts",
    governanceOwnerId: "AdultFeverGovernance",
    trackCTestSuite: "providerDocumentationAdultFeverTrackC.test.ts",
    goldStandardTestSuite: null,
    deniedNamespacePrefixes: [],
  },
] as const;

export const ENTERPRISE_GOVERNANCE_REGISTRY: readonly EnterpriseGovernanceRegistryEntry[] = [
  ...ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES,
  ...ENTERPRISE_COMPLAINT_GOVERNANCE_MODULES,
];

export function registryEntryForTemplateId(templateId: string): EnterpriseGovernanceRegistryEntry | undefined {
  return ENTERPRISE_GOVERNANCE_REGISTRY.find((entry) => entry.templateIds.includes(templateId));
}

export function certifiedFamilyForAuditPhase(phase: string): EnterpriseGovernanceRegistryEntry | undefined {
  return ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.find((entry) => entry.auditPhase === phase);
}
