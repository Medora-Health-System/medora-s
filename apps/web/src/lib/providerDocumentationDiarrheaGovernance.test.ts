import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectDiarrheaVisibleStickyNoteFragmentKeys,
  DIARRHEA_GOVERNED_TEMPLATE_IDS,
  isDiarrheaDeniedStickyNoteFragment,
  resolveDiarrheaExamChipGroupsForTemplate,
  resolveDiarrheaHpiChipGroupsForTemplate,
  resolveDiarrheaRosChipGroupsForTemplate,
} from "@/lib/providerDocumentationDiarrheaGovernance";
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
      "locFlankPain",
      "timExertional",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationDiarrheaGovernance — MEDUI.ED.ME.2B", () => {
  it("governs all diarrhea template IDs in the family", () => {
    expect(DIARRHEA_GOVERNED_TEMPLATE_IDS).toEqual(["adult_diarrhea", "diarrhea", "diarrhea_complaint_v1"]);
    for (const templateId of DIARRHEA_GOVERNED_TEMPLATE_IDS) {
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("does not expose chest pain location chips for adult_diarrhea", () => {
    const hpiKeys = flattenFragmentKeys(
      resolveDiarrheaHpiChipGroupsForTemplate("adult_diarrhea", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys.some((key) => key.includes("chestPain"))).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveDiarrheaRosChipGroupsForTemplate("adult_diarrhea", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
  });

  it("does not expose cardiac radiation or exertional chips for pediatric diarrhea", () => {
    const hpiKeys = flattenFragmentKeys(
      resolveDiarrheaHpiChipGroupsForTemplate("diarrhea", WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.timExertional");
    expect(hpiKeys.some((key) => key.includes("radiatingTo"))).toBe(false);
  });

  it("does not expose EKG high-value MDM option for diarrhea templates", () => {
    for (const templateId of DIARRHEA_GOVERNED_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
      const options = buildMdmTemplateDropdownOptions(template);
      const fragmentKeys = options.map((option) => option.fragmentKey);
      expect(fragmentKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
      expect(fragmentKeys).not.toContain("erMseMdmChips.planEcg");
      expect(fragmentKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    }
  });

  it("exposes stool frequency, duration, bloody stool, and mucus coverage", () => {
    const adultVisible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiStoolFrequencyReviewed")).toBe(true);
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiDiarrheaDurationReviewed")).toBe(true);
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiBloodyDiarrheaReviewed")).toBe(true);

    const v1Visible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "diarrhea_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(v1Visible.has("providerDocumentationComplaintIntel.diarrheaComplaintV1.hpiBloodMucusTravel")).toBe(true);
  });

  it("exposes travel, food exposure, sick contacts, and C. difficile risk", () => {
    const visible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiRecentTravelReviewed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiFoodExposureReviewed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiSickContactsReviewed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiRecentAntibioticsReviewed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.rfCDifficileConcern")).toBe(true);
  });

  it("exposes dehydration, oral intake, and urine output coverage", () => {
    const adultVisible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.hpiHydrationOralIntakeReviewed")).toBe(true);
    expect(adultVisible.has("providerDocumentationComplaintIntel.adultDiarrhea.diffDehydration")).toBe(true);

    const pediatricVisible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(pediatricVisible.has("providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiUrineOutputReviewed")).toBe(
      true
    );
    expect(pediatricVisible.has("providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiOralIntakeReviewed")).toBe(
      true
    );
  });

  it("exposes hydration exam and no peritoneal sign chips", () => {
    const visible = collectDiarrheaVisibleStickyNoteFragmentKeys({
      templateId: "adult_diarrhea",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.examDryMucousMembranes")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.examNoGuarding")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.examNoReboundTenderness")).toBe(true);

    const examSectionIds = resolveDiarrheaExamChipGroupsForTemplate(
      "adult_diarrhea",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("abdomen");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("respiratory");
  });

  it("exposes gastroenteritis, C. difficile, and dehydration MDM chips", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_diarrhea") ?? null;
    const options = buildMdmTemplateDropdownOptions(template);
    const fragmentKeys = options.map((option) => option.fragmentKey);
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultDiarrhea.diffCDifficileColitis");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultDiarrhea.diffDehydration");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultDiarrhea.mdmStoolTestingConsideredBasedOnRisk");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.adultDiarrhea.mdmIvFluidsConsideredAdministered");
  });

  it("keeps template activation sticky-note only with no auto-population", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom diarrhea history";
    state.mdmDifferentialSynthesis = "existing differential";

    const next = applyProviderDocumentationTemplate({
      state,
      templateId: "adult_diarrhea",
      resolveFragment: (key) => key,
    });

    expect(next.activeTemplateId).toBe("adult_diarrhea");
    expect(next.hpi).toBe("custom diarrhea history");
    expect(next.mdmDifferentialSynthesis).toBe("existing differential");
    expect(next.rosImportantPositives).toBe("");
    expect(next.physicalExam.abdomen).toBe("");
  });

  it("inserts documentation when an allowed diarrhea sticky note is toggled", () => {
    const fragmentKey = "providerDocumentationComplaintIntel.adultDiarrhea.hpiStoolFrequencyReviewed";
    const next = toggleDocumentationFragment("", fragmentKey);
    expect(next).toContain(fragmentKey);
    expect(isDiarrheaDeniedStickyNoteFragment(fragmentKey)).toBe(false);
  });

  it("does not affect non-diarrhea templates", () => {
    const rosKeys = flattenFragmentKeys(resolveDiarrheaRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveDiarrheaExamChipGroupsForTemplate("chest_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("cardiovascular");
  });

  it("does not regress urinary_symptoms governance", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);
    expect([...utiVisible].some((key) => key.includes("ChestPain") || key.includes("chestPain"))).toBe(false);

    const utiTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "urinary_symptoms") ?? null;
    const utiMdm = buildMdmTemplateDropdownOptions(utiTemplate).map((option) => option.fragmentKey);
    expect(utiMdm).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
    expect(utiMdm).toContain("providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis");
  });
});
