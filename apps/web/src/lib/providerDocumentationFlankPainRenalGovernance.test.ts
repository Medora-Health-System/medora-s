import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectFlankPainRenalVisibleStickyNoteFragmentKeys,
  FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS,
  resolveFlankPainRenalExamChipGroupsForTemplate,
  resolveFlankPainRenalHpiChipGroupsForTemplate,
  resolveFlankPainRenalRosChipGroupsForTemplate,
} from "@/lib/providerDocumentationFlankPainRenalGovernance";
import { getTemplateHpiDimensionGroups } from "@/lib/providerDocumentationTemplateHpiDimensions";

const WORKSPACE_ROS_CHIP_GROUPS = [
  {
    field: "rosImportantPositives" as const,
    chips: ["posSob", "posChestPain", "posAbdominalPain", "posFever", "posVomiting", "posHeadache"].map(
      (key) => ({ fragmentKey: `erMseRosChips.${key}` })
    ),
  },
  {
    field: "rosImportantNegatives" as const,
    chips: ["negDeniesChestPain", "negDeniesSob", "negDeniesAbdominalPain", "negDeniesHeadache"].map(
      (key) => ({ fragmentKey: `erMseRosChips.${key}` })
    ),
  },
];

const WORKSPACE_EXAM_CHIP_GROUPS = [
  { sectionId: "general", chips: [{ fragmentKey: "erMseExamChips.genAlert" }] },
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
    chips: ["abdSoft", "abdGuarding"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "msk",
    chips: ["mskTendernessPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
];

const WORKSPACE_HPI_CHIP_GROUPS = [
  {
    titleKey: "providerDocumentationWorkspace.chipLocation",
    field: "hpi" as const,
    chips: ["locChestPain", "locAbdominalPain", "locFlankPain", "locHeadache", "timExertional"].map((key) => ({
      labelKey: `erMseHpiChips.${key}`,
      fragmentKey: `erMseHpiChips.${key}`,
    })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationFlankPainRenalGovernance — MEDUI.ED.ME.2PB-R", () => {
  it("governs all flank / renal colic template IDs", () => {
    expect(FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS).toEqual([
      "flank_pain",
      "flank_pain_renal_complaint_v1",
      "flank_pain_complaint_v1",
    ]);
    for (const templateId of FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("denies chest pain, SOB, headache, and MSK-primary pathways for flank_pain", () => {
    const rosKeys = flattenFragmentKeys(
      resolveFlankPainRenalRosChipGroupsForTemplate("flank_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const examSectionIds = resolveFlankPainRenalExamChipGroupsForTemplate(
      "flank_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).not.toContain("msk");
    expect(examSectionIds).toContain("abdomen");

    const hpiKeys = flattenFragmentKeys(
      resolveFlankPainRenalHpiChipGroupsForTemplate("flank_pain", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.timExertional");
    const templateHpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups("flank_pain") ?? []);
    expect(templateHpiKeys.some((key) => key.includes("providerDocumentationTemplateHpiDimensions.flankPain"))).toBe(
      true
    );
  });

  it("exposes renal colic intelligence and cannot-miss differentials", () => {
    const visible = collectFlankPainRenalVisibleStickyNoteFragmentKeys({
      templateId: "flank_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.flankPain.diffRenalColic")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.flankPain.diffInfectedObstructingStone")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.flankPain.examRightCvaTenderness")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.flankPain.rfObstructingStoneConcern")).toBe(true);
  });

  it("preserves abdominal and urinary overlap clinically relevant to flank workup", () => {
    const templateHpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups("flank_pain") ?? []);
    expect(templateHpiKeys).toContain("providerDocumentationTemplateHpiDimensions.flankPain.assocDysuria");
    expect(templateHpiKeys).toContain("providerDocumentationTemplateHpiDimensions.flankPain.assocHematuria");

    const visible = collectFlankPainRenalVisibleStickyNoteFragmentKeys({
      templateId: "flank_pain_renal_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.flankPainRenalComplaintV1.hpiDeniesUrinaryRetention")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.flankPainRenalComplaintV1.hpiTesticularPain")).toBe(true);
  });

  it("does not expose EKG workflow for flank templates", () => {
    for (const templateId of FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
      const options = buildMdmTemplateDropdownOptions(template);
      const fragmentKeys = options.map((option) => option.fragmentKey);
      expect(fragmentKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
      expect(fragmentKeys).not.toContain("erMseMdmChips.planEcg");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    }
  });

  it("keeps template activation sticky-note only with no auto-population", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom flank history";

    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "flank_pain",
      resolveFragment: (key) => key,
    });

    expect(next.activeTemplateId).toBe("flank_pain");
    expect(next.hpi).toBe("custom flank history");
    expect(next.rosImportantPositives).toBe("");
  });
});
