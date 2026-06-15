import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  ADULT_FEVER_GOVERNED_TEMPLATE_IDS,
  collectAdultFeverVisibleStickyNoteFragmentKeys,
  resolveAdultFeverExamChipGroupsForTemplate,
  resolveAdultFeverRosChipGroupsForTemplate,
  templateUsesAdultFeverStickyNoteGovernance,
} from "@/lib/providerDocumentationAdultFeverGovernance";
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
    sectionId: "cardiovascular",
    chips: ["cardioRrr", "cardioTachycardic"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "respiratory",
    chips: ["respWheezing", "respClearBs"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "heent",
    chips: ["heentOropharynxClear", "heentDryMm"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "abdomen",
    chips: ["abdSoft", "abdTendernessPresent", "abdGuarding"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "skin",
    chips: ["skinWarmDry", "skinRashPresent", "skinLacerationPresent"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locLimbPain",
      "qualPressureLike",
      "timExertional",
      "assocDiaphoresis",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationAdultFeverGovernance — MEDUI.ED.ME.2G", () => {
  it("identifies adult fever templates and excludes pediatric fever", () => {
    expect(ADULT_FEVER_GOVERNED_TEMPLATE_IDS).toEqual(["fever_complaint_v1"]);
    expect(templateUsesAdultFeverStickyNoteGovernance("fever_complaint_v1")).toBe(true);
    expect(templateUsesAdultFeverStickyNoteGovernance("fever")).toBe(false);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === "fever_complaint_v1")).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === "fever")).toBe(true);
  });

  it("exposes fever, source-identification, exposure, and immunocompromised chips", () => {
    const visible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.hpiDurationTmaxAntipyretics")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.rosFever")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.hpiCoughSoreThroatUri")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.hpiUrinaryAbdominalRash")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.hpiImmunocompromisedTravelContacts")).toBe(
      true
    );
    expect(visible.has("erMseRosChips.posFever")).toBe(true);
    expect(visible.has("erMseRosChips.posCough")).toBe(true);
    expect(visible.has("erMseRosChips.posVomiting")).toBe(true);
  });

  it("filters trauma, toxicology, ACS, and unrelated specialty chips", () => {
    const rosKeys = flattenFragmentKeys(
      resolveAdultFeverRosChipGroupsForTemplate("fever_complaint_v1", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.rfNeuroDeficit");
    expect(rosKeys).not.toContain("erMseRosChips.rfBleeding");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).toContain("erMseRosChips.rfAlteredMs");

    const visible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("erMseHpiChips.timExertional")).toBe(false);
    expect(visible.has("erMseHpiChips.locLimbPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(true);
    expect(visible.has("erMseHpiChips.locFlankPain")).toBe(true);
  });

  it("exposes febrile, skin infection, abdominal, and meningitis-related exam/MDM chips", () => {
    const examSectionIds = resolveAdultFeverExamChipGroupsForTemplate(
      "fever_complaint_v1",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).toContain("abdomen");
    expect(examSectionIds).toContain("skin");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");

    const visible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseExamChips.abdTendernessPresent")).toBe(true);
    expect(visible.has("erMseExamChips.skinRashPresent")).toBe(true);
    expect(visible.has("erMseExamChips.mskTendernessPresent")).toBe(false);
    expect(visible.has("erMseExamChips.skinLacerationPresent")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.examMentalStatusIfDocumented")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffMeningitisConsideration")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.hpiUrinaryAbdominalRash")).toBe(true);
  });

  it("exposes infectious differentials, sepsis workup, and infection diagnostics without ACS pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fever_complaint_v1") ?? null;
    const mdmKeys = buildMdmTemplateDropdownOptions(template).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");

    const visible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffViralSyndrome")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffPneumonia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffUti")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffCellulitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.diffSepsisConsideration")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.mdmLabsImagingReviewedIfObtained")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.feverComplaintV1.mdmAntipyreticFluidPlanIfGiven")).toBe(
      true
    );
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "fever_complaint_v1" });
    expect(next.activeTemplateId).toBe("fever_complaint_v1");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.skin).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.feverComplaintV1.rosFever";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect pediatric fever or unrelated templates", () => {
    const pediatricRosKeys = flattenFragmentKeys(
      resolveAdultFeverRosChipGroupsForTemplate("fever", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(pediatricRosKeys).toContain("erMseRosChips.posAbdominalPain");

    const chestPainExamSections = resolveAdultFeverExamChipGroupsForTemplate(
      "chest_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(chestPainExamSections).toContain("musculoskeletal");
  });

  it("does not regress prior complaint governance layers", () => {
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
  });
});
