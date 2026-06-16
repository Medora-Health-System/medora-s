import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import { getTemplateHpiDimensionGroups } from "@/lib/providerDocumentationTemplateHpiDimensions";
import {
  collectUrinarySymptomsVisibleStickyNoteFragmentKeys,
  isUrinarySymptomsDeniedStickyNoteFragment,
  resolveExamChipGroupsForTemplate,
  resolveRosChipGroupsForTemplate,
  URINARY_SYMPTOMS_DENIED_STICKY_NOTE_FRAGMENT_KEYS,
  URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID,
  URINARY_SYMPTOMS_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS,
} from "@/lib/providerDocumentationUrinarySymptomsGovernance";

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
    sectionId: "abdomen",
    chips: ["abdSoft", "abdNonTender"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroAlertOriented"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  { sectionId: "reassessment", chips: [{ fragmentKey: "erMseMdmChips.planReassess" }] },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationUrinarySymptomsGovernance — MEDUI.ED.ME.2A-R", () => {
  it("does not render chest pain chips when urinary_symptoms is active", () => {
    const rosKeys = flattenFragmentKeys(
      resolveRosChipGroupsForTemplate(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.negDeniesChestPain");

    const visible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect([...visible].some((key) => key.includes("ChestPain") || key.includes("chestPain"))).toBe(false);
  });

  it("does not render cardiac location chips when urinary_symptoms is active", () => {
    const hpiKeys = flattenFragmentKeys(getTemplateHpiDimensionGroups(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID) ?? []);
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys.some((key) => key.includes("chestPain"))).toBe(false);

    const examKeys = flattenFragmentKeys(
      resolveExamChipGroupsForTemplate(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys.some((key) => key.startsWith("erMseExamChips.cardio"))).toBe(false);
  });

  it("renders required GU HPI / ROS / PE / MDM sticky notes", () => {
    const visible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });

    for (const fragmentKey of URINARY_SYMPTOMS_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS) {
      expect(visible.has(fragmentKey), fragmentKey).toBe(true);
    }

    expect(visible.has("providerDocumentationTemplateHpiDimensions.urinarySymptoms.assocDysuria")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.urinarySymptoms.qualFrequency")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.urinarySymptoms.qualUrgency")).toBe(true);
    expect(visible.has("providerDocumentationWorkspace.stickerExamNoCvaTenderness")).toBe(true);
  });

  it("filters wrong-domain global ROS and PE chips while keeping shared red flags", () => {
    const rosKeys = flattenFragmentKeys(
      resolveRosChipGroupsForTemplate(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posFever");
    expect(rosKeys).toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");

    const examSectionIds = resolveExamChipGroupsForTemplate(
      URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual(["general", "abdomen", "reassessment"]);
  });

  it("filters wrong-domain MDM dropdown chips for urinary_symptoms", () => {
    const template =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID) ?? null;
    const options = buildMdmTemplateDropdownOptions(template);
    const fragmentKeys = options.map((option) => option.fragmentKey);

    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.utiUrinarySymptoms.diffCystitis");
    expect(fragmentKeys).toContain("providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis");
    expect(fragmentKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(fragmentKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(fragmentKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("leaves non-urinary templates on the global chip registry", () => {
    const rosKeys = flattenFragmentKeys(
      resolveRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveExamChipGroupsForTemplate("chest_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("cardiovascular");
  });

  it("keeps template activation sticky-note only with no documentation auto-population", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    state.hpi = "custom uti history";
    state.mdmDifferentialSynthesis = "existing differential";

    const next = applyProviderDocumentationTemplate({
      state,
      templateId: URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID,
      resolveFragment: (key) => key,
    });

    expect(next.activeTemplateId).toBe(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID);
    expect(next.hpi).toBe("custom uti history");
    expect(next.mdmDifferentialSynthesis).toBe("existing differential");
    expect(next.rosImportantPositives).toBe("");
    expect(next.physicalExam.abdomen).toBe("");
  });

  it("blocks every denied sticky-note fragment key for urinary_symptoms governance", () => {
    for (const fragmentKey of URINARY_SYMPTOMS_DENIED_STICKY_NOTE_FRAGMENT_KEYS) {
      expect(isUrinarySymptomsDeniedStickyNoteFragment(fragmentKey), fragmentKey).toBe(true);
    }
  });
});
