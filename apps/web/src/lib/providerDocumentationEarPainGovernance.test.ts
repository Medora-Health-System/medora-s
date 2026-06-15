import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectEarPainVisibleStickyNoteFragmentKeys,
  EAR_PAIN_ALLOWED_EXAM_SECTION_IDS,
  EAR_PAIN_GOVERNED_TEMPLATE_IDS,
  filterEarPainMdmTemplateOptionsForTemplate,
  resolveEarPainExamChipGroupsForTemplate,
  resolveEarPainRosChipGroupsForTemplate,
  templateUsesEarPainStickyNoteGovernance,
} from "@/lib/providerDocumentationEarPainGovernance";
import { collectDentalOralVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationDentalOralGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";
import { EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

const ADULT_EAR_TEMPLATE_ID = "ear_pain_otitis_complaint_v1" as const;
const PEDIATRIC_EAR_TEMPLATE_ID = "ear_pain" as const;

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

describe("providerDocumentationEarPainGovernance — MEDUI.ED.ME.2R", () => {
  it("governs all discovered ear pain / otitis template IDs in catalog", () => {
    expect(EAR_PAIN_GOVERNED_TEMPLATE_IDS).toEqual(["ear_pain_otitis_complaint_v1", "ear_pain"]);
    for (const templateId of EAR_PAIN_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesEarPainStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes ear pain, otitis, mastoiditis, and foreign body complaint-intel chips", () => {
    const visible = collectEarPainVisibleStickyNoteFragmentKeys({
      templateId: ADULT_EAR_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.rosEarPain")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffAcuteOtitisMedia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffOtitisExterna")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffMastoiditis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffForeignBody")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.examErythematousTympanicMembrane")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.hpiPossibleForeignBody")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.hpiSwimmingExposure")).toBe(true);
  });

  it("includes reinforced cannot-miss differential and disposition chips", () => {
    const visible = collectEarPainVisibleStickyNoteFragmentKeys({
      templateId: ADULT_EAR_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffMalignantOtitisExterna")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffIntracranialExtension")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffSepsis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.mdmCtTemporalBoneReviewed")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.dispAdmission")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.impAcuteOtitisMedia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.riskLowSuspicionMastoiditis")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.dispUrgentEntFollowUp")).toBe(true);
  });

  it("hides chest pain, UTI, pelvic, dental, vertigo, and trauma wrong-domain chips", () => {
    const visible = collectEarPainVisibleStickyNoteFragmentKeys({
      templateId: ADULT_EAR_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocDizziness")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.vertigoComplaintV1.diffBenignParoxysmalPositionalVertigo")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.fall.hpiMechanicalFall")).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveEarPainRosChipGroupsForTemplate(ADULT_EAR_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.posDizziness");
    expect(rosKeys).not.toContain("erMseRosChips.posSyncope");
    expect(rosKeys).toContain("erMseRosChips.rfAlteredMs");
    expect(rosKeys).toContain("erMseRosChips.rfHypotensionConcern");
    expect(rosKeys).toContain("erMseRosChips.posFever");
  });

  it("restricts exam sections to ear-relevant sections including neuroPsych for hearing/mastoid concerns", () => {
    const examSectionIds = resolveEarPainExamChipGroupsForTemplate(
      ADULT_EAR_TEMPLATE_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...EAR_PAIN_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("skin");

    const examKeys = flattenFragmentKeys(
      resolveEarPainExamChipGroupsForTemplate(ADULT_EAR_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).toContain("erMseExamChips.neuroAlertOriented");
    expect(examKeys).not.toContain("erMseExamChips.respClearBs");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
  });

  it("keeps infectious MDM while hiding EKG and wrong-domain pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === ADULT_EAR_TEMPLATE_ID) ?? null;
    const mdmKeys = filterEarPainMdmTemplateOptionsForTemplate(
      ADULT_EAR_TEMPLATE_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.waUndifferentiated");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys).toContain("erMseMdmChips.planMeds");
    expect(mdmKeys).toContain("erMseMdmChips.planReassess");
    expect(mdmKeys.some((key) => key.includes("earPainOtitisComplaintV1"))).toBe(true);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(mdmKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.waNeurologic");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("governs pediatric ear_pain with reinforced complaint intelligence", () => {
    const visible = collectEarPainVisibleStickyNoteFragmentKeys({
      templateId: PEDIATRIC_EAR_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChipsPediatric.earPainLaterality")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffAcuteOtitisMedia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffMastoiditis")).toBe(true);
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: ADULT_EAR_TEMPLATE_ID });
    expect(next.activeTemplateId).toBe(ADULT_EAR_TEMPLATE_ID);
    expect(next.hpi).toBe("");
    expect(next.physicalExam.heent).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.earPainOtitisComplaintV1.diffAcuteOtitisMedia";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveEarPainRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveEarPainExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress UTI or dental governance", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const dentalVisible = collectDentalOralVisibleStickyNoteFragmentKeys({
      templateId: "dental_pain_infection_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(dentalVisible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess")).toBe(
      true
    );
  });

  it("reinforces full MDM stack on ear pain complaint intelligence", () => {
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmWorkingAssessment?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmDifferentialSynthesis?.length).toBeGreaterThanOrEqual(14);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmDataReviewed?.length).toBeGreaterThanOrEqual(5);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmRiskStratification?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmClinicalRationale?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.clinicalImpression?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmPlanSummary?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.reassessment?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.mdmAdmitObserveDischarge?.length).toBeGreaterThan(0);
    expect(EAR_PAIN_OTITIS_COMPLAINT_V1_INTEL.followUpDisposition?.length).toBeGreaterThan(0);
  });
});
