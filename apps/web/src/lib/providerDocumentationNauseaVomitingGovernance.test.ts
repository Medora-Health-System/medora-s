import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import { getTemplateHpiDimensionGroups } from "@/lib/providerDocumentationTemplateHpiDimensions";
import {
  collectDiarrheaVisibleStickyNoteFragmentKeys,
  DIARRHEA_GOVERNED_TEMPLATE_IDS,
} from "@/lib/providerDocumentationDiarrheaGovernance";
import {
  collectNauseaVomitingVisibleStickyNoteFragmentKeys,
  NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS,
  resolveNauseaVomitingExamChipGroupsForTemplate,
  resolveNauseaVomitingHpiChipGroupsForTemplate,
  resolveNauseaVomitingRosChipGroupsForTemplate,
} from "@/lib/providerDocumentationNauseaVomitingGovernance";
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
    sectionId: "cardiovascular",
    chips: ["cardioRrr", "cardioTachycardic"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "respiratory",
    chips: ["respWheezing", "respClearBs"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "heent",
    chips: ["heentDryMm", "heentPerrla"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locHeadache",
      "timExertional",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationNauseaVomitingGovernance — MEDUI.ED.ME.2C", () => {
  it("governs all nausea/vomiting template IDs in the family", () => {
    expect(NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS).toEqual([
      "nausea_vomiting",
      "adult_nausea_vomiting",
      "nausea_vomiting_complaint_v1",
      "nausea_vomiting_metabolic_complaint_v1",
    ]);
    for (const templateId of NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("does not expose chest pain chips for adult_nausea_vomiting", () => {
    const rosKeys = flattenFragmentKeys(
      resolveNauseaVomitingRosChipGroupsForTemplate("adult_nausea_vomiting", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.negDeniesChestPain");

    const visible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
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

  it("does not expose cardiac location or exertional chips for pediatric nausea_vomiting", () => {
    const hpiKeys = flattenFragmentKeys(
      resolveNauseaVomitingHpiChipGroupsForTemplate("nausea_vomiting", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.timExertional");

    const customHpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups("adult_nausea_vomiting") ?? []);
    expect(customHpiKeys.some((key) => key.includes("chestPain"))).toBe(false);
  });

  it("does not expose EKG high-value MDM option for nausea/vomiting templates", () => {
    for (const templateId of NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
      const options = buildMdmTemplateDropdownOptions(template);
      const fragmentKeys = options.map((option) => option.fragmentKey);
      expect(fragmentKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
      expect(fragmentKeys).not.toContain("erMseMdmChips.planEcg");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    }
  });

  it("exposes nausea, vomiting, PO intolerance, dehydration, and pregnancy concern chips", () => {
    const visible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosNausea")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosVomiting")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.hpiInabilityToToleratePo")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.diffDehydration")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.hpiPregnancyConcernReviewed")).toBe(true);
  });

  it("exposes hematemesis and bilious emesis coverage", () => {
    const adultVisible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosDeniesHematemesis")).toBe(true);
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.rosDeniesBiliousEmesis")).toBe(true);

    const pediatricVisible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(
      pediatricVisible.has("providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiBiliousEmesisReviewed")
    ).toBe(true);
  });

  it("exposes hydration and abdominal exam chips without wrong-domain global PE groups", () => {
    const visible = collectNauseaVomitingVisibleStickyNoteFragmentKeys({
      templateId: "adult_nausea_vomiting",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.examDryMucousMembranes")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.examEpigastricTenderness")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.examNoGuarding")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultNauseaVomiting.examNoReboundTenderness")).toBe(true);

    const examSectionIds = resolveNauseaVomitingExamChipGroupsForTemplate(
      "adult_nausea_vomiting",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual(["general", "heent", "abdomen", "reassessment"]);
  });

  it("exposes gastroenteritis, hyperemesis gravidarum, and cannabinoid hyperemesis MDM chips", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_nausea_vomiting") ?? null;
    const options = buildMdmTemplateDropdownOptions(template);
    const fragmentKeys = options.map((option) => option.fragmentKey);
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultNauseaVomiting.diffViralGastroenteritis");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultNauseaVomiting.diffHyperemesisGravidarum");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultNauseaVomiting.diffCannabinoidHyperemesis");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultNauseaVomiting.mdmPoChallengePerformed");
    expect(fragmentKeys).toContain(
      "providerDocumentationComplaintIntel.adultNauseaVomiting.mdmAntiemeticTherapyAdministeredConsidered"
    );
    expect(fragmentKeys).toContain(
      "providerDocumentationComplaintIntel.adultNauseaVomiting.mdmIvFluidsAdministeredConsidered"
    );
  });

  it("keeps template activation sticky-note only with no auto-population", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom nausea history";
    state.mdmDifferentialSynthesis = "existing differential";

    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "adult_nausea_vomiting",
      resolveFragment: (key) => key,
    });

    expect(next.activeTemplateId).toBe("adult_nausea_vomiting");
    expect(next.hpi).toBe("custom nausea history");
    expect(next.mdmDifferentialSynthesis).toBe("existing differential");
    expect(next.rosImportantPositives).toBe("");
    expect(next.physicalExam.abdomen).toBe("");
  });

  it("inserts documentation when an allowed nausea/vomiting sticky note is toggled", () => {
    const fragmentKey = "providerDocumentationComplaintIntel.adultNauseaVomiting.rosNausea";
    const next = toggleDocumentationFragment("", fragmentKey);
    expect(next).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveNauseaVomitingRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveNauseaVomitingExamChipGroupsForTemplate(
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
    expect([...utiVisible].some((key) => key.includes("ChestPain") || key.includes("chestPain"))).toBe(false);
  });

  it("does not regress diarrhea governance", () => {
    for (const templateId of DIARRHEA_GOVERNED_TEMPLATE_IDS) {
      const visible = collectDiarrheaVisibleStickyNoteFragmentKeys({
        templateId,
        rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
        examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
        hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
      });
      expect([...visible].some((key) => key.includes("ChestPain") || key.includes("chestPain"))).toBe(false);
    }
    const adultDiarrheaVisible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(adultDiarrheaVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis")).toBe(
      true
    );
  });
});
