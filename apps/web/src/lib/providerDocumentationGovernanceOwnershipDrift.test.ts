/**
 * MEDUI.ED.POSTCERT.3 — Governance ownership matrix and drift detection.
 * Production behavior wins; tests guard against accidental governor migration.
 */
import { describe, expect, it } from "vitest";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import { BACK_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationBackPainGovernance";
import { CHEST_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationChestPainGovernance";
import { GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationGiExtensionsGovernance";
import { CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationCardiacNonChestPainGovernance";
import { NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationNeuroStrokeWeaknessGovernance";
import { RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationRenalMetabolicEndocrineGovernance";
import { PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationPediatricLegacyGovernance";
import { PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS } from "./providerDocumentationPsychBehavioralGovernance";
import { ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS, type EnterpriseGovernanceOwnerId } from "./providerDocumentationEnterpriseGovernanceV2";

type GovernanceOwnerId = EnterpriseGovernanceOwnerId;

type GovernanceOwnershipEntry = {
  templateId: string;
  primaryOwner: GovernanceOwnerId;
  secondaryOwners?: GovernanceOwnerId[];
  collector: string;
  filter: string;
};

/** Certified and representative templates — source of truth for POSTCERT.3 drift detection. */
export const GOVERNANCE_OWNERSHIP_MATRIX: readonly GovernanceOwnershipEntry[] = [
  { templateId: "chest_pain", primaryOwner: "ChestPainGovernance", collector: "resolveChestPain*ChipGroupsForTemplate", filter: "filterChestPainMdmTemplateOptionsForTemplate" },
  { templateId: "stroke_symptoms", primaryOwner: "NeuroStrokeWeaknessGovernance", collector: "resolveNeuroStrokeWeakness*ChipGroupsForTemplate", filter: "filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate" },
  { templateId: "weakness", primaryOwner: "NeuroStrokeWeaknessGovernance", collector: "resolveNeuroStrokeWeakness*ChipGroupsForTemplate", filter: "filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate" },
  { templateId: "altered_mental_status_complaint_v1", primaryOwner: "NeuroStrokeWeaknessGovernance", collector: "resolveNeuroStrokeWeakness*ChipGroupsForTemplate", filter: "filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate" },
  { templateId: "focal_weakness_complaint_v1", primaryOwner: "NeuroStrokeWeaknessGovernance", collector: "resolveNeuroStrokeWeakness*ChipGroupsForTemplate", filter: "filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate" },
  { templateId: "psychiatric_behavioral", primaryOwner: "PsychBehavioralGovernance", collector: "resolvePsychBehavioral*ChipGroupsForTemplate", filter: "filterPsychBehavioralMdmTemplateOptionsForTemplate" },
  { templateId: "medication_refill", primaryOwner: "MedicationRefillGovernance", collector: "resolveMedicationRefill*ChipGroupsForTemplate", filter: "filterMedicationRefillMdmTemplateOptionsForTemplate" },
  { templateId: "observation_reassessment", primaryOwner: "ObservationReassessmentGovernance", collector: "resolveObservationReassessment*ChipGroupsForTemplate", filter: "filterObservationReassessmentMdmTemplateOptionsForTemplate" },
  { templateId: "gi_bleed_complaint_v1", primaryOwner: "GiExtensionsGovernance", collector: "resolveGiExtensions*ChipGroupsForTemplate", filter: "filterGiExtensionsMdmTemplateOptionsForTemplate" },
  { templateId: "palpitations_complaint_v1", primaryOwner: "CardiacNonChestPainGovernance", collector: "resolveCardiacNonChestPain*ChipGroupsForTemplate", filter: "filterCardiacNonChestPainMdmTemplateOptionsForTemplate" },
  { templateId: "hyperglycemia_complaint_v1", primaryOwner: "RenalMetabolicEndocrineGovernance", collector: "resolveRenalMetabolicEndocrine*ChipGroupsForTemplate", filter: "filterRenalMetabolicEndocrineMdmTemplateOptionsForTemplate" },
  { templateId: "fever", primaryOwner: "PediatricLegacyGovernance", collector: "resolvePediatricLegacy*ChipGroupsForTemplate", filter: "filterPediatricLegacyMdmTemplateOptionsForTemplate" },
  {
    templateId: "back_pain_neuro_red_flags_complaint_v1",
    primaryOwner: "NeuroStrokeWeaknessGovernance",
    secondaryOwners: ["BackPainGovernance"],
    collector: "collectBackPainVisibleStickyNoteFragmentKeys + NeuroStrokeWeakness filters",
    filter: "filterBackPainMdmTemplateOptionsForTemplate + filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate",
  },
  { templateId: "back_pain", primaryOwner: "BackPainGovernance", collector: "collectBackPainVisibleStickyNoteFragmentKeys", filter: "filterBackPainMdmTemplateOptionsForTemplate" },
  { templateId: "abdominal_pain", primaryOwner: "AbdominalPainGovernance", collector: "resolveAbdominalPain*ChipGroupsForTemplate", filter: "filterAbdominalPainMdmTemplateOptionsForTemplate" },
  { templateId: "dizziness_syncope", primaryOwner: "DizzinessVertigoGovernance", collector: "resolveDizzinessVertigo*ChipGroupsForTemplate", filter: "filterDizzinessVertigoMdmTemplateOptionsForTemplate" },
  { templateId: "sob", primaryOwner: "ShortnessOfBreathGovernance", collector: "resolveShortnessOfBreath*ChipGroupsForTemplate", filter: "filterShortnessOfBreathMdmTemplateOptionsForTemplate" },
  { templateId: "urinary_symptoms", primaryOwner: "UrinarySymptomsGovernance", collector: "resolveUrinary*ChipGroupsForTemplate", filter: "filterUrinaryMdmTemplateOptionsForTemplate" },
  { templateId: "female_pelvic_gyn_complaint", primaryOwner: "FemalePelvicGynGovernance", collector: "resolveFemalePelvicGyn*ChipGroupsForTemplate", filter: "filterFemalePelvicGynMdmTemplateOptionsForTemplate" },
  { templateId: "fall", primaryOwner: "TraumaGovernance", collector: "resolveTrauma*ChipGroupsForTemplate", filter: "filterTraumaMdmTemplateOptionsForTemplate" },
  { templateId: "ear_pain_otitis_complaint_v1", primaryOwner: "EarPainGovernance", collector: "resolveEarPain*ChipGroupsForTemplate", filter: "filterEarPainMdmTemplateOptionsForTemplate" },
  { templateId: "dental_pain_infection_complaint_v1", primaryOwner: "DentalOralGovernance", collector: "resolveDentalOral*ChipGroupsForTemplate", filter: "filterDentalOralMdmTemplateOptionsForTemplate" },
  { templateId: "trauma_musculoskeletal", primaryOwner: "ExtremityMskGovernance", collector: "resolveExtremityMsk*ChipGroupsForTemplate", filter: "filterExtremityMskMdmTemplateOptionsForTemplate" },
  { templateId: "fever_complaint_v1", primaryOwner: "AdultFeverGovernance", collector: "resolveAdultFever*ChipGroupsForTemplate", filter: "filterAdultFeverMdmTemplateOptionsForTemplate" },
  { templateId: "adult_uri_respiratory", primaryOwner: "CoughUriGovernance", collector: "resolveCoughUri*ChipGroupsForTemplate", filter: "filterCoughUriMdmTemplateOptionsForTemplate" },
  { templateId: "adult_diarrhea", primaryOwner: "DiarrheaGovernance", collector: "resolveDiarrhea*ChipGroupsForTemplate", filter: "filterDiarrheaMdmTemplateOptionsForTemplate" },
  { templateId: "adult_nausea_vomiting", primaryOwner: "NauseaVomitingGovernance", collector: "resolveNauseaVomiting*ChipGroupsForTemplate", filter: "filterNauseaVomitingMdmTemplateOptionsForTemplate" },
  { templateId: "flank_pain", primaryOwner: "FlankPainRenalGovernance", collector: "resolveFlankPainRenal*ChipGroupsForTemplate", filter: "filterFlankPainRenalMdmTemplateOptionsForTemplate" },
  { templateId: "male_genital_complaint", primaryOwner: "MaleGuGovernance", collector: "resolveMaleGu*ChipGroupsForTemplate", filter: "filterMaleGuMdmTemplateOptionsForTemplate" },
  { templateId: "allergic_reaction_rash", primaryOwner: "RashGovernance", collector: "resolveRash*ChipGroupsForTemplate", filter: "filterRashMdmTemplateOptionsForTemplate" },
  { templateId: "headache", primaryOwner: "HeadacheGovernance", collector: "resolveHeadache*ChipGroupsForTemplate", filter: "filterHeadacheMdmTemplateOptionsForTemplate" },
  { templateId: "sore_throat_complaint_v1", primaryOwner: "SoreThroatGovernance", collector: "resolveSoreThroat*ChipGroupsForTemplate", filter: "filterSoreThroatMdmTemplateOptionsForTemplate" },
  { templateId: "sinus_symptoms_complaint_v1", primaryOwner: "SinusSymptomsGovernance", collector: "resolveSinusSymptoms*ChipGroupsForTemplate", filter: "filterSinusSymptomsMdmTemplateOptionsForTemplate" },
  { templateId: "dehydration_viral_illness_complaint_v1", primaryOwner: "DehydrationViralIllnessGovernance", collector: "resolveDehydrationViralIllness*ChipGroupsForTemplate", filter: "filterDehydrationViralIllnessMdmTemplateOptionsForTemplate" },
] as const;

const OWNER_ASSERTIONS = ENTERPRISE_GOVERNANCE_OWNER_ASSERTIONS;

describe("providerDocumentationGovernanceOwnershipDrift — MEDUI.ED.POSTCERT.3", () => {
  function resolveActiveGovernanceOwners(templateId: ProviderDocumentationTemplateId): GovernanceOwnerId[] {
    return (Object.entries(OWNER_ASSERTIONS) as [GovernanceOwnerId, (id: ProviderDocumentationTemplateId | null) => boolean][])
      .filter(([, assert]) => assert(templateId))
      .map(([owner]) => owner);
  }

  it("maps every human-documentation-audited template to at least one governance owner", () => {
    const auditedTemplateIds = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
      family.templates.map((template) => template.templateId)
    );
    for (const templateId of auditedTemplateIds) {
      const owners = resolveActiveGovernanceOwners(templateId as ProviderDocumentationTemplateId);
      expect(owners.length, `no governance owner for ${templateId}`).toBeGreaterThan(0);
    }
  });

  it.each(GOVERNANCE_OWNERSHIP_MATRIX.map((entry) => [entry.templateId, entry.primaryOwner, entry.secondaryOwners ?? []] as const))(
    "%s primary owner remains %s",
    (templateId, primaryOwner, secondaryOwners) => {
      const id = templateId as ProviderDocumentationTemplateId;
      expect(OWNER_ASSERTIONS[primaryOwner](id), `${templateId} primary`).toBe(true);
      for (const secondary of secondaryOwners) {
        expect(OWNER_ASSERTIONS[secondary](id), `${templateId} secondary ${secondary}`).toBe(true);
      }
    }
  );

  it("keeps back_pain_neuro_red_flags_complaint_v1 under NeuroStrokeWeakness with BackPain secondary routing", () => {
    const entry = GOVERNANCE_OWNERSHIP_MATRIX.find((item) => item.templateId === "back_pain_neuro_red_flags_complaint_v1");
    expect(entry?.primaryOwner).toBe("NeuroStrokeWeaknessGovernance");
    expect(entry?.secondaryOwners).toEqual(["BackPainGovernance"]);
    expect(NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS).toContain("back_pain_neuro_red_flags_complaint_v1");
    expect(BACK_PAIN_GOVERNED_TEMPLATE_IDS).toContain("back_pain_neuro_red_flags_complaint_v1");
  });

  it("detects drift when governed template ID sets change unexpectedly", () => {
    expect([...CHEST_PAIN_GOVERNED_TEMPLATE_IDS]).toEqual(["chest_pain"]);
    expect([...GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS]).toEqual([
      "constipation_complaint_v1",
      "gi_bleed_complaint_v1",
      "hernia_complaint_v1",
      "rectal_pain_complaint_v1",
      "dysphagia_complaint_v1",
    ]);
    expect([...PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS]).toEqual(["psychiatric_behavioral"]);
    expect([...CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS]).toContain("palpitations_complaint_v1");
    expect([...RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS]).toContain("hyperglycemia_complaint_v1");
    expect([...PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS]).toContain("fever");
    expect([...NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS]).toContain("stroke_symptoms");
  });
});
