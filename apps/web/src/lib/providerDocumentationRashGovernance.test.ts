import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectRashVisibleStickyNoteFragmentKeys,
  RASH_GOVERNED_TEMPLATE_IDS,
  resolveRashExamChipGroupsForTemplate,
  resolveRashRosChipGroupsForTemplate,
  templateUsesRashStickyNoteGovernance,
} from "@/lib/providerDocumentationRashGovernance";
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
    chips: ["skinRashPresent", "skinWarmDry"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "assocNausea",
      "assocSob",
      "qualPressureLike",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationRashGovernance — MEDUI.ED.ME.2J", () => {
  it("governs all rash/skin template IDs discovered in catalog", () => {
    expect(RASH_GOVERNED_TEMPLATE_IDS).toEqual([
      "allergic_reaction_rash",
      "pediatric_rash",
      "cellulitis_skin_infection_complaint_v1",
      "abscess_soft_tissue_complaint_v1",
      "wound_infection_complaint_v1",
      "rash_skin_complaint_v1",
    ]);
    for (const templateId of RASH_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesRashStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters chest pain, URI, abdominal, urinary, GYN, and back pain chips", () => {
    const rosKeys = flattenFragmentKeys(
      resolveRashRosChipGroupsForTemplate("allergic_reaction_rash", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.rfNeuroDeficit");
    expect(rosKeys).toContain("erMseRosChips.posFever");
    expect(rosKeys).toContain("erMseRosChips.rfHypotensionConcern");

    const visible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "rash_skin_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
  });

  it("keeps anaphylaxis wheezing chips while hiding URI respiratory exam chips", () => {
    const allergyVisible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "allergic_reaction_rash",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiWheezingReviewed")).toBe(
      true
    );
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.rosWheezing")).toBe(true);
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.examWheezingPresent")).toBe(
      true
    );

    const examKeys = flattenFragmentKeys(
      resolveRashExamChipGroupsForTemplate("allergic_reaction_rash", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.respWheezing");
    expect(examKeys).not.toContain("erMseExamChips.respClearBs");
    expect(examKeys).not.toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).not.toContain("erMseExamChips.abdSoft");
  });

  it("exposes rash onset, exposure, fever, cellulitis, and purpura/mucosal chips", () => {
    const allergyVisible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "allergic_reaction_rash",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiRashOnsetReviewed")).toBe(
      true
    );
    expect(
      allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiMedicationExposureReviewed")
    ).toBe(true);
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiInsectStingReviewed")).toBe(
      true
    );
    expect(
      allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.rfPurpuraPetechiaeConcern")
    ).toBe(true);
    expect(allergyVisible.has("providerDocumentationComplaintIntel.allergicReactionRash.rfMucosalInvolvement")).toBe(
      true
    );

    const rashVisible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "rash_skin_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(rashVisible.has("providerDocumentationComplaintIntel.rashSkinComplaintV1.hpiOnsetSpreadItchingPain")).toBe(
      true
    );
    expect(rashVisible.has("providerDocumentationComplaintIntel.rashSkinComplaintV1.hpiExposuresMedication")).toBe(
      true
    );
    expect(rashVisible.has("providerDocumentationComplaintIntel.rashSkinComplaintV1.rfPurpuraConcern")).toBe(true);

    const cellulitisVisible = collectRashVisibleStickyNoteFragmentKeys({
      templateId: "cellulitis_skin_infection_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(
      cellulitisVisible.has(
        "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.hpiDrainageTraumaInsectBite"
      )
    ).toBe(true);
    expect(cellulitisVisible.has("providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.rosFever")).toBe(
      true
    );
  });

  it("exposes skin exam chips and infection/allergy differentials with treatment MDM", () => {
    const examSectionIds = resolveRashExamChipGroupsForTemplate(
      "rash_skin_complaint_v1",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("skin");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");

    const rashTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "rash_skin_complaint_v1") ?? null;
    const rashMdm = buildMdmTemplateDropdownOptions(rashTemplate).map((option) => option.fragmentKey);
    expect(rashMdm).toContain("providerDocumentationComplaintIntel.rashSkinComplaintV1.diffAllergicReaction");
    expect(rashMdm).toContain("providerDocumentationComplaintIntel.rashSkinComplaintV1.diffCellulitis");
    expect(rashMdm).toContain("providerDocumentationComplaintIntel.rashSkinComplaintV1.mdmAntihistamineSteroidPlanIfGiven");
    expect(rashMdm).not.toContain("erMseMdmChips.planEcg");
    expect(rashMdm).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
    expect(rashMdm).not.toContain("erMseMdmChips.waCardiopulmonary");

    const allergyTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "allergic_reaction_rash") ?? null;
    const allergyMdm = buildMdmTemplateDropdownOptions(allergyTemplate).map((option) => option.fragmentKey);
    expect(allergyMdm).toContain("providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis");
    expect(allergyMdm).toContain("providerDocumentationComplaintIntel.allergicReactionRash.diffUrticaria");
    expect(allergyMdm).toContain(
      "providerDocumentationComplaintIntel.allergicReactionRash.mdmEpinephrineConsideredAdministered"
    );
    expect(allergyMdm).toContain(
      "providerDocumentationComplaintIntel.allergicReactionRash.mdmAntihistamineTherapyConsideredAdministered"
    );

    const cellulitisTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "cellulitis_skin_infection_complaint_v1") ?? null;
    const cellulitisMdm = buildMdmTemplateDropdownOptions(cellulitisTemplate).map((option) => option.fragmentKey);
    expect(cellulitisMdm).toContain("providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.diffCellulitis");
    expect(cellulitisMdm).toContain(
      "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.mdmAntibioticPlanIfGiven"
    );

    const abscessTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "abscess_soft_tissue_complaint_v1") ?? null;
    const abscessMdm = buildMdmTemplateDropdownOptions(abscessTemplate).map((option) => option.fragmentKey);
    expect(abscessMdm).toContain("providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.diffAbscess");
    expect(abscessMdm).toContain(
      "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.mdmIdProcedureReassessmentIfPerformed"
    );
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "allergic_reaction_rash" });
    expect(next.activeTemplateId).toBe("allergic_reaction_rash");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.skin).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(resolveRashRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveRashExamChipGroupsForTemplate("abdominal_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("abdomen");
  });

  it("does not regress prior governance families", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

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
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffPe")).toBe(true);

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
