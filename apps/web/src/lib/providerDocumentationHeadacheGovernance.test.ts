import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectHeadacheVisibleStickyNoteFragmentKeys,
  HEADACHE_GOVERNED_TEMPLATE_IDS,
  resolveHeadacheExamChipGroupsForTemplate,
  resolveHeadacheRosChipGroupsForTemplate,
  templateUsesHeadacheStickyNoteGovernance,
} from "@/lib/providerDocumentationHeadacheGovernance";
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
    chips: ["heentPerrla", "heentOropharynxClear"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
    chips: ["mskTendernessPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroAlertOriented", "neuroSpeechClear", "neuroFocalDeficitNoted"].map((key) => ({
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
      "locHeadache",
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

describe("providerDocumentationHeadacheGovernance — MEDUI.ED.ME.2K", () => {
  it("governs all headache template IDs discovered in catalog", () => {
    expect(HEADACHE_GOVERNED_TEMPLATE_IDS).toEqual(["headache", "migraine_headache_complaint_v1"]);
    for (const templateId of HEADACHE_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesHeadacheStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters chest pain, UTI, abdominal, GYN, rash, and back pain chips", () => {
    const rosKeys = flattenFragmentKeys(resolveHeadacheRosChipGroupsForTemplate("headache", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).toContain("erMseRosChips.posHeadache");
    expect(rosKeys).toContain("erMseRosChips.posDizziness");
    expect(rosKeys).toContain("erMseRosChips.rfNeuroDeficit");

    const visible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "headache",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("erMseHpiChips.locHeadache")).toBe(true);
  });

  it("exposes headache characterization, migraine features, visual symptoms, and neuro red flags", () => {
    const visible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "headache",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationTemplateHpiDimensions.headache.timThunderclap")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.headache.timSuddenOnset")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.headache.qualThrobbing")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.headache.assocPhotophobia")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.headache.assocVisionChanges")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.hpiThunderclapConcern")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.hpiVisualChanges")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.hpiPhotophobia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.rfSahConcern")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.rfNeuroDeficit")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.rfMeningitisConcern")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.diffMigraine")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.diffHypertensiveEmergency")).toBe(true);

    const migraineVisible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "migraine_headache_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(migraineVisible.has("providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.diffMigraine")).toBe(
      true
    );
    expect(
      migraineVisible.has("providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.hpiPhotophobiaNausea")
    ).toBe(true);
    expect(
      migraineVisible.has("providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.rfThunderclapConcern")
    ).toBe(true);
  });

  it("limits exam to general, HEENT, neuro, cardiovascular, and reassessment with neuro exam chips", () => {
    const examSectionIds = resolveHeadacheExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("neuroPsych");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("skin");
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("musculoskeletal");

    const examKeys = flattenFragmentKeys(
      resolveHeadacheExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.heentPerrla");
    expect(examKeys).toContain("erMseExamChips.neuroAlertOriented");
    expect(examKeys).toContain("erMseExamChips.neuroSpeechClear");
    expect(examKeys).not.toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");

    const visible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "headache",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.headache.examCranialNervesIntact")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.headache.examPerrla")).toBe(true);
  });

  it("exposes CT/LP/neuro consult MDM while hiding EKG and wrong-domain pathways", () => {
    const headacheTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "headache") ?? null;
    const headacheMdm = buildMdmTemplateDropdownOptions(headacheTemplate).map((option) => option.fragmentKey);
    expect(headacheMdm).toContain("providerDocumentationComplaintIntel.headache.mdmCtHeadReviewed");
    expect(headacheMdm).toContain("providerDocumentationComplaintIntel.headache.mdmLpConsidered");
    expect(headacheMdm).toContain("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage");
    expect(headacheMdm).toContain("erMseMdmChips.waNeurologic");
    expect(headacheMdm).not.toContain("erMseMdmChips.planEcg");
    expect(headacheMdm).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
    expect(headacheMdm).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(headacheMdm).not.toContain("erMseMdmChips.waAbdominal");

    const visible = collectHeadacheVisibleStickyNoteFragmentKeys({
      templateId: "headache",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.headache.dispNeurologyConsultConsidered")).toBe(true);

    const migraineTemplate =
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "migraine_headache_complaint_v1") ?? null;
    const migraineMdm = buildMdmTemplateDropdownOptions(migraineTemplate).map((option) => option.fragmentKey);
    expect(migraineMdm).toContain("providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.mdmCtLabsReviewedIfObtained");
    expect(migraineMdm).toContain(
      "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.mdmNeurologyFollowUpIfIndicated"
    );
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "headache" });
    expect(next.activeTemplateId).toBe("headache");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.neuroPsych).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(resolveHeadacheRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveHeadacheExamChipGroupsForTemplate("abdominal_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
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
