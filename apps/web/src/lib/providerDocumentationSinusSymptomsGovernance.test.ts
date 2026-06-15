import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectSinusSymptomsVisibleStickyNoteFragmentKeys,
  filterSinusSymptomsMdmTemplateOptionsForTemplate,
  resolveSinusSymptomsExamChipGroupsForTemplate,
  resolveSinusSymptomsRosChipGroupsForTemplate,
  SINUS_SYMPTOMS_ALLOWED_EXAM_SECTION_IDS,
  SINUS_SYMPTOMS_GOVERNED_TEMPLATE_IDS,
  templateUsesSinusSymptomsStickyNoteGovernance,
} from "@/lib/providerDocumentationSinusSymptomsGovernance";
import { collectEarPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationEarPainGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";
import { SINUS_SYMPTOMS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

const SINUS_TEMPLATE_ID = "sinus_symptoms_complaint_v1" as const;
const INTEL = "providerDocumentationComplaintIntel.sinusSymptomsComplaintV1";

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

describe("providerDocumentationSinusSymptomsGovernance — MEDUI.ED.ME.2S", () => {
  it("governs all discovered sinus symptoms template IDs in catalog", () => {
    expect(SINUS_SYMPTOMS_GOVERNED_TEMPLATE_IDS).toEqual(["sinus_symptoms_complaint_v1"]);
    for (const templateId of SINUS_SYMPTOMS_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesSinusSymptomsStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes sinus pain, congestion, drainage, and orbital complication complaint-intel chips", () => {
    const visible = collectSinusSymptomsVisibleStickyNoteFragmentKeys({
      templateId: SINUS_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has(`${INTEL}.hpiFacialPressure`)).toBe(true);
    expect(visible.has(`${INTEL}.hpiMaxillaryPain`)).toBe(true);
    expect(visible.has(`${INTEL}.hpiFrontalPain`)).toBe(true);
    expect(visible.has(`${INTEL}.rosCongestion`)).toBe(true);
    expect(visible.has(`${INTEL}.rosPostNasalDrip`)).toBe(true);
    expect(visible.has(`${INTEL}.hpiPostNasalDrainage`)).toBe(true);
    expect(visible.has(`${INTEL}.rfPeriorbitalSwelling`)).toBe(true);
    expect(visible.has(`${INTEL}.rfVisionChange`)).toBe(true);
    expect(visible.has(`${INTEL}.examPeriorbitalSwelling`)).toBe(true);
    expect(visible.has(`${INTEL}.examMaxillarySinusTenderness`)).toBe(true);
  });

  it("includes reinforced cannot-miss differential and disposition chips", () => {
    const visible = collectSinusSymptomsVisibleStickyNoteFragmentKeys({
      templateId: SINUS_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has(`${INTEL}.diffOrbitalCellulitis`)).toBe(true);
    expect(visible.has(`${INTEL}.diffPeriorbitalCellulitis`)).toBe(true);
    expect(visible.has(`${INTEL}.diffIntracranialExtension`)).toBe(true);
    expect(visible.has(`${INTEL}.diffCavernousSinusThrombosis`)).toBe(true);
    expect(visible.has(`${INTEL}.diffInvasiveFungalSinusitis`)).toBe(true);
    expect(visible.has(`${INTEL}.diffSepsis`)).toBe(true);
    expect(visible.has(`${INTEL}.diffMeningitis`)).toBe(true);
    expect(visible.has(`${INTEL}.mdmCtSinusReviewed`)).toBe(true);
    expect(visible.has(`${INTEL}.impAcuteBacterialSinusitis`)).toBe(true);
    expect(visible.has(`${INTEL}.riskLowSuspicionOrbitalSpread`)).toBe(true);
    expect(visible.has(`${INTEL}.dispUrgentEntFollowUp`)).toBe(true);
  });

  it("hides chest pain, UTI, pelvic, primary headache, vertigo, dental, and trauma wrong-domain chips", () => {
    const visible = collectSinusSymptomsVisibleStickyNoteFragmentKeys({
      templateId: SINUS_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocDizziness")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffAcuteOtitisMedia")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.fall.hpiMechanicalFall")).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveSinusSymptomsRosChipGroupsForTemplate(SINUS_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posDizziness");
    expect(rosKeys).not.toContain("erMseRosChips.posSyncope");
    expect(rosKeys).toContain("erMseRosChips.rfAlteredMs");
    expect(rosKeys).toContain("erMseRosChips.posFever");
  });

  it("restricts exam sections to sinus-relevant sections including neuroPsych for complication concerns", () => {
    const examSectionIds = resolveSinusSymptomsExamChipGroupsForTemplate(
      SINUS_TEMPLATE_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...SINUS_SYMPTOMS_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("skin");

    const examKeys = flattenFragmentKeys(
      resolveSinusSymptomsExamChipGroupsForTemplate(SINUS_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).toContain("erMseExamChips.neuroAlertOriented");
    expect(examKeys).not.toContain("erMseExamChips.respClearBs");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
  });

  it("keeps infectious MDM while hiding EKG and wrong-domain pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === SINUS_TEMPLATE_ID) ?? null;
    const mdmKeys = filterSinusSymptomsMdmTemplateOptionsForTemplate(
      SINUS_TEMPLATE_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.waUndifferentiated");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys).toContain("erMseMdmChips.planMeds");
    expect(mdmKeys).toContain("erMseMdmChips.planReassess");
    expect(mdmKeys.some((key) => key.includes("sinusSymptomsComplaintV1"))).toBe(true);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(mdmKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.waNeurologic");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: SINUS_TEMPLATE_ID });
    expect(next.activeTemplateId).toBe(SINUS_TEMPLATE_ID);
    expect(next.hpi).toBe("");
    expect(next.physicalExam.heent).toBe("");

    const fragmentKey = `${INTEL}.diffAcuteBacterialSinusitis`;
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveSinusSymptomsRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveSinusSymptomsExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress UTI or ear pain governance", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const earVisible = collectEarPainVisibleStickyNoteFragmentKeys({
      templateId: "ear_pain_otitis_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(earVisible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffAcuteOtitisMedia")).toBe(true);
  });

  it("reinforces full MDM stack on sinus symptoms complaint intelligence", () => {
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmWorkingAssessment?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(15);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmDataReviewed?.length).toBeGreaterThanOrEqual(5);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmRiskStratification?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmClinicalRationale?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.clinicalImpression?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmPlanSummary?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.reassessment?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.mdmAdmitObserveDischarge?.length).toBeGreaterThan(0);
    expect(SINUS_SYMPTOMS_COMPLAINT_V1_INTEL.followUpDisposition?.length).toBeGreaterThan(0);
  });
});
