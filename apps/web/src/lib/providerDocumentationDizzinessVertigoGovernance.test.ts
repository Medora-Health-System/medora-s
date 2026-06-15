import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectDizzinessVertigoVisibleStickyNoteFragmentKeys,
  DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS,
  resolveDizzinessVertigoExamChipGroupsForTemplate,
  resolveDizzinessVertigoRosChipGroupsForTemplate,
  templateUsesDizzinessVertigoStickyNoteGovernance,
} from "@/lib/providerDocumentationDizzinessVertigoGovernance";
import { collectChestPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationChestPainGovernance";
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
      "assocDizziness",
      "assocChestPain",
      "assocSob",
      "assocPalpitations",
      "qualPressureLike",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationDizzinessVertigoGovernance — MEDUI.ED.ME.2M", () => {
  it("governs all dizziness/vertigo/syncope template IDs discovered in catalog", () => {
    expect(DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS).toEqual([
      "dizziness_syncope",
      "near_syncope_complaint_v1",
      "vertigo_complaint_v1",
    ]);
    for (const templateId of DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesDizzinessVertigoStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters UTI, GYN, rash, abdominal, and back-pain-only chips", () => {
    const rosKeys = flattenFragmentKeys(
      resolveDizzinessVertigoRosChipGroupsForTemplate("dizziness_syncope", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posDizziness");
    expect(rosKeys).toContain("erMseRosChips.posHeadache");
    expect(rosKeys).toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");

    const visible = collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
      templateId: "dizziness_syncope",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(false);
    expect(visible.has("erMseHpiChips.locHeadache")).toBe(false);
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiRashOnsetReviewed")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.abdominal.diffAppendicitis")).toBe(false);
  });

  it("exposes vertigo, syncope, neuro red flags, and associated cardiac symptoms", () => {
    const visible = collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
      templateId: "dizziness_syncope",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.assocDizziness")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxRoomSpinning")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxCompleteSyncope")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.qualVertigo")).toBe(true);
    expect(visible.has("providerDocumentationTemplateHpiDimensions.dizzinessSyncope.assocChestPain")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiTrueVertigo")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiSyncopeEvent")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.diffBppv")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.diffPosteriorStroke")).toBe(true);
    expect(visible.has("erMseRosChips.rfNeuroDeficit")).toBe(true);
    expect(visible.has("erMseRosChips.rfAlteredMs")).toBe(true);
    expect(visible.has("erMseRosChips.rfSyncope")).toBe(true);

    const vertigoVisible = collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
      templateId: "vertigo_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(vertigoVisible.has("providerDocumentationComplaintIntel.vertigoComplaintV1.rosVertigo")).toBe(true);
    expect(vertigoVisible.has("providerDocumentationComplaintIntel.vertigoComplaintV1.diffPeripheralVertigo")).toBe(true);

    const nearSyncopeVisible = collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
      templateId: "near_syncope_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(nearSyncopeVisible.has("providerDocumentationComplaintIntel.nearSyncopeComplaintV1.rosNearSyncope")).toBe(
      true
    );
    expect(nearSyncopeVisible.has("providerDocumentationComplaintIntel.nearSyncopeComplaintV1.diffArrhythmia")).toBe(
      true
    );
    expect(nearSyncopeVisible.has("erMseHpiChips.assocChestPain")).toBe(true);
    expect(nearSyncopeVisible.has("erMseHpiChips.assocPalpitations")).toBe(true);
  });

  it("limits exam sections and keeps neuro, HEENT, and cardiopulmonary findings", () => {
    const examSectionIds = resolveDizzinessVertigoExamChipGroupsForTemplate(
      "dizziness_syncope",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("neuroPsych");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("skin");

    const examKeys = flattenFragmentKeys(
      resolveDizzinessVertigoExamChipGroupsForTemplate("dizziness_syncope", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.heentPerrla");
    expect(examKeys).toContain("erMseExamChips.neuroAlertOriented");
    expect(examKeys).toContain("erMseExamChips.cardioRrr");
    expect(examKeys).not.toContain("erMseExamChips.abdSoft");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
    expect(examKeys).not.toContain("erMseExamChips.heentOropharynxClear");
  });

  it("keeps EKG, stroke workup, and cardiopulmonary MDM while removing wrong-domain pathways", () => {
    const dizzTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "dizziness_syncope") ?? null;
    const dizzMdm = buildMdmTemplateDropdownOptions(dizzTemplate).map((option) => option.fragmentKey);
    expect(dizzMdm).toContain("erMseMdmChips.waNeurologic");
    expect(dizzMdm).toContain("erMseMdmChips.waCardiopulmonary");
    expect(dizzMdm).toContain("erMseMdmChips.planEcg");
    expect(dizzMdm).toContain("providerDocumentationComplaintIntel.dizzinessSyncope.mdmEcgReviewed");
    expect(dizzMdm).toContain("providerDocumentationComplaintIntel.dizzinessSyncope.mdmCtHeadIfIndicated");
    expect(dizzMdm).toContain("providerDocumentationComplaintIntel.dizzinessSyncope.diffCardiacArrhythmia");
    expect(dizzMdm).not.toContain("erMseMdmChips.waAbdominal");
    expect(dizzMdm).not.toContain("erMseMdmChips.waTrauma");
    expect(dizzMdm).not.toContain("erMseMdmChips.waMedIntox");

    const vertigoTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "vertigo_complaint_v1") ?? null;
    const vertigoMdm = buildMdmTemplateDropdownOptions(vertigoTemplate).map((option) => option.fragmentKey);
    expect(vertigoMdm).toContain("providerDocumentationComplaintIntel.vertigoComplaintV1.mdmImagingReviewedIfObtained");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "dizziness_syncope" });
    expect(next.activeTemplateId).toBe("dizziness_syncope");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.neuroPsych).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.dizzinessSyncope.diffPosteriorStroke";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveDizzinessVertigoRosChipGroupsForTemplate("abdominal_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const examSectionIds = resolveDizzinessVertigoExamChipGroupsForTemplate("chest_pain", WORKSPACE_EXAM_CHIP_GROUPS).map(
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

    const chestPainVisible = collectChestPainVisibleStickyNoteFragmentKeys({
      templateId: "chest_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(chestPainVisible.has("providerDocumentationComplaintIntel.chestPain.diffAcs")).toBe(true);

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
