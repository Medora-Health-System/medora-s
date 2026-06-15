import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectExtremityMskVisibleStickyNoteFragmentKeys,
  EXTREMITY_MSK_ALLOWED_EXAM_SECTION_IDS,
  EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS,
  filterExtremityMskMdmTemplateOptionsForTemplate,
  isExtremityMskDeniedStickyNoteFragment,
  resolveExtremityMskExamChipGroupsForTemplate,
  resolveExtremityMskHpiChipGroupsForTemplate,
  resolveExtremityMskRosChipGroupsForTemplate,
  templateUsesExtremityMskStickyNoteGovernance,
} from "@/lib/providerDocumentationExtremityMskGovernance";
import { templateUsesTraumaStickyNoteGovernance } from "@/lib/providerDocumentationTraumaGovernance";
import { collectTraumaVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationTraumaGovernance";
import { collectUrinarySymptomsVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationUrinarySymptomsGovernance";
import { collectDiarrheaVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationDiarrheaGovernance";
import { collectNauseaVomitingVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationNauseaVomitingGovernance";
import { collectAbdominalPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationAbdominalPainGovernance";
import { collectShortnessOfBreathVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationShortnessOfBreathGovernance";
import { collectCoughUriVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationCoughUriGovernance";
import { collectAdultFeverVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationAdultFeverGovernance";
import { collectBackPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationBackPainGovernance";
import { collectFemalePelvicGynVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationFemalePelvicGynGovernance";
import { collectRashVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationRashGovernance";
import { collectHeadacheVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationHeadacheGovernance";
import { collectChestPainVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationChestPainGovernance";
import { collectDizzinessVertigoVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationDizzinessVertigoGovernance";

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
    chips: ["mskTendernessPresent", "mskRomNormal", "mskDeformityNoted"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
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
      "assocCough",
      "assocNausea",
      "assocVomiting",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

const MSK_TEMPLATE_ID = "trauma_musculoskeletal" as const;

describe("providerDocumentationExtremityMskGovernance — MEDUI.ED.ME.2O", () => {
  it("governs discovered non-traumatic MSK catalog template IDs", () => {
    expect(EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS).toEqual(["trauma_musculoskeletal"]);
    for (const templateId of EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesExtremityMskStickyNoteGovernance(templateId)).toBe(true);
      expect(templateUsesTraumaStickyNoteGovernance(templateId)).toBe(false);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("keeps shoulder injury complaint-intel namespaces available for MSK governance", () => {
    expect(
      isExtremityMskDeniedStickyNoteFragment(
        "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.diffRotatorCuffInjury"
      )
    ).toBe(false);
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.rosShoulderPain")
    ).toBe(false);
  });

  it("keeps knee injury complaint-intel namespaces available for MSK governance", () => {
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.kneeInjuryComplaintV1.diffFracture")
    ).toBe(false);
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.kneeInjuryComplaintV1.rosKneePain")
    ).toBe(false);
  });

  it("keeps hip injury complaint-intel namespaces available for MSK governance", () => {
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.diffFracture")
    ).toBe(false);
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.rosHipPain")
    ).toBe(false);
  });

  it("keeps ankle/foot injury complaint-intel namespaces available for MSK governance", () => {
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.diffSprain")
    ).toBe(false);
    expect(
      isExtremityMskDeniedStickyNoteFragment(
        "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.rosAnkleFootPain"
      )
    ).toBe(false);
  });

  it("keeps joint/fracture MSK complaint-intel namespaces available for MSK governance", () => {
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.fractureConcern.diffFracture")
    ).toBe(false);
    expect(
      isExtremityMskDeniedStickyNoteFragment("providerDocumentationComplaintIntel.handWristInjuryComplaintV1.diffSprain")
    ).toBe(false);
  });

  it("exposes limb pain, ROM, swelling, and tenderness chips for trauma_musculoskeletal", () => {
    const hpiKeys = flattenFragmentKeys(
      resolveExtremityMskHpiChipGroupsForTemplate(MSK_TEMPLATE_ID, WORKSPACE_HPI_CHIP_GROUPS)
    );
    expect(hpiKeys).toContain("erMseHpiChips.locLimbPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.locChestPain");
    expect(hpiKeys).not.toContain("erMseHpiChips.locAbdominalPain");

    const examKeys = flattenFragmentKeys(
      resolveExtremityMskExamChipGroupsForTemplate(MSK_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.mskRomNormal");
    expect(examKeys).toContain("erMseExamChips.mskTendernessPresent");
    expect(examKeys).toContain("erMseExamChips.mskDeformityNoted");

    const visible = collectExtremityMskVisibleStickyNoteFragmentKeys({
      templateId: MSK_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locLimbPain")).toBe(true);
    expect(visible.has("erMseHpiChips.qualAching")).toBe(true);
    expect(visible.has("erMseExamChips.mskRomNormal")).toBe(true);
    expect(visible.has("erMseRosChips.posWeakness")).toBe(true);
  });

  it("hides chest pain, URI, UTI, pelvic, headache, and vertigo wrong-domain chips", () => {
    const visible = collectExtremityMskVisibleStickyNoteFragmentKeys({
      templateId: MSK_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("erMseHpiChips.assocCough")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(false);

    const rosKeys = flattenFragmentKeys(resolveExtremityMskRosChipGroupsForTemplate(MSK_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS));
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");
  });

  it("restricts exam sections to MSK-relevant sections only", () => {
    const examSectionIds = resolveExtremityMskExamChipGroupsForTemplate(MSK_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds).toEqual([...EXTREMITY_MSK_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("heent");
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("skin");
  });

  it("keeps imaging/trauma MDM while hiding EKG and medical wrong-domain pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === MSK_TEMPLATE_ID) ?? null;
    const mdmKeys = filterExtremityMskMdmTemplateOptionsForTemplate(
      MSK_TEMPLATE_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: MSK_TEMPLATE_ID });
    expect(next.activeTemplateId).toBe(MSK_TEMPLATE_ID);
    expect(next.hpi).toBe("");
    expect(next.physicalExam.musculoskeletal).toBe("");

    const fragmentKey = "erMseHpiChips.locLimbPain";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveExtremityMskRosChipGroupsForTemplate("abdominal_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).toContain("erMseRosChips.posAbdominalPain");

    const examSectionIds = resolveExtremityMskExamChipGroupsForTemplate("urinary_symptoms", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress prior governance families including trauma", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const traumaVisible = collectTraumaVisibleStickyNoteFragmentKeys({
      templateId: "fall",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(traumaVisible.has("providerDocumentationComplaintIntel.fall.hpiMechanicalFall")).toBe(true);

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
