import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectFemalePelvicGynVisibleStickyNoteFragmentKeys,
  FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS,
  resolveFemalePelvicGynExamChipGroupsForTemplate,
  resolveFemalePelvicGynRosChipGroupsForTemplate,
  templateUsesFemalePelvicGynStickyNoteGovernance,
} from "@/lib/providerDocumentationFemalePelvicGynGovernance";
import { collectBackPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationBackPainGovernance";
import { collectAdultFeverVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationAdultFeverGovernance";
import { collectCoughUriVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationCoughUriGovernance";
import { collectShortnessOfBreathVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationShortnessOfBreathGovernance";
import { collectAbdominalPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationAbdominalPainGovernance";
import { collectDiarrheaVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationDiarrheaGovernance";
import { collectNauseaVomitingVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationNauseaVomitingGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";

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
    chips: ["heentOropharynxClear"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
    chips: ["skinRashPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent", "mskRomNormal"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroFollowsCommands", "neuroFocalDeficitNoted"].map((key) => ({
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
      "locAbdominalPain",
      "locBackPain",
      "locFlankPain",
      "assocNausea",
      "assocVomiting",
      "assocSob",
      "qualPressureLike",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationFemalePelvicGynGovernance — MEDUI.ED.ME.2I", () => {
  it("governs all female pelvic/GYN template IDs discovered in catalog", () => {
    expect(FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS).toEqual([
      "female_pelvic_gyn_complaint",
      "pelvic_pain_complaint_v1",
      "vaginal_bleeding_complaint_v1",
      "vaginal_discharge_complaint_v1",
    ]);
    for (const templateId of FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesFemalePelvicGynStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters chest pain, SOB/URI, back pain, and unrelated specialty chips", () => {
    const rosKeys = flattenFragmentKeys(
      resolveFemalePelvicGynRosChipGroupsForTemplate("female_pelvic_gyn_complaint", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.rfRespDistress");
    expect(rosKeys).not.toContain("erMseRosChips.rfNeuroDeficit");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).toContain("erMseRosChips.rfHypotensionConcern");

    const visible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "female_pelvic_gyn_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(true);
    expect(
      visible.has("providerDocumentationTemplateHpiDimensions.femalePelvicGynComplaint.locBackFlankIfRelevant")
    ).toBe(true);
  });

  it("exposes pelvic pain, bleeding, discharge, pregnancy, and STI/PID chips", () => {
    const compositeVisible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "female_pelvic_gyn_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(
      true
    );
    expect(
      compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiVaginalBleeding")
    ).toBe(true);
    expect(
      compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiVaginalDischarge")
    ).toBe(true);
    expect(
      compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPregnancyConcern")
    ).toBe(true);
    expect(compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiLastMenstrualPeriodDocumented")).toBe(
      true
    );
    expect(compositeVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiStiExposure")).toBe(
      true
    );

    const pelvicVisible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "pelvic_pain_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(pelvicVisible.has("providerDocumentationComplaintIntel.pelvicPainComplaintV1.rosPelvicPain")).toBe(true);

    const bleedingVisible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "vaginal_bleeding_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(
      bleedingVisible.has("providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.rosVaginalBleeding")
    ).toBe(true);

    const dischargeVisible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "vaginal_discharge_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(
      dischargeVisible.has("providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.rosVaginalDischarge")
    ).toBe(true);
  });

  it("exposes ectopic, ovarian torsion, and PID/STI differentials with pregnancy testing and pelvic ultrasound MDM", () => {
    const compositeTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "female_pelvic_gyn_complaint") ?? null;
    const compositeMdm = buildMdmTemplateDropdownOptions(compositeTemplate).map((option) => option.fragmentKey);
    expect(compositeMdm).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy"
    );
    expect(compositeMdm).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffOvarianTorsion"
    );
    expect(compositeMdm).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffPelvicInflammatoryDisease"
    );
    expect(compositeMdm).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.mdmPregnancyTestReviewed"
    );
    expect(compositeMdm).toContain(
      "providerDocumentationComplaintIntel.femalePelvicGynComplaint.mdmPelvicUltrasoundReviewed"
    );
    expect(compositeMdm).not.toContain("erMseMdmChips.planEcg");
    expect(compositeMdm).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
    expect(compositeMdm).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(compositeMdm).not.toContain("erMseMdmChips.waTrauma");

    const pelvicTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "pelvic_pain_complaint_v1") ?? null;
    const pelvicMdm = buildMdmTemplateDropdownOptions(pelvicTemplate).map((option) => option.fragmentKey);
    expect(pelvicMdm).toContain("providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffEctopicPregnancy");
    expect(pelvicMdm).toContain("providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffOvarianTorsion");
    expect(pelvicMdm).toContain("providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffPelvicInflammatoryDisease");

    const dischargeTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "vaginal_discharge_complaint_v1") ?? null;
    const dischargeMdm = buildMdmTemplateDropdownOptions(dischargeTemplate).map((option) => option.fragmentKey);
    expect(dischargeMdm).toContain("providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.diffPelvicInflammatoryDisease");
    expect(dischargeMdm).toContain("providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.diffVaginitis");
  });

  it("limits exam sections to general, abdomen, skin, and reassessment with pelvic exam chips via complaint intelligence", () => {
    const examSectionIds = resolveFemalePelvicGynExamChipGroupsForTemplate(
      "female_pelvic_gyn_complaint",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("abdomen");
    expect(examSectionIds).toContain("skin");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("heent");
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");

    const visible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "female_pelvic_gyn_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseExamChips.abdTendernessPresent")).toBe(true);
    expect(
      visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.examCervicalMotionTendernessPresent")
    ).toBe(true);
    expect(
      visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.examPelvicExamPerformedWithChaperone")
    ).toBe(true);
    expect(visible.has("erMseExamChips.mskTendernessPresent")).toBe(false);
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "female_pelvic_gyn_complaint" });
    expect(next.activeTemplateId).toBe("female_pelvic_gyn_complaint");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.abdomen).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveFemalePelvicGynRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveFemalePelvicGynExamChipGroupsForTemplate(
      "testicular_pain_complaint_v1",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("musculoskeletal");
  });

  it("does not regress prior governance families", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const diarrheaVisible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(diarrheaVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis")).toBe(true);

    const nauseaVisible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(nauseaVisible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosNausea")).toBe(true);

    const abdominalVisible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(abdominalVisible.has("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")).toBe(true);

    const sobVisible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffPulmonaryEmbolism")).toBe(true);

    const coughUriVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "adult_uri_respiratory",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(coughUriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(true);

    const feverVisible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(feverVisible.has("providerDocumentationComplaintIntel.feverComplaintV1.rosFever")).toBe(true);

    const backPainVisible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(backPainVisible.has("providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy")).toBe(true);
  });
});
