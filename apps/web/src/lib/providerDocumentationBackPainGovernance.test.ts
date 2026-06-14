import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  BACK_PAIN_GOVERNED_TEMPLATE_IDS,
  collectBackPainVisibleStickyNoteFragmentKeys,
  resolveBackPainExamChipGroupsForTemplate,
  resolveBackPainRosChipGroupsForTemplate,
  templateUsesBackPainStickyNoteGovernance,
} from "@/lib/providerDocumentationBackPainGovernance";
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
    chips: ["skinRashPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent", "mskRomNormal", "mskDeformityNoted"].map((key) => ({
      fragmentKey: `erMseExamChips.${key}`,
    })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroFollowsCommands", "neuroFocalDeficitNoted"].map((key) => ({
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
      "locChestPain",
      "locBackPain",
      "locAbdominalPain",
      "locFlankPain",
      "assocNausea",
      "assocVomiting",
      "assocSob",
      "qualPressureLike",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationBackPainGovernance — MEDUI.ED.ME.2H", () => {
  it("governs all back pain template IDs discovered in catalog", () => {
    expect(BACK_PAIN_GOVERNED_TEMPLATE_IDS).toEqual([
      "back_pain",
      "back_pain_complaint_v1",
      "back_pain_neuro_red_flags_complaint_v1",
    ]);
    for (const templateId of BACK_PAIN_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesBackPainStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("filters chest pain, URI, nausea/vomiting, and unrelated specialty chips", () => {
    const rosKeys = flattenFragmentKeys(
      resolveBackPainRosChipGroupsForTemplate("back_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posVomiting");
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).toContain("erMseRosChips.posWeakness");
    expect(rosKeys).toContain("erMseRosChips.rfNeuroDeficit");

    const visible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocNausea")).toBe(false);
    expect(visible.has("erMseHpiChips.assocVomiting")).toBe(false);
    expect(visible.has("erMseHpiChips.assocSob")).toBe(false);
    expect(visible.has("erMseHpiChips.locBackPain")).toBe(true);
    expect(visible.has("erMseHpiChips.locFlankPain")).toBe(true);
  });

  it("exposes lumbar, sciatica, neurologic, cauda equina, and trauma chips", () => {
    const traumaVisible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(traumaVisible.has("providerDocumentationComplaintIntel.backPainTrauma.hpiRadiationToLegReviewed")).toBe(
      true
    );
    expect(traumaVisible.has("providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy")).toBe(true);
    expect(traumaVisible.has("providerDocumentationComplaintIntel.backPainTrauma.diffCaudaEquinaSyndrome")).toBe(
      true
    );
    expect(traumaVisible.has("providerDocumentationComplaintIntel.backPainTrauma.rfSaddleAnesthesia")).toBe(true);
    expect(traumaVisible.has("providerDocumentationComplaintIntel.backPainTrauma.examThoracicLumbarTenderness")).toBe(
      true
    );
    expect(traumaVisible.has("erMseHpiChipsTrauma.mechanismReviewed")).toBe(true);

    const v1Visible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(v1Visible.has("providerDocumentationComplaintIntel.backPainComplaintV1.diffRadiculopathy")).toBe(true);
    expect(v1Visible.has("providerDocumentationComplaintIntel.backPainComplaintV1.diffCaudaEquina")).toBe(true);

    const neuroVisible = collectBackPainVisibleStickyNoteFragmentKeys({
      templateId: "back_pain_neuro_red_flags_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(
      neuroVisible.has("providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.diffCaudaEquinaConcern")
    ).toBe(true);
    expect(
      neuroVisible.has("providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.rfBowelBladderSymptoms")
    ).toBe(true);
  });

  it("limits exam sections to general, musculoskeletal, neurologic, and reassessment", () => {
    const examSectionIds = resolveBackPainExamChipGroupsForTemplate(
      "back_pain_complaint_v1",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("general");
    expect(examSectionIds).toContain("musculoskeletal");
    expect(examSectionIds).toContain("neuroPsych");
    expect(examSectionIds).toContain("reassessment");
    expect(examSectionIds).not.toContain("heent");
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("skin");

    const examKeys = flattenFragmentKeys(
      resolveBackPainExamChipGroupsForTemplate("back_pain_complaint_v1", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.mskTendernessPresent");
    expect(examKeys).toContain("erMseExamChips.neuroFocalDeficitNoted");
  });

  it("excludes EKG and ACS pathways while preserving trauma and spine imaging MDM", () => {
    for (const templateId of BACK_PAIN_GOVERNED_TEMPLATE_IDS) {
      const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;
      const mdmKeys = buildMdmTemplateDropdownOptions(template).map((option) => option.fragmentKey);
      expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
      expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
      expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
      expect(mdmKeys).not.toContain("erMseMdmChips.waAbdominal");
      expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
      expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    }

    const traumaTemplate = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "back_pain") ?? null;
    const traumaMdm = buildMdmTemplateDropdownOptions(traumaTemplate).map((option) => option.fragmentKey);
    expect(traumaMdm).toContain("erMseMdmChips.waTrauma");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "back_pain" });
    expect(next.activeTemplateId).toBe("back_pain");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.musculoskeletal).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.backPainTrauma.diffCaudaEquinaSyndrome";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveBackPainRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveBackPainExamChipGroupsForTemplate(
      "abdominal_pain",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("abdomen");
  });

  it("does not regress prior governance families", () => {
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
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffPe")).toBe(true);

    const coughUriVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "adult_uri_respiratory",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(coughUriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(true);

    const feverVisible = collectAdultFeverVisibleStickyNoteFragmentKeys({
      templateId: "fever_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(feverVisible.has("providerDocumentationComplaintIntel.feverComplaintV1.rosFever")).toBe(true);
  });
});
