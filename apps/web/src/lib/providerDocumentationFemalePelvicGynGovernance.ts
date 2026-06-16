/**
 * MEDUI.ED.ME.2I — Female pelvic / GYN sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import {
  getTemplateHpiDimensionGroups,
  resolveHpiChipGroupsForTemplate as resolveBaseHpiChipGroupsForTemplate,
  type ProviderDocumentationHpiDimensionGroup,
} from "./providerDocumentationTemplateHpiDimensions";
import {
  FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  PELVIC_PAIN_COMPLAINT_V1_INTEL,
  VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
} from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS = [
  "female_pelvic_gyn_complaint",
  "pelvic_pain_complaint_v1",
  "vaginal_bleeding_complaint_v1",
  "vaginal_discharge_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type FemalePelvicGynGovernedTemplateId = (typeof FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS)[number];

const FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_ID_SET = new Set<string>(FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a female pelvic/GYN template is active. */
export const FEMALE_PELVIC_GYN_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocSob",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesHeadache",
  "erMseRosChips.rfRespDistress",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respWheezing",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioPeripheralPulsesPresent",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.neuroAlertOriented",
  "erMseExamChips.neuroFollowsCommands",
  "erMseExamChips.neuroSpeechClear",
  "erMseExamChips.neuroFocalDeficitNoted",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskTendernessPresent",
  "erMseExamChips.mskSwellingPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const FEMALE_PELVIC_GYN_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.uriRespiratory.",
  "providerDocumentationComplaintIntel.cough.",
  "providerDocumentationComplaintIntel.coughComplaintV1.",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1.",
  "providerDocumentationComplaintIntel.chestCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.",
  "providerDocumentationComplaintIntel.asthmaWheezing.",
  "providerDocumentationComplaintIntel.copdExacerbationComplaintV1.",
  "providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.hemoptysisComplaintV1.",
  "providerDocumentationComplaintIntel.backPainTrauma.",
  "providerDocumentationComplaintIntel.backPainComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
  "providerDocumentationComplaintIntel.pediatricFever.",
  "providerDocumentationComplaintIntel.testicularPainComplaintV1.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.handWristInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.strokeSymptoms.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

export const FEMALE_PELVIC_GYN_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "abdomen",
  "skin",
  "reassessment",
] as const;

export const FEMALE_PELVIC_GYN_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPelvicPain",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiVaginalBleeding",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiVaginalDischarge",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiPregnancyConcern",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiLastMenstrualPeriodDocumented",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.hpiStiExposure",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffEctopicPregnancy",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffOvarianTorsion",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.diffPelvicInflammatoryDisease",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.mdmPregnancyTestReviewed",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.mdmPelvicUltrasoundReviewed",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.examCervicalMotionTendernessPresent",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffEctopicPregnancy",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffOvarianTorsion",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.diffPelvicInflammatoryDisease",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.diffEctopicPregnancy",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.diffPelvicInflammatoryDisease",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.diffVaginitis",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(FEMALE_PELVIC_GYN_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_FEMALE_PELVIC_GYN_TEMPLATE_ID = {
  female_pelvic_gyn_complaint: FEMALE_PELVIC_GYN_COMPLAINT_INTEL,
  pelvic_pain_complaint_v1: PELVIC_PAIN_COMPLAINT_V1_INTEL,
  vaginal_bleeding_complaint_v1: VAGINAL_BLEEDING_COMPLAINT_V1_INTEL,
  vaginal_discharge_complaint_v1: VAGINAL_DISCHARGE_COMPLAINT_V1_INTEL,
} as const;

export function templateUsesFemalePelvicGynStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is FemalePelvicGynGovernedTemplateId {
  return Boolean(templateId && FEMALE_PELVIC_GYN_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isFemalePelvicGynDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return FEMALE_PELVIC_GYN_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFemalePelvicGynDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveFemalePelvicGynRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesFemalePelvicGynStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveFemalePelvicGynExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesFemalePelvicGynStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (FEMALE_PELVIC_GYN_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFemalePelvicGynDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveFemalePelvicGynHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesFemalePelvicGynStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFemalePelvicGynDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterFemalePelvicGynMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesFemalePelvicGynStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isFemalePelvicGynDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectFemalePelvicGynVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: FemalePelvicGynGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveFemalePelvicGynHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isFemalePelvicGynDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveFemalePelvicGynRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveFemalePelvicGynExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isFemalePelvicGynDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isFemalePelvicGynDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_FEMALE_PELVIC_GYN_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isFemalePelvicGynDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
