import { describe, expect, it } from "vitest";
import {
  applyProviderDocumentationTemplate,
  emptyProviderDocumentationWorkspaceState,
  PROVIDER_DOCUMENTATION_TEMPLATES,
  toggleDocumentationFragment,
} from "@/lib/providerDocumentationModel";
import { buildMdmTemplateDropdownOptions } from "@/lib/providerDocumentationMdmTemplateCatalog";
import {
  collectMaleGuVisibleStickyNoteFragmentKeys,
  filterMaleGuMdmTemplateOptionsForTemplate,
  MALE_GU_ALLOWED_EXAM_SECTION_IDS,
  MALE_GU_GOVERNED_TEMPLATE_IDS,
  resolveMaleGuExamChipGroupsForTemplate,
  resolveMaleGuRosChipGroupsForTemplate,
  templateUsesMaleGuStickyNoteGovernance,
} from "@/lib/providerDocumentationMaleGuGovernance";
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
    chips: ["heentHeadAtraumatic", "heentPerrla"].map((key) => ({ fragmentKey: `erMseExamChips.${key}` })),
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
      "locFlankPain",
      "locAbdominalPain",
      "qualPressureLike",
      "assocSob",
      "assocCough",
      "assocDizziness",
    ].map((key) => ({ labelKey: `erMseHpiChips.${key}`, fragmentKey: `erMseHpiChips.${key}` })),
  },
];

function flattenFragmentKeys(groups: Array<{ chips: Array<{ fragmentKey: string }> }>): string[] {
  return groups.flatMap((group) => group.chips.map((chip) => chip.fragmentKey));
}

