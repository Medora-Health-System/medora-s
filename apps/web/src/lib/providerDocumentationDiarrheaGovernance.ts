/**
 * MEDUI.ED.ME.2B — Diarrhea sticky note governance (adult, pediatric, v1).
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
  ADULT_DIARRHEA_COMPLAINT_INTEL,
  PEDIATRIC_DIARRHEA_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { DIARRHEA_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const DIARRHEA_GOVERNED_TEMPLATE_IDS = [
  "adult_diarrhea",
  "diarrhea",
  "diarrhea_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type DiarrheaGovernedTemplateId = (typeof DIARRHEA_GOVERNED_TEMPLATE_IDS)[number];

const DIARRHEA_GOVERNED_TEMPLATE_ID_SET = new Set<string>(DIARRHEA_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a diarrhea template is active. */
export const DIARRHEA_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
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
  "providerDocumentationTemplateHpiDimensions.adultDiarrhea.assocUrinarySymptoms",
] as const;

export const DIARRHEA_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
] as const;

export const DIARRHEA_ALLOWED_EXAM_SECTION_IDS = ["general", "heent", "abdomen", "reassessment"] as const;

export const DIARRHEA_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiWateryDiarrhea",
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiBloodInStool",
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiRecentTravel",
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiSickContacts",
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiRecentAntibioticUse",
  "providerDocumentationComplaintIntel.adultDiarrhea.hpiConcernForDehydration",
  "providerDocumentationComplaintIntel.adultDiarrhea.examDryMucousMembranes",
  "providerDocumentationComplaintIntel.adultDiarrhea.examNoGuarding",
  "providerDocumentationComplaintIntel.adultDiarrhea.examNoReboundTenderness",
  "providerDocumentationComplaintIntel.adultDiarrhea.diffViralGastroenteritis",
  "providerDocumentationComplaintIntel.adultDiarrhea.diffCDifficileColitis",
  "providerDocumentationComplaintIntel.adultDiarrhea.diffDehydration",
  "providerDocumentationComplaintIntel.adultDiarrhea.mdmStoolStudiesReviewed",
  "providerDocumentationComplaintIntel.adultDiarrhea.planIvFluidsAdministered",
  "providerDocumentationComplaintIntel.pediatricDiarrhea.hpiStillMakingWetDiapers",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.hpiBloodInStool",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(DIARRHEA_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_DIARRHEA_TEMPLATE_ID: Partial<
  Record<DiarrheaGovernedTemplateId, typeof ADULT_DIARRHEA_COMPLAINT_INTEL>
> = {
  adult_diarrhea: ADULT_DIARRHEA_COMPLAINT_INTEL,
  diarrhea: PEDIATRIC_DIARRHEA_COMPLAINT_INTEL,
  diarrhea_complaint_v1: DIARRHEA_COMPLAINT_V1_INTEL,
};

export function templateUsesDiarrheaStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is DiarrheaGovernedTemplateId {
  return Boolean(templateId && DIARRHEA_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isDiarrheaDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return DIARRHEA_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDiarrheaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDiarrheaRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesDiarrheaStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveDiarrheaExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesDiarrheaStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) =>
      (DIARRHEA_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId)
    )
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDiarrheaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDiarrheaHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesDiarrheaStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDiarrheaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterDiarrheaMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesDiarrheaStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isDiarrheaDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectDiarrheaVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: DiarrheaGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveDiarrheaHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isDiarrheaDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveDiarrheaRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveDiarrheaExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isDiarrheaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isDiarrheaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_DIARRHEA_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      keys.add(fragmentKey);
    }
  }

  return keys;
}
