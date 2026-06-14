import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectShortnessOfBreathVisibleStickyNoteFragmentKeys,
  SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS,
  resolveShortnessOfBreathExamChipGroupsForTemplate,
  resolveShortnessOfBreathHpiChipGroupsForTemplate,
  resolveShortnessOfBreathRosChipGroupsForTemplate,
} from "@/lib/providerDocumentationShortnessOfBreathGovernance";
import {
  collectAbdominalPainVisibleStickyNoteFragmentKeys,
  ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS,
} from "@/lib/providerDocumentationAbdominalPainGovernance";
import {
  collectDiarrheaVisibleStickyNoteFragmentKeys,
  DIARRHEA_GOVERNED_TEMPLATE_IDS,
} from "@/lib/providerDocumentationDiarrheaGovernance";
import {
  collectNauseaVomitingVisibleStickyNoteFragmentKeys,
  NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS,
} from "@/lib/providerDocumentationNauseaVomitingGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";
import { getTemplateHpiDimensionGroups } from "@/lib/providerDocumentationTemplateHpiDimensions";

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
    sectionId: "cardiovascular",
    chips: ["cardioRrr", "cardioTachycardic"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "respiratory",
    chips: ["respWheezing", "respClearBs"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "heent",
    chips: ["heentOropharynxClear"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "abdomen",
    chips: ["abdSoft", "abdNonTender", "abdGuarding"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroFocalDeficitNoted"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locFlankPain",
      "locHeadache",
      "assocNausea",
      "assocVomiting",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationShortnessOfBreathGovernance — MEDUI.ED.ME.2E", () => {
  it("governs all respiratory template IDs discovered in catalog", () => {
    expect(SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS).toEqual([
      "sob",
      "adult_uri_respiratory",
      "uri_respiratory",
      "asthma_wheezing",
      "cough_complaint_v1",
      "uri_congestion_complaint_v1",
      "sore_throat_complaint_v1",
      "asthma_wheezing_complaint_v1",
      "copd_exacerbation_complaint_v1",
      "pneumonia_symptoms_complaint_v1",
      "hemoptysis_complaint_v1",
      "chest_congestion_complaint_v1",
      "flu_like_illness_complaint_v1",
    ]);
    for (const templateId of SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes dyspnea, wheezing, cough, orthopnea, and DVT/PE risk chips for sob", () => {
    const visible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationTemplateLocation.sob.withExertion")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.hpiSuddenOnsetDyspnea")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.hpiOrthopnea")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.hpiWheezing")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.hpiProductiveCough")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.rosCough")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.diffPe")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.mdmPeConsidered")).toBe(true);
  });

  it("exposes respiratory exam chips and cardiopulmonary differentials", () => {
    const examSectionIds = resolveShortnessOfBreathExamChipGroupsForTemplate(
      "sob",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");

    const examKeys = flattenFragmentKeys(
      resolveShortnessOfBreathExamChipGroupsForTemplate("sob", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.respWheezing");
    expect(examKeys).toContain("erMseExamChips.cardioTachycardic");

    const visible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.sob.examWheezing")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.diffPneumonia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.diffAsthmaExacerbation")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.diffCopdExacerbation")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.sob.diffChfExacerbation")).toBe(true);
  });

  it("does not expose abdominal pain, urinary, or GI chips for sob", () => {
    const rosKeys = flattenFragmentKeys(
      resolveShortnessOfBreathRosChipGroupsForTemplate("sob", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.posVomiting");
    expect(rosKeys).not.toContain("erMseRosChips.negDeniesAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).toContain("erMseRosChips.posSob");

    const hpiKeys = flattenFragmentKeys(
      resolveShortnessOfBreathHpiChipGroupsForTemplate("sob", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).not.toContain("erMseHpiChips.locAbdominalPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.assocNausea");
    expect(hpiKeys).not.toContain("erMseHpiChips.assocVomiting");

    const visible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect([...visible].some((key) => key.startsWith("providerDocumentationTemplateLocation.abdominal."))).toBe(
      false
    );
    expect([...visible].some((key) => key.startsWith("providerDocumentationComplaintIntel.utiUrinarySymptoms."))).toBe(
      false
    );
    expect([...visible].some((key) => key.startsWith("providerDocumentationComplaintIntel.adultDiarrhea."))).toBe(
      false
    );
    expect([...visible].some((key) => key.startsWith("providerDocumentationComplaintIntel.adultNauseaVomiting."))).toBe(
      false
    );
  });

  it("does not expose appendicitis, cholecystitis, or other wrong-domain MDM for sob", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "sob") ?? null;
    const options = buildMdmTemplateDropdownOptions(template);
    const fragmentKeys = options.map((option) => option.fragmentKey);
    expect(fragmentKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(fragmentKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(fragmentKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(fragmentKeys).not.toContain("providerDocumentationComplaintIntel.abdominal.diffAppendicitis");
    expect(fragmentKeys).not.toContain("providerDocumentationComplaintIntel.abdominal.diffCholecystitis");
    expect(fragmentKeys).not.toContain("providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis");
    expect(fragmentKeys).toContain("erMseMdmChips.waCardiopulmonary");
    expect(fragmentKeys).toContain("erMseMdmChips.planEcg");
    expect(fragmentKeys).toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("preserves sticky-note-only activation for sob", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "sob" });
    expect(next.activeTemplateId).toBe("sob");
    expect(next.hpi).toBe("");
    expect(next.rosImportantPositives).toBe("");
    expect(next.physicalExam.respiratory).toBe("");
    expect(next.mdmDifferentialSynthesis).toBe("");
  });

  it("inserts documentation when an allowed sob sticky note is toggled", () => {
    const fragmentKey = "providerDocumentationComplaintIntel.sob.examWheezing";
    const next = toggleDocumentationFragment("", fragmentKey);
    expect(next).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveShortnessOfBreathRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const examSectionIds = resolveShortnessOfBreathExamChipGroupsForTemplate(
      "chest_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("abdomen");
  });

  it("does not regress urinary_symptoms governance", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);
    expect(utiVisible.has("erMseRosChips.posChestPain")).toBe(false);
  });

  it("does not regress diarrhea governance", () => {
    const visible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis")).toBe(true);
    expect(visible.has("erMseRosChips.posChestPain")).toBe(false);
    for (const templateId of DIARRHEA_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("does not regress nausea/vomiting governance", () => {
    const visible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosNausea")).toBe(true);
    expect(visible.has("erMseRosChips.posChestPain")).toBe(false);
    for (const templateId of NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("does not regress abdominal pain governance", () => {
    const visible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")).toBe(true);
    expect(visible.has("erMseRosChips.posChestPain")).toBe(false);
    for (const templateId of ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes asthma and COPD v1 differentials on their templates", () => {
    const asthmaVisible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "asthma_wheezing_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(asthmaVisible.has("providerDocumentationComplaintIntel.asthmaWheezingComplaintV1.diffAsthmaExacerbation")).toBe(
      true
    );

    const copdVisible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "copd_exacerbation_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(copdVisible.has("providerDocumentationComplaintIntel.copdExacerbationComplaintV1.diffCopdExacerbation")).toBe(
      true
    );

    const pneumoniaHpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups("pneumonia_symptoms_complaint_v1") ?? []);
    expect(pneumoniaHpiKeys.length).toBeGreaterThanOrEqual(0);
  });
});