describe("providerDocumentationMaleGuGovernance — MEDUI.ED.ME.2P", () => {
  it("governs all discovered male GU template IDs in catalog", () => {
    expect(MALE_GU_GOVERNED_TEMPLATE_IDS).toEqual([
      "male_genital_complaint",
      "testicular_pain_complaint_v1",
      "dysuria_complaint_v1",
      "hematuria_complaint_v1",
      "urinary_retention_complaint_v1",
    ]);
    for (const templateId of MALE_GU_GOVERNED_TEMPLATE_IDS) {
      expect(templateUsesMaleGuStickyNoteGovernance(templateId)).toBe(true);
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.some((template) => template.id === templateId)).toBe(true);
    }
  });

  it("exposes testicular pain, torsion, and epididymitis/orchitis chips", () => {
    const visible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "testicular_pain_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.rosTesticularPain")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.diffTorsion")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.diffEpididymitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.diffOrchitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.testicularPainComplaintV1.examScrotalSwellingTenderness")).toBe(
      true
    );
  });

  it("exposes scrotal swelling, STI exposure, and male genital complaint-intel chips", () => {
    const visible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "male_genital_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.hpiScrotalSwelling")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.rosScrotalSwelling")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.hpiStiExposureReviewed")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.diffTesticularTorsion")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.diffEpididymitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.diffOrchitis")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.examTesticularTenderness")).toBe(true);
    expect(visible.has("providerDocumentationComplaintIntel.maleGenitalComplaint.examPenileDischarge")).toBe(true);
  });

  it("exposes dysuria and hematuria complaint-intel chips on urinary overlap templates", () => {
    const dysuriaVisible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "dysuria_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(dysuriaVisible.has("providerDocumentationComplaintIntel.dysuriaComplaintV1.rosDysuria")).toBe(true);
    expect(dysuriaVisible.has("providerDocumentationComplaintIntel.dysuriaComplaintV1.diffStiUrethritis")).toBe(true);
    expect(dysuriaVisible.has("providerDocumentationComplaintIntel.dysuriaComplaintV1.examGuExamIfPerformed")).toBe(true);

    const hematuriaVisible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "hematuria_complaint_v1",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(hematuriaVisible.has("providerDocumentationComplaintIntel.hematuriaComplaintV1.rosHematuria")).toBe(true);
    expect(hematuriaVisible.has("providerDocumentationComplaintIntel.hematuriaComplaintV1.rosFlankPain")).toBe(true);
    expect(hematuriaVisible.has("providerDocumentationComplaintIntel.hematuriaComplaintV1.diffStoneDisease")).toBe(true);
  });

  it("hides chest pain, URI, female pelvic, pregnancy, headache, and vertigo wrong-domain chips", () => {
    const visible = collectMaleGuVisibleStickyNoteFragmentKeys({
      templateId: "male_genital_complaint",
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
      hpiBaseGroups: WORKSPACE_HPI_CHIP_GROUPS,
    });
    expect(visible.has("erMseHpiChips.locChestPain")).toBe(false);
    expect(visible.has("erMseHpiChips.assocCough")).toBe(false);
    expect(visible.has("erMseHpiChips.assocDizziness")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.dizzinessSyncope.hpiTrueVertigo")).toBe(false);
    expect(visible.has("providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion")).toBe(false);
    expect(visible.has("erMseRosChips.rfPregnancyConcern")).toBe(false);

    const rosKeys = flattenFragmentKeys(
      resolveMaleGuRosChipGroupsForTemplate("testicular_pain_complaint_v1", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).not.toContain("erMseRosChips.posChestPain");
    expect(rosKeys).not.toContain("erMseRosChips.posSob");
    expect(rosKeys).not.toContain("erMseRosChips.posCough");
    expect(rosKeys).not.toContain("erMseRosChips.posHeadache");
    expect(rosKeys).not.toContain("erMseRosChips.posDizziness");
    expect(rosKeys).toContain("erMseRosChips.rfSeverePain");
  });

  it("restricts exam sections and keeps GU-relevant abdomen findings", () => {
    const examSectionIds = resolveMaleGuExamChipGroupsForTemplate(
      "male_genital_complaint",
      WORKSPACE_EXAM_CHIP_GROUPS
    ).map((group) => group.sectionId);
    expect(examSectionIds).toEqual([...MALE_GU_ALLOWED_EXAM_SECTION_IDS]);
    expect(examSectionIds).not.toContain("heent");
    expect(examSectionIds).not.toContain("respiratory");
    expect(examSectionIds).not.toContain("cardiovascular");
    expect(examSectionIds).not.toContain("musculoskeletal");
    expect(examSectionIds).not.toContain("neuroPsych");

    const examKeys = flattenFragmentKeys(
      resolveMaleGuExamChipGroupsForTemplate("dysuria_complaint_v1", WORKSPACE_EXAM_CHIP_GROUPS)
    );
    expect(examKeys).toContain("erMseExamChips.abdSoft");
    expect(examKeys).not.toContain("erMseExamChips.heentHeadAtraumatic");
    expect(examKeys).not.toContain("erMseExamChips.mskRomNormal");
  });

  it("keeps infectious/GU MDM pathways while hiding EKG and wrong-domain MDM", () => {
    const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === "male_genital_complaint") ?? null;
    const mdmKeys = filterMaleGuMdmTemplateOptionsForTemplate(
      "male_genital_complaint",
      buildMdmTemplateDropdownOptions(template)
    ).map((option) => option.fragmentKey);
    expect(mdmKeys).toContain("erMseMdmChips.waAbdominal");
    expect(mdmKeys).toContain("erMseMdmChips.waInfectious");
    expect(mdmKeys).toContain("erMseMdmChips.planLabs");
    expect(mdmKeys).toContain("erMseMdmChips.planImaging");
    expect(mdmKeys).not.toContain("erMseMdmChips.waCardiopulmonary");
    expect(mdmKeys).not.toContain("erMseMdmChips.waTrauma");
    expect(mdmKeys).not.toContain("erMseMdmChips.waMedIntox");
    expect(mdmKeys).not.toContain("erMseMdmChips.waNeurologic");
    expect(mdmKeys).not.toContain("erMseMdmChips.planEcg");
    expect(mdmKeys).not.toContain("providerDocumentationMdmHighValue.ekgNormal");
  });

  it("preserves sticky-note-only activation and click-to-insert", () => {
    const state = emptyProviderDocumentationWorkspaceState();
    const next = applyProviderDocumentationTemplate({ state, templateId: "testicular_pain_complaint_v1" });
    expect(next.activeTemplateId).toBe("testicular_pain_complaint_v1");
    expect(next.hpi).toBe("");
    expect(next.physicalExam.abdomen).toBe("");

    const fragmentKey = "providerDocumentationComplaintIntel.testicularPainComplaintV1.diffTorsion";
    expect(toggleDocumentationFragment("", fragmentKey)).toContain(fragmentKey);
  });

  it("does not affect unrelated templates", () => {
    const rosKeys = flattenFragmentKeys(
      resolveMaleGuRosChipGroupsForTemplate("chest_pain", WORKSPACE_ROS_CHIP_GROUPS)
    );
    expect(rosKeys).toContain("erMseRosChips.posChestPain");

    const examSectionIds = resolveMaleGuExamChipGroupsForTemplate("headache", WORKSPACE_EXAM_CHIP_GROUPS).map(
      (group) => group.sectionId
    );
    expect(examSectionIds.length).toBe(WORKSPACE_EXAM_CHIP_GROUPS.length);
  });

  it("does not regress prior governance families through extremity/MSK", () => {
    const utiVisible = collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
      rosBaseGroups: WORKSPACE_ROS_CHIP_GROUPS,
      examBaseGroups: WORKSPACE_EXAM_CHIP_GROUPS,
    });
    expect(utiVisible.has("providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria")).toBe(true);

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
