import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectDentalOralVisibleStickyNoteFragmentKeys,
  DENTAL_ORAL_ALLOWED_EXAM_SECTION_IDS,
  DENTAL_ORAL_GOVERNED_TEMPLATE_IDS,
  filterDentalOralMdmTemplateOptionsForTemplate,
  resolveDentalOralExamChipGroupsForTemplate,
  resolveDentalOralRosChipGroupsForTemplate,
  templateUsesDentalOralStickyNoteGovernance,
} from "@/lib/providerDocumentationDentalOralGovernance";
import { collectMaleGuVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationMaleGuGovernance";
import { collectExtremityMskVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationExtremityMskGovernance";
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
import { collectTraumaVisibleStickyNoteFragmentKeys } from "@/lib/providerDocumentationTraumaGovernance";

const DENTAL_TEMPLATE_ID = "dental_pain_infection_complaint_v1" as const;

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
      "posCough",
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
    chips: ["heentHeadAtraumatic", "heentOropharynxClear", "heentDryMm"].map((key) => ({
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
    chips: ["skinWarmDry", "skinRashPresent"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "musculoskeletal",
    chips: ["mskTendernessPresent", "mskRomNormal"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
  },
  {
    sectionId: "neuroPsych",
    chips: ["neuroAlertOriented", "neuroFocalDeficitNoted"].map((key) => ({
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
      "locHeadache",
      "locBackPain",
      "locLimbPain",
      "locAbdominalPain",
      "locFlankPain",
      "qualPressureLike",
      "assocSob",
      "assocCough",
      "assocDizziness",
      "assocFever",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationDentalOralGovernance — MEDUI.ED.ME.2Q", () => {
  it("governs all discovered dental/oral template IDs in catalog", () => {
    expect(DENTAL_ORAL_GOVERNED_TEMPLATE_IDS).toEqual(["dental_pain_infection_complaint_v1"]);
    for (const templateId of DENTAL_ORAL_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesDentalOralStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes dental pain, abscess, facial swelling, and oral lesion complaint-intel chips", () => {
    const visible = collectDentalOralVisibleStickyNoteFragmentKeys({
      templateId: DENTAL_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.hpiToothPainSwellingDrainage")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.rosDentalPain")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.rosFacialSwelling")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffDentalInfection")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffGingivitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.examGingivalFindingsIfDocumented")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.examOralSwellingIfDocumented")).toBe(
      true
    );
    expect(visible.has("providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.mdmDentalOralSurgeryFollowUpIfIndicated")).toBe(
      true
    );
  });

  it("hides chest pain, UTI, pelvic, headache, and vertigo wrong-domain chips", () => {
    const visible = collectDentalOralVisibleStickyNoteFragmentKeys({
      templateId: DENTAL_TEMPLATE_ID,
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.qualPressureLike")).toBe(false);
    expect(visible.has("erMseHpiChips.assocDizziness")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiTrueVertigo")).toBe(false);
    expect(visible.has("erMseRosChips.rfPregnancyConcern")).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveDentalOralRosChipGroupsForTemplate(DENTAL_TEMPLATE_ID, WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posCough");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.posDizziness");
    expect(rosKeys).toContain("erMseRosChips.posFever");
    expect(rosKeys).toContain("erMseRosChips.posVomiting");
  });

  it("restricts exam sections to dental-relevant sections and keeps HEENT/oral findings", () => {
    const examSectionIds = resolveDentalOralExamChipGroupsForTemplate(
      DENTAL_TEMPLATE_ID,
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...DENTAL_ORAL_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("abdomen");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");

    const examKeys = flattenFragmentKeys(
      resolveDentalOralExamChipGroupsForTemplate(DENTAL_TEMPLATE_ID, WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.heentOropharynxClear");
    expect(examKeys).toContain("erMseExamChips.skinWarmDry");
    expect(examKeys).not.toContain("erMseExamChips.skinRashPresent");
    expect(examKeys).not.toContain("erMseExamChips.respClearBs");
  });

  it("keeps infectious/dental MDM while hiding EKG and wrong-domain pathways", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === DENTAL_TEMPLATE_ID) ?? null;
    const mdmKeys = filterDentalOralMdmTemplateOptionsForTemplate(
      DENTAL_TEMPLATE_ID,
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.waUndifferentiated");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys.some((key) => key.includes("dentalPainInfectionComplaintV1"))).toBe(true);
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waAbdominal");
    expect(mdmKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.waNeurologic");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: DENTAL_TEMPLATE_ID });
    expect(next.activeTemplateId).toBe(DENTAL_TEMPLATE_ID);
    expect(next.hpi).toBe("");
    expect(next.physicalExam.heent).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.diffAbscess";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveDentalOralRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveDentalOralExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress prior governance families through male GU", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

    const maleGuVisible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "testicular_pain_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(maleGuVisible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.diffTorsion")).toBe(true);

    const mskVisible = collectExtremityMskVisibleStickyNoteFragmentKeys({
      templateId: "trauma_musculoskeletal",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(mskVisible.has("erMseHpiChips.locLimbPain")).toBe(true);

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
    expect(dizzinessVisible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiTrueVertigo")).toBe(true);

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
