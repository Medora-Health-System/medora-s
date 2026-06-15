import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectDehydrationViralIllnessVisibleStickyNoteFragmentKeys,
  DEHYDRATION_VIRAL_ILLNESS_ALLOWED_EXAM_SECTION_IDS,
  DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS,
  filterDehydrationViralIllnessMdmTemplateOptionsForTemplate,
  resolveDehydrationViralIllnessExamChipGroupsForTemplate,
  resolveDehydrationViralIllnessRosChipGroupsForTemplate,
  templateUsesDehydrationViralIllnessStickyNoteGovernance,
} from "@/lib/providerDocumentationDehydrationViralIllnessGovernance";
import { complaintIntelligenceMdmChipBindingsForTemplate } from "@/lib/providerDocumentationComplaintIntelligenceWorkspaceChips";
import { assertTrackCCompliance } from "@/lib/providerDocumentationComplaintIntelligenceTrackC";
import { DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";
import { collectSoreThroatVisibleStickyNoteFragmentKeys } from "./providerDocumentationSoreThroatGovernance";

const TEMPLATE_ID = "dehydration_viral_illness_complaint_v1" as const;
const INTEL = "providerDocumentationComplaintIntel.dehydrationViralIllnessComplaintV1";

const WORKSPACE_ROS_CHIP_GROUPS = [
  {
    field: "rosImportantPositives" as const,
    chips: ["posFever", "posVomiting", "posChestPain", "posSob", "posDizziness"].map((key) => ({
      fragmentKey: `erMseRosChips.${key}`,
    })),
  },
  {
    field: "rosRedFlags" as const,
    chips: ["rfAlteredMs", "rfHypotensionConcern"].map((key) => ({ fragmentKey: `erMseRosChips.${key}` })),
  },
  {
    field: "rosImportantNegatives" as const,
    chips: ["negDeniesChestPain", "negDeniesFever"].map((key) => ({ fragmentKey: `erMseRosChips.${key}` })),
  },
];

const WORKSPACE_EXAM_CHIP_GROUPS = [
  { sectionId: "general", chips: ["genAlert"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "abdomen", chips: ["abdSoft"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "skin", chips: ["skinWarmDry"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "neuroPsych", chips: ["neuroAlertOriented"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "cardiovascular", chips: ["cardioRrr"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })) },
  { sectionId: "reassessment", chips: [{ fragmentKey: "erMseMdmChips.planReassess" }] },
];

const WORKSPACE_HPI_CHIP_GROUPS = [
  {
    titleKey: "providerDocumentationWorkspace.chipLocation",
    field: "hpi" as const,
    chips: ["locChestPain", "assocFever", "assocVomiting"].map((key) => ({
      labelKey: `erMseHpiChips.${key}`,
      fragmentKey: `erMseHpiChips.${key}`,
    })),
  },
];

describe("providerDocumentationDehydrationViralIllnessGovernance — MEDUI.ED.ME.2U", () => {
  it("governs dehydration viral illness template in catalog", () => {
    expect(DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS).toEqual(["dehydration_viral_illness_complaint_v1"]);
    expect(templateUsesDehydrationViralIllnessStickyNoteGovernance(TEMPLATE_ID)).toBe(true);
    expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === TEMPLATE_ID)).toBe(true);
  });

  it("passes Track C gold standard from inception", () => {
    expect(() => assertTrackCCompliance(DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL)).not.toThrow();
  });

  it("exposes chart-ready dehydration HPI, exam, and MDM chips", () => {
    const visible = collectDehydrationViralIllnessVisibleStickyNoteFragmentKeys({
      templateId: TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has(`${INTEL}.hpiDecreasedOralIntake`)).toBe(true);
    expect(visible.has(`${INTEL}.examDryMucousMembranes`)).toBe(true);
    expect(visible.has(`${INTEL}.diffViralGastroenteritis`)).toBe(true);
    expect(visible.has(`${INTEL}.riskLowSuspicionSevereDehydration`)).toBe(true);
    expect(visible.has(`${INTEL}.impDehydration`)).toBe(true);
    expect(visible.has(`${INTEL}.planIvFluidsAdministered`)).toBe(true);
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseRosChips.posChestPain")).toBe(false);
    expect(visible.has("erMseExamChips.cardioRrr")).toBe(false);
  });

  it("restricts exam sections to dehydration-relevant sections", () => {
    const examSectionIds = resolveDehydrationViralIllnessExamChipGroupsForTemplate(
      TEMPLATE_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...DEHYDRATION_VIRAL_ILLNESS_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("cardiovascular");
  });

  it("supports MDM.1 workspace chip bindings for all gold-standard MDM sections", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === TEMPLATE_ID) ?? null;
    expect(complaintIntelligenceMdmChipBindingsForTemplate(template).map((binding) => binding.intelField)).toEqual([
      "mdmWorkingAssessment",
      "mdmDifferentialSynthesis",
      "mdmDataReviewed",
      "mdmRiskStratification",
      "mdmClinicalRationale",
      "mdmPlanSummary",
    ]);
  });

  it("keeps infectious MDM while hiding cardiopulmonary pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === TEMPLATE_ID) ?? null;
    const mdmKeys = filterDehydrationViralIllnessMdmTemplateOptionsForTemplate(
      TEMPLATE_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys.some((key) => key.includes("dehydrationViralIllnessComplaintV1"))).toBe(true);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: TEMPLATE_ID });
    expect(next.activeTemplateId).toBe(TEMPLATE_ID);
    expect(next.hpi).toBe("");

    const fragmentKey = `${INTEL}.impViralGastroenteritis`;
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not regress sore throat governance", () => {
    const soreThroatVisible = collectSoreThroatVisibleStickyNoteFragmentKeys({
      templateId: "sore_throat_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(soreThroatVisible.has("providerDocumentationComplaintIntel.soreThroatComplaintV1.hpiPainfulSwallowing")).toBe(
      true
    );
  });
});
