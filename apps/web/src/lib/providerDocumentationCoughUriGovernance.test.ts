import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  COUGH_URI_GOVERNED_TEMPLATE_IDS,
  collectCoughUriVisibleStickyNoteFragmentKeys,
  resolveCoughUriExamChipGroupsForTemplate,
  resolveCoughUriRosChipGroupsForTemplate,
  templateUsesCoughUriStickyNoteGovernance,
} from "@/lib/providerDocumentationCoughUriGovernance";
import {
  collectShortnessOfBreathVisibleStickyNoteFragmentKeys,
  SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS,
  templateUsesShortnessOfBreathStickyNoteGovernance,
} from "@/lib/providerDocumentationShortnessOfBreathGovernance";
import {
  collectAbdominalPainVisibleStickyNoteFragmentKeys,
} from "@/lib/providerDocumentationAbdominalPainGovernance";
import {
  collectDiarrheaVisibleStickyNoteFragmentKeys,
} from "@/lib/providerDocumentationDiarrheaGovernance";
import {
  collectNauseaVomitingVisibleStickyNoteFragmentKeys,
} from "@/lib/providerDocumentationNauseaVomitingGovernance";
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
    chips: ["heentOropharynxClear"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "abdomen",
    chips: ["abdSoft", "abdGuarding"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locAbdominalPain",
      "locChestPain",
      "assocNausea",
      "assocVomiting",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationCoughUriGovernance — MEDUI.ED.ME.2F", () => {
  it("classifies cough/URI templates separately from SOB/high-acuity respiratory templates", () => {
    expect(COUGH_URI_GOVERNED_TEMPLATE_IDS).toEqual([
      "cough",
      "adult_uri_respiratory",
      "uri_respiratory",
      "cough_complaint_v1",
      "uri_congestion_complaint_v1",
      "chest_congestion_complaint_v1",
      "flu_like_illness_complaint_v1",
    ]);
    expect(SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS).toEqual([
      "sob",
      "asthma_wheezing",
      "asthma_wheezing_complaint_v1",
      "copd_exacerbation_complaint_v1",
      "pneumonia_symptoms_complaint_v1",
      "hemoptysis_complaint_v1",
    ]);

    for (const templateId of COUGH_URI_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesCoughUriStickyNoteGovernance(templateId)).toBe(true);
      expect(templateUsesShortnessOfBreathStickyNoteGovernance(templateId)).toBe(false);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
    for (const templateId of SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesShortnessOfBreathStickyNoteGovernance(templateId)).toBe(true);
      expect(templateUsesCoughUriStickyNoteGovernance(templateId)).toBe(false);
    }
  });

  it("exposes cough/URI-focused HPI, exposure, and red-flag chips", () => {
    const coughVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "cough",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(coughVisible.has("providerDocumentationComplaintIntel.cough.hpiDryCough")).toBe(true);
    expect(coughVisible.has("providerDocumentationComplaintIntel.cough.hpiProductiveCough")).toBe(true);
    expect(coughVisible.has("providerDocumentationComplaintIntel.cough.hpiSickContacts")).toBe(true);
    expect(coughVisible.has("providerDocumentationComplaintIntel.cough.hpiDeniesHemoptysis")).toBe(true);
    expect(coughVisible.has("providerDocumentationComplaintIntel.cough.rosCongestion")).toBe(true);

    const uriVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "adult_uri_respiratory",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiRunnyNose")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiSoreThroat")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiRecentViralExposure")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiSickContacts")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.rosBodyAches")).toBe(true);
    expect(uriVisible.has("providerDocumentationComplaintIntel.uriRespiratory.diffInfluenza")).toBe(true);
  });

  it("exposes HEENT and respiratory exam chips while hiding abdomen/GU/MSK/neuro sections", () => {
    const examSectionIds = resolveCoughUriExamChipGroupsForTemplate(
      "adult_uri_respiratory",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toContain("heent");
    expect(examSectionIds).toContain("respiratory");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("neuroPsych");

    const visible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "adult_uri_respiratory",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.examNasalCongestionPresent")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.examLungsClearBilaterally")).toBe(true);
    expect(visible.has("erMseExamChips.respWheezing")).toBe(true);
  });

  it("filters wrong-domain and over-broad cardiopulmonary chips for simple URI", () => {
    const rosKeys = flattenFragmentKeys(
      resolveCoughUriRosChipGroupsForTemplate("adult_uri_respiratory", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posAbdominalPain");
    expect(rosKeys).not.toContain("erMseRosChips.posVomiting");
    expect(rosKeys).not.toContain("erMseRosChips.rfPregnancyConcern");
    expect(rosKeys).toContain("erMseRosChips.posSob");
    expect(rosKeys).toContain("erMseRosChips.posFever");

    const visible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "cough",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locAbdominalPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.cough.diffPulmonaryEmbolism")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.cough.diffSepsis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.cough.diffPneumonia")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.cough.diffInfluenza")).toBe(true);

    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "adult_uri_respiratory") ?? null;
    const mdmKeys = buildMdmTemplateDropdownOptions(template).map((option) => option.fragmentKey);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
  });

  it("allows limited GI overlap for flu-like illness only", () => {
    const fluVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "flu_like_illness_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(fluVisible.has("providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.hpiFever")).toBe(
      true
    );
    expect(fluVisible.has("erMseRosChips.posVomiting")).toBe(true);

    const uriVisible = collectCoughUriVisibleStickyNoteFragmentKeys({
      templateId: "uri_congestion_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(uriVisible.has("erMseRosChips.posVomiting")).toBe(false);
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "adult_uri_respiratory" });
    expect(next.activeTemplateId).toBe("adult_uri_respiratory");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.heent).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not regress SOB governance", () => {
    const sobVisible = collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
      templateId: "sob",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffPulmonaryEmbolism")).toBe(true);
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.diffHeartFailureExacerbation")).toBe(true);
    expect(sobVisible.has("providerDocumentationComplaintIntel.sob.hpiOrthopnea")).toBe(true);

    const sobMdm = buildMdmTemplateDropdownOptions(
      PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "sob") ?? null
    ).map((option) => option.fragmentKey);
    expect(sobMdm).toContain("erMseMdmChips.waCardiopulmonary");
    expect(sobMdm).toContain("erMseMdmChips.planEcg");
    expect(sobMdm).toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("does not regress urinary, diarrhea, nausea, or abdominal governance", () => {
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
  });
});
