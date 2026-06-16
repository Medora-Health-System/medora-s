/**
 * MEDUI.ED.ME.2X-R — Psychiatric / behavioral sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { PSYCH_BEHAVIORAL_TEMPLATE_IDS } from "./providerDocumentationPsychBehavioralComplaintIntelGoldStandard";

export const PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS = PSYCH_BEHAVIORAL_TEMPLATE_IDS;

export type PsychBehavioralGovernedTemplateId = (typeof PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(PSYCH_BEHAVIORAL_GOVERNED_TEMPLATE_IDS);

export const PSYCH_BEHAVIORAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posDysuria",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.heentDentalCaries",
  "providerDocumentationWorkspace.stickerHpiDysuria",
  "providerDocumentationWorkspace.stickerRosDysuria",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const PSYCH_BEHAVIORAL_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.alteredMentalStatusComplaintV1.",
  "providerDocumentationComplaintIntel.focalWeaknessComplaintV1.",
  "providerDocumentationComplaintIntel.numbnessTinglingComplaintV1.",
  "providerDocumentationComplaintIntel.gaitInstabilityFallsNeuroComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.constipationComplaintV1.",
  "providerDocumentationComplaintIntel.giBleedComplaintV1.",
  "providerDocumentationComplaintIntel.herniaComplaintV1.",
  "providerDocumentationComplaintIntel.rectalPainComplaintV1.",
  "providerDocumentationComplaintIntel.dysphagiaComplaintV1.",
  "providerDocumentationComplaintIntel.flankPain.",
  "providerDocumentationComplaintIntel.renalFailureSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.hyperglycemia.",
  "providerDocumentationComplaintIntel.hypoglycemia.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.dentalOral.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaint.",
] as const;

export function isPsychBehavioralGovernedTemplate(
  templateId: string | null | undefined
): templateId is PsychBehavioralGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isPsychBehavioralDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    PSYCH_BEHAVIORAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof PSYCH_BEHAVIORAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return PSYCH_BEHAVIORAL_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterPsychBehavioralChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isPsychBehavioralDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolvePsychBehavioralRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isPsychBehavioralGovernedTemplate(templateId)) return baseGroups;
  return filterPsychBehavioralChipGroups(baseGroups);
}

export function resolvePsychBehavioralExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isPsychBehavioralGovernedTemplate(templateId)) return baseGroups;
  return filterPsychBehavioralChipGroups(baseGroups);
}

export function resolvePsychBehavioralHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isPsychBehavioralGovernedTemplate(templateId)) return baseGroups;
  return filterPsychBehavioralChipGroups(baseGroups);
}

export function filterPsychBehavioralMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isPsychBehavioralGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isPsychBehavioralDeniedStickyNoteFragment(option.fragmentKey));
}

export function allowedPsychBehavioralComplaintIntelFragmentKeys(bundleFragmentKeys: string[]): Set<string> {
  return new Set(bundleFragmentKeys);
}

export function filterStickyNoteChipsForPsychBehavioralTemplate<TChip extends { fragmentKey: string }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  chips: TChip[],
  allowedComplaintIntelKeys: Set<string>
): TChip[] {
  if (!isPsychBehavioralGovernedTemplate(templateId)) return chips;
  const denied = new Set<string>(PSYCH_BEHAVIORAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS);
  const deniedPrefixes = PSYCH_BEHAVIORAL_DENIED_HPI_FRAGMENT_PREFIXES;
  return chips.filter((chip) => {
    if (denied.has(chip.fragmentKey)) return false;
    if (deniedPrefixes.some((prefix) => chip.fragmentKey.startsWith(prefix))) return false;
    if (chip.fragmentKey.startsWith("providerDocumentationComplaintIntel.")) {
      return allowedComplaintIntelKeys.has(chip.fragmentKey);
    }
    return true;
  });
}

export function collectPsychBehavioralComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
