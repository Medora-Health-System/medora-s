import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  CHEST_PAIN_GOVERNED_TEMPLATE_IDS,
  collectChestPainVisibleStickyNoteFragmentKeys,
  resolveChestPainExamChipGroupsForTemplate,
  resolveChestPainRosChipGroupsForTemplate,
  templateUsesChestPainStickyNoteGovernance,
} from "@/lib/providerDocumentationChestPainGovernance";
import { collectHeadacheVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationHeadacheGovernance";
import { collectRashVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationRashGovernance";
import { collectFemalePelvicGynVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationFemalePelvicGynGovernance";
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
    chips: ["cardioRrr", "cardioTachycardic", "cardioNoMurmur"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  {
    sectionId: "respiratory",
    chips: ["respWheezing", "respClearBs", "respCrackles"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
    chips: ["mskTendernessPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroFollowsCommands"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locHeadache",
      "locFlankPain",
      "assocSob",
      "assocDiaphoresis",
      "assocNausea",
      "qualPressureLike",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationChestPainGovernance — MEDUI.ED.ME.2L", () => {
  it("governs all chest pain template IDs discovered in catalog", () => {
    expect(CHEST_PAIN_GOVERNED_TEMPLATE_IDS).toEqual(["chest_pain"]);
    for (const templateId of CHEST_PAIN_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesChestPainStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters UTI, abdominal, GYN, rash, back pain, URI, and headache chips", () => {
    const rosKeys = flattenFragmentKeys(resolveChestPainRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.posChestPain");
    expect(rosKeys).toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");

    const visible = collectChestPainVisibleStickyNoteFragmentKeys({
      templateId: "chest_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locHeadache")).toBe(false);
    expect(visible.has("erMseHpiChips.locFlankPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiRashOnsetReviewed")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.headache.hpiSuddenOnsetHeadache")).toBe(false);
  });

  it("exposes ACS, PE, chest pain characterization, and cardiopulmonary exam chips", () => {
    const visible = collectChestPainVisibleStickyNoteFragmentKeys({
      templateId: "chest_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(true);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(true);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.chestPain.assocDiaphoresis")).toBe(true);
    expect(visible.has("providerDocumentationTemplateLocation.chestPain.midChest")).toBe(true);
    expect(visible.has("providerDocumentationTemplateLocation.chestPain.radiatingToLeftArm")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.chestPain.timExertional")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.hpiWorseningWithExertion")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.hpiPainRadiatesToLeftArm")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.diffStemi")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.diffPulmonaryEmbolism")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.waLowSuspicionPulmonaryEmbolism")).toBe(true);
    expect(visible.has("providerDocumentationWorkspace.stickerExamChestWallTenderness")).toBe(true);
    expect(visible.has("erMseRosChips.rfSyncope")).toBe(true);
    expect(visible.has("erMseRosChips.rfHypotensionConcern")).toBe(true);
  });

  it("limits exam sections to general, cardiovascular, respiratory, and reassessment", () => {
    const examSectionIds = resolveChestPainExamChipGroupsForTemplate("chest_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("skin");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");
    expect(examSectionIds).not.toContain("heent");

    const examKeys = flattenFragmentKeys(
      resolveChestPainExamChipGroupsForTemplate("chest_pain", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.cardioRrr");
    expect(examKeys).toContain("erMseExamChips.respClearBs");
    expect(examKeys).toContain("erMseExamChips.respWheezing");
    expect(examKeys).not.toContain("erMseExamChips.abdSoft");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
  });

  it("keeps EKG, troponin, and cardiopulmonary MDM while removing wrong-domain pathways", () => {
    const chestTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "chest_pain") ?? null;
    const chestMdm = buildMdmTemplateDropdownOptions(chestTemplate).map((option) => option.fragmentKey);
    expect(chestMdm).toContain("erMseMdmChips.waCardiopulmonary");
    expect(chestMdm).toContain("erMseMdmChips.planEcg");
    expect(chestMdm).toContain("providerDocumentationComplaintIntel.chestPain.mdmTroponinReviewed");
    expect(chestMdm).toContain("providerDocumentationComplaintIntel.chestPain.mdmEkgReviewed");
    expect(chestMdm).toContain("providerDocumentationComplaintIntel.chestPain.diffAorticDissection");
    expect(chestMdm).not.toContain("erMseMdmChips.waAbdominal");
    expect(chestMdm).not.toContain("erMseMdmChips.waTrauma");
    expect(chestMdm).not.toContain("erMseMdmChips.waMedIntox");
    expect(chestMdm).not.toContain("erMseMdmChips.waNeurologic");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "chest_pain" });
    expect(next.activeTemplateId).toBe("chest_pain");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.cardiovascular).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.chestPain.diffStemi";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveChestPainRosChipGroupsForTemplate("abdominal_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const examSectionIds = resolveChestPainExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("neuroPsych");
  });

  it("does not regress prior governance families", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const headacheVisible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "headache",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(headacheVisible.has("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage")).toBe(true);

    const rashVisible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "allergic_reaction_rash",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(rashVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis")).toBe(true);

    const gynVisible = collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
      templateId: "female_pelvic_gyn_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(gynVisible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy")).toBe(
      true
    );

    const backPainVisible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(backPainVisible.has("providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy")).toBe(true);

    const feverVisible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(feverVisible.has("providerDocumentationComplaintIntel.feverComplaintV1.rosFever")).toBe(true);

    const coughUriVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "adult_uri_respiratory",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(coughUriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(true);

    const sobVisible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffPulmonaryEmbolism")).toBe(true);

    const abdominalVisible = collectAbdominalPainVisibleStickyNoteFragmentKeys({
      templateId: "abdominal_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(abdominalVisible.has("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")).toBe(true);

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
  });
});
