import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectSoreThroatVisibleStickyNoteFragmentKeys,
  filterSoreThroatMdmTemplateOptionsForTemplate,
  resolveSoreThroatExamChipGroupsForTemplate,
  resolveSoreThroatRosChipGroupsForTemplate,
  SORE_THROAT_ALLOWED_EXAM_SECTION_IDS,
  SORE_THROAT_GOVERNED_TEMPLATE_IDS,
  templateUsesSoreThroatStickyNoteGovernance,
} from "@/lib/providerDocumentationSoreThroatGovernance";
import { collectSinusSymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationSinusSymptomsGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";
import { SORE_THROAT_COMPLAINT_V1_INTEL } from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";
import { SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

const RESPIRATORY_SORE_THROAT_ID = "sore_throat_complaint_v1" as const;
const INFECTIOUS_SORE_THROAT_ID = "sore_throat_infectious_complaint_v1" as const;
const RESPIRATORY_INTEL = "providerDocumentationComplaintIntel.soreThroatComplaintV1";
const INFECTIOUS_INTEL = "providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1";

const WORKSPACE_ROS_CHIP_GROUPS = [
  {
    field: "rosImportantPositives" as const,
    chips: [
      "posSob",
      "posChestPain",
      "posFever",
      "posVomiting",
      "posDizziness",
      "posWeakness",
      "posAbdominalPain",
      "posHeadache",
      "posCough",
      "posSyncope",
    ].map((key) => ({ fragmentKey: `erMseRosChips.${key}` })),
  },
  {
    field: "rosRedFlags" as const,
    chips: [
      "rfSyncope",
      "rfAlteredMs",
      "rfSeverePain",
      "rfNeuroDeficit",
      "rfHypotensionConcern",
      "rfRespDistress",
      "rfBleeding",
      "rfPregnancyConcern",
    ].map((key) => ({ fragmentKey: `erMseRosChips.${key}` })),
  },
  {
    field: "rosImportantNegatives" as const,
    chips: [
      "negDeniesChestPain",
      "negDeniesSob",
      "negDeniesFever",
      "negDeniesVomiting",
      "negDeniesWeakness",
      "negDeniesSyncope",
      "negDeniesAbdominalPain",
      "negDeniesHeadache",
    ].map((key) => ({ fragmentKey: `erMseRosChips.${key}` })),
  },
];

const WORKSPACE_EXAM_CHIP_GROUPS = [
  { sectionId: "general", chips: ["genAlert", "genNoAcuteDistress"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  {
    sectionId: "heent",
    chips: ["heentHeadAtraumatic", "heentOropharynxClear", "heentDryMm"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  {
    sectionId: "cardiovascular",
    chips: ["cardioRrr", "cardioTachycardic"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "respiratory",
    chips: ["respWheezing", "respClearBs"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "abdomen",
    chips: ["abdSoft", "abdTendernessPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "skin",
    chips: ["skinWarmDry", "skinRashPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent", "mskRomNormal"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroAlertOriented", "neuroFocalDeficitNoted"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  { sectionId: "reassessment", chips: [{ fragmentKey: "erMseMdmChips.planReassess" }] },
];

const WORKSPACE_HPI_CHIP_GROUPS = [
  {
    titleKey: "providerDocumentationWorkspace.chipLocation",
    field: "hpi" as const,
    chips: [
      "locChestPain",
      "locHeadache",
      "locBackPain",
      "locLimbPain",
      "locAbdominalPain",
      "locFlankPain",
      "qualPressureLike",
      "assocSob",
      "assocCough",
      "assocDizziness",
      "assocFever",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

const REQUIRED_DIFFERENTIAL_SUFFIXES = [
  "diffViralPharyngitis",
  "diffStreptococcalPharyngitis",
  "diffTonsillitis",
  "diffPeritonsillarAbscess",
  "diffRetropharyngealAbscess",
  "diffEpiglottitis",
  "diffUvulitis",
  "diffInfectiousMononucleosis",
  "diffDeepNeckSpaceInfection",
  "diffLudwigAngina",
  "diffDentalInfection",
  "diffOralAbscess",
  "diffViralUri",
  "diffCovidPharyngitis",
  "diffInfluenzaPharyngitis",
] as const;

const CANNOT_MISS_SUFFIXES = [
  "diffPeritonsillarAbscess",
  "diffRetropharyngealAbscess",
  "diffEpiglottitis",
  "diffDeepNeckSpaceInfection",
  "diffLudwigAngina",
  "diffAirwayCompromise",
  "diffSepsis",
] as const;

describe("providerDocumentationSoreThroatGovernance — MEDUI.ED.ME.2T", () => {
  it("governs all discovered sore throat template IDs in catalog", () => {
    expect(SORE_THROAT_GOVERNED_TEMPLATE_IDS).toEqual([
      "sore_throat_complaint_v1",
      "sore_throat_infectious_complaint_v1",
    ]);
    for (const templateId of SORE_THROAT_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesSoreThroatStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes pharyngitis, tonsillitis, peritonsillar abscess, and airway concern chips", () => {
    const visible = collectSoreThroatVisibleStickyNoteFragmentKeys({
      templateId: RESPIRATORY_SORE_THROAT_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has(`${RESPIRATORY_INTEL}.hpiPainfulSwallowing`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.diffViralPharyngitis`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.diffTonsillitis`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.diffPeritonsillarAbscess`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.rfStridor`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.examTonsillarErythema`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.examPeritonsillarFullness`)).toBe(true);

    const infectiousVisible = collectSoreThroatVisibleStickyNoteFragmentKeys({
      templateId: INFECTIOUS_SORE_THROAT_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(infectiousVisible.has(`${INFECTIOUS_INTEL}.rfMuffledVoice`)).toBe(true);
    expect(infectiousVisible.has(`${INFECTIOUS_INTEL}.diffEpiglottitis`)).toBe(true);
  });

  it("includes reinforced cannot-miss differential and disposition chips", () => {
    const visible = collectSoreThroatVisibleStickyNoteFragmentKeys({
      templateId: RESPIRATORY_SORE_THROAT_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    for (const suffix of CANNOT_MISS_SUFFIXES) {
      expect(visible.has(`${RESPIRATORY_INTEL}.${suffix}`)).toBe(true);
    }
    expect(visible.has(`${RESPIRATORY_INTEL}.mdmCtNeckReviewed`)).toBe(true);
    expect(visible.has(`${RESPIRATORY_INTEL}.dispUrgentEntFollowUp`)).toBe(true);
  });

  it("hides chest pain, UTI, primary headache, vertigo, dental, and trauma wrong-domain chips", () => {
    const visible = collectSoreThroatVisibleStickyNoteFragmentKeys({
      templateId: RESPIRATORY_SORE_THROAT_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.sinusSymptomsComplaintV1.diffAcuteBacterialSinusitis")).toBe(
      false
    );
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.fall.hpiMechanicalFall")).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveSoreThroatRosChipGroupsForTemplate(RESPIRATORY_SORE_THROAT_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).toContain("erMseRosChips.posFever");
  });

  it("restricts exam sections to sore-throat-relevant sections including neuroPsych", () => {
    const examSectionIds = resolveSoreThroatExamChipGroupsForTemplate(
      RESPIRATORY_SORE_THROAT_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...SORE_THROAT_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("skin");
  });

  it("keeps infectious MDM while hiding EKG and wrong-domain pathways", () => {
    const template =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === RESPIRATORY_SORE_THROAT_ID) ?? null;
    const mdmKeys = filterSoreThroatMdmTemplateOptionsForTemplate(
      RESPIRATORY_SORE_THROAT_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.waUndifferentiated");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys).toContain("erMseMdmChips.planMeds");
    expect(mdmKeys).toContain("erMseMdmChips.planReassess");
    expect(mdmKeys.some((key) => key.includes("soreThroatComplaintV1"))).toBe(true);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("passes differential quality audit for reinforced complaint intelligence", () => {
    for (const intel of [SORE_THROAT_COMPLAINT_V1_INTEL, SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL]) {
      const diffs = intel.mdmDifferentialSynthesis ?? [];
      for (const suffix of REQUIRED_DIFFERENTIAL_SUFFIXES) {
        expect(diffs.some((key) => key.endsWith(suffix))).toBe(true);
      }
      for (const suffix of CANNOT_MISS_SUFFIXES) {
        expect(diffs.some((key) => key.endsWith(suffix))).toBe(true);
      }
      expect(intel.mdmWorkingAssessment?.some((key) => key.includes("AirwayCompromise"))).toBe(true);
      expect(intel.reassessment?.some((key) => key.includes("Airway") || key.includes("Peritonsillar"))).toBe(true);
      expect(intel.followUpDisposition?.some((key) => key.includes("dispReturn") || key.includes("dispUrgent"))).toBe(
        true
      );
      expect(intel.mdmAdmitObserveDischarge?.length).toBeGreaterThanOrEqual(3);
      expect(intel.mdmClinicalRationale?.some((key) => key.includes("reasoning"))).toBe(true);
      expect(intel.clinicalImpression?.length).toBeGreaterThan(0);
      expect(intel.mdmRiskStratification?.length).toBeGreaterThan(0);
    }
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: RESPIRATORY_SORE_THROAT_ID });
    expect(next.activeTemplateId).toBe(RESPIRATORY_SORE_THROAT_ID);
    expect(next.hpi).toBe("");

    const fragmentKey = `${RESPIRATORY_INTEL}.diffStreptococcalPharyngitis`;
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveSoreThroatRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");
  });

  it("does not regress UTI or sinus symptoms governance", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const sinusVisible = collectSinusSymptomsVisibleStickyNoteFragmentKeys({
      templateId: "sinus_symptoms_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(sinusVisible.has("providerDocumentationComplaintIntel.sinusSymptomsComplaintV1.diffAcuteBacterialSinusitis")).toBe(
      true
    );
  });

  it("reinforces full MDM stack on both sore throat complaint intelligence bundles", () => {
    for (const intel of [SORE_THROAT_COMPLAINT_V1_INTEL, SORE_THROAT_INFECTIOUS_COMPLAINT_V1_INTEL]) {
      expect(intel.mdmWorkingAssessment?.length).toBeGreaterThanOrEqual(3);
      expect(intel.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(15);
      expect(intel.mdmDataReviewed?.length).toBeGreaterThanOrEqual(5);
      expect(intel.mdmRiskStratification?.length).toBeGreaterThan(0);
      expect(intel.mdmClinicalRationale?.length).toBeGreaterThan(0);
      expect(intel.clinicalImpression?.length).toBeGreaterThan(0);
      expect(intel.mdmPlanSummary?.length).toBeGreaterThan(0);
      expect(intel.reassessment?.length).toBeGreaterThan(0);
      expect(intel.mdmAdmitObserveDischarge?.length).toBeGreaterThan(0);
      expect(intel.followUpDisposition?.length).toBeGreaterThan(0);
    }
  });
});
