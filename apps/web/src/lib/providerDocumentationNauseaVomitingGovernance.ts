/**
 * MEDUI.ED.ME.2C — Nausea / vomiting sticky note governance (adult, pediatric, v1).
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
  ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { NAUSEA_VOMITING_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";
import { NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL } from "./providerDocumentationEndocrineMetabolicComplaintIntelligence19Mdm8";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS = [
  "nausea_vomiting",
  "adult_nausea_vomiting",
  "nausea_vomiting_complaint_v1",
  "nausea_vomiting_metabolic_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type NauseaVomitingGovernedTemplateId = (typeof NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS)[number];

const NAUSEA_VOMITING_GOVERNED_TEMPLATE_ID_SET = new Set<string>(NAUSEA_VOMITING_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a nausea/vomiting template is active. */
export const NAUSEA_VOMITING_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locFlankPain",
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
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioPeripheralPulsesPresent",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respWheezing",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
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
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
  "providerDocumentationTemplateHpiDimensions.adultNauseaVomiting.assocUrinarySymptoms",
] as const;

export const NAUSEA_VOMITING_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
] as const;

export const NAUSEA_VOMITING_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "abdomen",
  "neuroPsych",
  "reassessment",
] as const;

export const NAUSEA_VOMITING_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiBeganToday",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiMultipleEpisodesVomiting",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiUnableToTolerateOralIntake",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.hpiConcernForDehydration",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.rosNausea",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.rosVomiting",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.rosDeniesHematemesis",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.examDryMucousMembranes",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.examEpigastricTenderness",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.examNoGuarding",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.diffGastroenteritis",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.diffBowelObstruction",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.riskSelfLimitedIllnessLow",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.impViralGastroenteritis",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.planIvFluidsAdministered",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiParentReportsVomiting",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiBiliousEmesis",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.hpiStillMakingWetDiapers",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(NAUSEA_VOMITING_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_NAUSEA_VOMITING_TEMPLATE_ID: Partial<
  Record<NauseaVomitingGovernedTemplateId, typeof ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL>
> = {
  nausea_vomiting: PEDIATRIC_VOMITING_DIARRHEA_COMPLAINT_INTEL,
  adult_nausea_vomiting: ADULT_NAUSEA_VOMITING_COMPLAINT_INTEL,
  nausea_vomiting_complaint_v1: NAUSEA_VOMITING_COMPLAINT_V1_INTEL,
  nausea_vomiting_metabolic_complaint_v1: NAUSEA_VOMITING_METABOLIC_COMPLAINT_V1_INTEL,
};

export function templateUsesNauseaVomitingStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is NauseaVomitingGovernedTemplateId {
  return Boolean(templateId && NAUSEA_VOMITING_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isNauseaVomitingDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return NAUSEA_VOMITING_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isNauseaVomitingDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveNauseaVomitingRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesNauseaVomitingStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveNauseaVomitingExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesNauseaVomitingStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) =>
      (NAUSEA_VOMITING_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId)
    )
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isNauseaVomitingDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveNauseaVomitingHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesNauseaVomitingStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isNauseaVomitingDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterNauseaVomitingMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesNauseaVomitingStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isNauseaVomitingDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectNauseaVomitingVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: NauseaVomitingGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveNauseaVomitingHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isNauseaVomitingDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveNauseaVomitingRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveNauseaVomitingExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isNauseaVomitingDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isNauseaVomitingDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_NAUSEA_VOMITING_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      keys.add(fragmentKey);
    }
  }

  return keys;
}
