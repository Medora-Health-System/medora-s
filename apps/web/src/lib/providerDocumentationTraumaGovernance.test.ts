import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectTraumaVisibleStickyNoteFragmentKeys,
  resolveTraumaExamChipGroupsForTemplate,
  resolveTraumaRosChipGroupsForTemplate,
  templateUsesTraumaStickyNoteGovernance,
  TRAUMA_GOVERNED_TEMPLATE_IDS,
  TRAUMA_MAJOR_GROUP_TEMPLATE_IDS,
} from "@/lib/providerDocumentationTraumaGovernance";
import { MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS } from "@/lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { collectDizzinessVertigoVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationDizzinessVertigoGovernance";
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
    chips: ["heentHeadAtraumatic", "heentPerrla", "heentOropharynxClear"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
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
    chips: ["skinRashPresent", "skinLacerationPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent", "mskDeformityNoted"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locLimbPain",
      "locFlankPain",
      "qualPressureLike",
      "assocSob",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationTraumaGovernance — MEDUI.ED.ME.2N", () => {
  it("governs all trauma/injury template IDs discovered in catalog", () => {
    expect(TRAUMA_MAJOR_GROUP_TEMPLATE_IDS).toHaveLength(12);
    expect(MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS).toHaveLength(19);
    expect(TRAUMA_GOVERNED_TEMPLATE_IDS).toHaveLength(32);
    for (const templateId of TRAUMA_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesTraumaStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters UTI, GYN, URI, and medical GI illness chips", () => {
    const rosKeys = flattenFragmentKeys(resolveTraumaRosChipGroupsForTemplate("fall", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.posHeadache");
    expect(rosKeys).toContain("erMseRosChips.posChestPain");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");

    const visible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "fall",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locFlankPain")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.allergicReactionRash.hpiRashOnsetReviewed")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(false);
  });

  it("exposes mechanism-of-injury, MVC, fall, concussion, and fracture chips", () => {
    const fallVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "fall",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(fallVisible.has("erMseHpiChipsTrauma.fallMechanism")).toBe(true);
    expect(fallVisible.has("erMseHpiChipsTrauma.mechanismReviewed")).toBe(true);
    expect(fallVisible.has("providerDocumentationComplaintIntel.fall.hpiMechanicalFall")).toBe(true);
    expect(fallVisible.has("providerDocumentationComplaintIntel.fall.mdmCtHeadReviewed")).toBe(true);

    const mvcVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "mvc",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(mvcVisible.has("erMseHpiChipsTrauma.mvcMechanism")).toBe(true);
    expect(mvcVisible.has("providerDocumentationComplaintIntel.mvcCollision.diffConcussion")).toBe(true);

    const headVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "head_injury",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(headVisible.has("erMseHpiChipsTrauma.headStrikeMechanism")).toBe(true);
    expect(headVisible.has("providerDocumentationComplaintIntel.headInjury.diffConcussion")).toBe(true);

    const fractureVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "fracture_concern",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(fractureVisible.has("providerDocumentationComplaintIntel.fractureConcern.diffFracture")).toBe(true);
    expect(fractureVisible.has("providerDocumentationComplaintIntel.fractureConcern.diffDislocation")).toBe(true);
    expect(fractureVisible.has("providerDocumentationComplaintIntel.fractureConcern.mdmXrayReviewed")).toBe(true);

    const kneeVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "knee_injury_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(kneeVisible.has("providerDocumentationComplaintIntel.kneeInjuryComplaintV1.diffFracture")).toBe(true);
  });

  it("limits exam to trauma-relevant sections and keeps injury findings", () => {
    const examSectionIds = resolveTraumaExamChipGroupsForTemplate("mvc", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("neuroPsych");
    expect(examSectionIds).toContain("musculoskeletal");
    expect(examSectionIds).toContain("skin");
    expect(examSectionIds).toContain("cardiovascular");
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).toContain("abdomen");
    expect(examSectionIds).toContain("reassessment");

    const examKeys = flattenFragmentKeys(resolveTraumaExamChipGroupsForTemplate("laceration", WORKSPACE_EXAM_CHIP_GROUPS));
    expect(examKeys).toContain("erMseExamChips.skinLacerationPresent");
    expect(examKeys).toContain("erMseExamChips.mskDeformityNoted");
    expect(examKeys).not.toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
  });

  it("keeps trauma MDM and imaging while removing medical wrong-domain pathways", () => {
    const fallTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "fall") ?? null;
    const fallMdm = buildMdmTemplateDropdownOptions(fallTemplate).map((option) => option.fragmentKey);
    expect(fallMdm).toContain("erMseMdmChips.waTrauma");
    expect(fallMdm).toContain("erMseMdmChips.planImaging");
    expect(fallMdm).not.toContain("erMseMdmChips.waAbdominal");
    expect(fallMdm).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(fallMdm).not.toContain("erMseMdmChips.waMedIntox");
    expect(fallMdm).not.toContain("erMseMdmChips.planEcg");

    const headTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "head_injury") ?? null;
    const headMdm = buildMdmTemplateDropdownOptions(headTemplate).map((option) => option.fragmentKey);
    expect(headMdm).toContain("providerDocumentationComplaintIntel.headInjury.mdmCtHeadReviewed");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "fall" });
    expect(next.activeTemplateId).toBe("fall");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.musculoskeletal).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.fall.hpiMechanicalFall";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(resolveTraumaRosChipGroupsForTemplate("abdominal_pain", WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).toContain("erMseRosChips.rfPregnancyConcern");

    const examSectionIds = resolveTraumaExamChipGroupsForTemplate("urinary_symptoms", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress prior governance families", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const dizzinessVisible = collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
      templateId: "dizziness_syncope",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(dizzinessVisible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(true);

    const chestPainVisible = collectChestPainVisibleStickyNoteFragmentKeys({
      templateId: "chest_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(chestPainVisible.has("providerDocumentationComplaintIntel.chestPain.diffAcuteCoronarySyndrome")).toBe(true);

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
