/**
 * MEDUI.ED.ME.2W-R — Neuro / stroke / weakness sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { NEURO_STROKE_WEAKNESS_TEMPLATE_IDS } from "./providerDocumentationNeuroStrokeWeaknessComplaintIntelGoldStandard";

export const NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS = NEURO_STROKE_WEAKNESS_TEMPLATE_IDS;

export type NeuroStrokeWeaknessGovernedTemplateId = (typeof NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(NEURO_STROKE_WEAKNESS_GOVERNED_TEMPLATE_IDS);

export const NEURO_STROKE_WEAKNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.mskDeformityNoted",
  "providerDocumentationWorkspace.stickerHpiDysuria",
  "providerDocumentationWorkspace.stickerRosDysuria",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
] as const;

export const NEURO_STROKE_WEAKNESS_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.dentalOral.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaint.",
] as const;

export function isNeuroStrokeWeaknessGovernedTemplate(
  templateId: string | null | undefined
): templateId is NeuroStrokeWeaknessGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isNeuroStrokeWeaknessDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    NEURO_STROKE_WEAKNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof NEURO_STROKE_WEAKNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return NEURO_STROKE_WEAKNESS_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterNeuroChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isNeuroStrokeWeaknessDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveNeuroStrokeWeaknessRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isNeuroStrokeWeaknessGovernedTemplate(templateId)) return baseGroups;
  return filterNeuroChipGroups(baseGroups);
}

export function resolveNeuroStrokeWeaknessExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isNeuroStrokeWeaknessGovernedTemplate(templateId)) return baseGroups;
  return filterNeuroChipGroups(baseGroups);
}

export function resolveNeuroStrokeWeaknessHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isNeuroStrokeWeaknessGovernedTemplate(templateId)) return baseGroups;
  return filterNeuroChipGroups(baseGroups);
}

export function filterNeuroStrokeWeaknessMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isNeuroStrokeWeaknessGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isNeuroStrokeWeaknessDeniedStickyNoteFragment(option.fragmentKey));
}

export function allowedNeuroStrokeWeaknessComplaintIntelFragmentKeys(
  bundleFragmentKeys: string[]
): Set<string> {
  return new Set(bundleFragmentKeys);
}

export function filterStickyNoteChipsForNeuroStrokeWeaknessTemplate<TChip extends { fragmentKey: string }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  chips: TChip[],
  allowedComplaintIntelKeys: Set<string>
): TChip[] {
  if (!isNeuroStrokeWeaknessGovernedTemplate(templateId)) return chips;
  const denied = new Set<string>(NEURO_STROKE_WEAKNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS);
  const deniedPrefixes = NEURO_STROKE_WEAKNESS_DENIED_HPI_FRAGMENT_PREFIXES;
  return chips.filter((chip) => {
    if (denied.has(chip.fragmentKey)) return false;
    if (deniedPrefixes.some((prefix) => chip.fragmentKey.startsWith(prefix))) return false;
    if (chip.fragmentKey.startsWith("providerDocumentationComplaintIntel.")) {
      return allowedComplaintIntelKeys.has(chip.fragmentKey);
    }
    return true;
  });
}

export function collectNeuroStrokeWeaknessComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
