/**
 * MEDUI.ED.ME.2A — Urinary Symptoms / UTI gold-standard sticky note governance.
 * Complaint-specific chip filtering for `urinary_symptoms` only.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { getTemplateHpiDimensionGroups } from "./providerDocumentationTemplateHpiDimensions";
import { UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL } from "./providerDocumentationComplaintIntelligence";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID = "urinary_symptoms" as const satisfies ProviderDocumentationTemplateId;

export type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

export type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

/** Fragment keys that must not appear when urinary_symptoms is active. */
export const URINARY_SYMPTOMS_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocSob",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posDizziness",
  "erMseRosChips.posHeadache",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.negDeniesHeadache",
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
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

/** Cardiac / exertional location prefixes denied for urinary_symptoms HPI dimensions. */
export const URINARY_SYMPTOMS_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationTemplateLocation.abdominalPain.",
] as const;

export const URINARY_SYMPTOMS_ALLOWED_EXAM_SECTION_IDS = ["general", "abdomen", "reassessment"] as const;

export const URINARY_SYMPTOMS_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiDysuria",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiUrinaryFrequency",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiUrinaryUrgency",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiHematuria",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiFlankPain",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.hpiSuprapubicDiscomfort",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.examRightCvaTenderness",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.diffCystitis",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.diffPyelonephritis",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(URINARY_SYMPTOMS_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

export function templateUsesUrinarySymptomsStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is typeof URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID {
  return templateId === URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID;
}

export function isUrinarySymptomsDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return URINARY_SYMPTOMS_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

export function isUrinarySymptomsDeniedHpiFragment(fragmentKey: string): boolean {
  return isUrinarySymptomsDeniedStickyNoteFragment(fragmentKey);
}

export function resolveRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesUrinarySymptomsStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isUrinarySymptomsDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesUrinarySymptomsStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) =>
      (URINARY_SYMPTOMS_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId)
    )
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isUrinarySymptomsDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesUrinarySymptomsStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isUrinarySymptomsDeniedStickyNoteFragment(option.fragmentKey));
}

/** Aggregates governed sticky-note fragment keys for urinary_symptoms regression tests. */
export function collectUrinarySymptomsVisibleStickyNoteFragmentKeys({
  rosBaseGroups,
  examBaseGroups,
}: {
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
}): Set<string> {
  const keys = new Set<string>();
  const template =
    PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID) ?? null;

  for (const group of getTemplateHpiDimensionGroups(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID) ?? []) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  for (const group of resolveRosChipGroupsForTemplate(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveExamChipGroupsForTemplate(URINARY_SYMPTOMS_GOVERNED_TEMPLATE_ID, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) keys.add(fragmentKey);
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) keys.add(fragmentKey);
    }
  }

  for (const fragmentKey of flattenComplaintIntelligenceKeys(UTI_URINARY_SYMPTOMS_COMPLAINT_INTEL)) {
    keys.add(fragmentKey);
  }

  return keys;
}
