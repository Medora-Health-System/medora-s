/**
 * MEDUI.ED.ME.2G — Adult fever sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import {
  getTemplateHpiDimensionGroups,
  resolveHpiChipGroupsForTemplate as resolveBaseHpiChipGroupsForTemplate,
  type ProviderDocumentationHpiDimensionGroup,
} from "./providerDocumentationTemplateHpiDimensions";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { FEVER_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const ADULT_FEVER_GOVERNED_TEMPLATE_IDS = ["fever_complaint_v1"] as const satisfies readonly ProviderDocumentationTemplateId[];

export type AdultFeverGovernedTemplateId = (typeof ADULT_FEVER_GOVERNED_TEMPLATE_IDS)[number];

const ADULT_FEVER_GOVERNED_TEMPLATE_ID_SET = new Set<string>(ADULT_FEVER_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when an adult fever template is active. */
export const ADULT_FEVER_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseRosChips.posHeadache",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
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
  "erMseExamChips.skinLacerationPresent",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const ADULT_FEVER_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.penetratingInjury.",
  "providerDocumentationComplaintIntel.pediatricTrauma.",
  "providerDocumentationComplaintIntel.fractureConcern.",
  "providerDocumentationComplaintIntel.lacerationComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.strokeSymptoms.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.pediatricFever.",
] as const;

export const ADULT_FEVER_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "respiratory",
  "cardiovascular",
  "abdomen",
  "skin",
  "reassessment",
] as const;

export const ADULT_FEVER_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.feverComplaintV1.hpiFeverBeganToday",
  "providerDocumentationComplaintIntel.feverComplaintV1.hpiCough",
  "providerDocumentationComplaintIntel.feverComplaintV1.hpiUrinarySymptoms",
  "providerDocumentationComplaintIntel.feverComplaintV1.hpiImmunocompromisedHistory",
  "providerDocumentationComplaintIntel.feverComplaintV1.rosFever",
  "providerDocumentationComplaintIntel.feverComplaintV1.rfPersistentHighFever",
  "providerDocumentationComplaintIntel.feverComplaintV1.rfAlteredMentalStatus",
  "providerDocumentationComplaintIntel.feverComplaintV1.examWellAppearing",
  "providerDocumentationComplaintIntel.feverComplaintV1.examRashPresent",
  "providerDocumentationComplaintIntel.feverComplaintV1.examAlertAndOriented",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffViralSyndrome",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffPneumonia",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffUrinaryTractInfection",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffCellulitis",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffSepsis",
  "providerDocumentationComplaintIntel.feverComplaintV1.diffMeningitis",
  "providerDocumentationComplaintIntel.feverComplaintV1.mdmCbcReviewed",
  "providerDocumentationComplaintIntel.feverComplaintV1.planAntipyreticTherapyAdministered",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(ADULT_FEVER_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_ADULT_FEVER_TEMPLATE_ID = {
  fever_complaint_v1: FEVER_COMPLAINT_V1_INTEL,
} as const satisfies Partial<Record<AdultFeverGovernedTemplateId, typeof FEVER_COMPLAINT_V1_INTEL>>;

export function templateUsesAdultFeverStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is AdultFeverGovernedTemplateId {
  return Boolean(templateId && ADULT_FEVER_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isAdultFeverDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return ADULT_FEVER_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAdultFeverDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveAdultFeverRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesAdultFeverStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveAdultFeverExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesAdultFeverStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (ADULT_FEVER_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAdultFeverDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveAdultFeverHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesAdultFeverStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAdultFeverDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterAdultFeverMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesAdultFeverStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isAdultFeverDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectAdultFeverVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: AdultFeverGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveAdultFeverHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isAdultFeverDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveAdultFeverRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveAdultFeverExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isAdultFeverDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isAdultFeverDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_ADULT_FEVER_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isAdultFeverDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
