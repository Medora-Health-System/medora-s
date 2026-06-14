import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectAbdominalPainVisibleStickyNoteFragmentKeys,
  ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS,
  resolveAbdominalPainExamChipGroupsForTemplate,
  resolveAbdominalPainHpiChipGroupsForTemplate,
  resolveAbdominalPainRosChipGroupsForTemplate,
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
    chips: ["heentDryMm"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "timExertional",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationAbdominalPainGovernance — MEDUI.ED.ME.2D", () => {
  it("governs all abdominal pain template IDs discovered in catalog", () => {
    expect(ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS).toEqual([
      "abdominal_pain",
      "abdominal_pain_pediatric",
      "abdominal_pain_complaint_v1",
    ]);
    for (const templateId of ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("does not expose chest pain chips for abdominal_pain", () => {
    const rosKeys = flattenFragmentKeys(
      resolveAbdominalPainRosChipGroupsForTemplate("abdominal_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.negDeniesChestPain");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const visible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseRosChips.posChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect([...visible].some((key) => key.startsWith("providerDocumentationTemplateLocation.chestPain."))).toBe(
      false
    );
  });

  it("does not expose EKG workflow or cardiology MDM for abdominal pain templates", () => {
    for (const templateId of ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
      const options = buildMdmTemplateDropdownOptions(template);
      const fragmentKeys = options.map((option) => option.fragmentKey);
      expect(fragmentKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
      expect(fragmentKeys).not.toContain("erMseMdmChips.planEcg");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waNeurologic");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waTrauma");
    }
  });

  it("exposes abdominal location, guarding, rebound, and surgical differentials", () => {
    const visible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationTemplateLocation.abdominal.rightLowerQuadrant")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.hpiRlqPain")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.examGuarding")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.examReboundTenderness")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.diffCholecystitis")).toBe(true);
  });

  it("exposes GI bleed and pregnancy concern coverage", () => {
    const visible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.diffGiBleed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.rfGiBleedingConcern")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.hpiPregnancyConcern")).toBe(true);
  });

  it("preserves flank and urinary symptom chips clinically relevant to abdominal workup", () => {
    const hpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups("abdominal_pain") ?? []);
    expect(hpiKeys).toContain("providerDocumentationTemplateLocation.abdominal.flank");
    expect(hpiKeys).toContain("providerDocumentationTemplateHpiDimensions.abdominalPain.assocUrinarySymptoms");

    const pediatricHpiKeys = flattenFragmentKeys(
      resolveAbdominalPainHpiChipGroupsForTemplate("abdominal_pain_pediatric", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(pediatricHpiKeys).toContain("erMseHpiChips.locAbdominalPain");
    expect(pediatricHpiKeys).toContain("erMseHpiChips.locFlankPain");
  });

  it("limits global PE sections to general, heent, abdomen, and reassessment", () => {
    const examSectionIds = resolveAbdominalPainExamChipGroupsForTemplate(
      "abdominal_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual(["general", "heent", "abdomen", "reassessment"]);
  });

  it("keeps template activation sticky-note only with no auto-population", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom abdominal history";
    state.mdmDifferentialSynthesis = "existing differential";

    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "abdominal_pain",
      resolveFragment: (key) => key,
    });

    expect(next.activeTemplateId).toBe("abdominal_pain");
    expect(next.hpi).toBe("custom abdominal history");
    expect(next.mdmDifferentialSynthesis).toBe("existing differential");
    expect(next.rosImportantPositives).toBe("");
    expect(next.physicalExam.abdomen).toBe("");
  });

  it("inserts documentation when an allowed abdominal pain sticky note is toggled", () => {
    const fragmentKey = "providerDocumentationComplaintIntel.abdominal.examGuarding";
    const next = toggleDocumentationFragment("", fragmentKey);
    expect(next).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveAbdominalPainRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveAbdominalPainExamChipGroupsForTemplate(
      "chest_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("cardiovascular");
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
});
