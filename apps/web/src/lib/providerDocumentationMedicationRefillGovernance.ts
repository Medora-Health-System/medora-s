/**
 * MEDUI.ED.POSTCERT.1B — Medication refill sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { MEDICATION_REFILL_TEMPLATE_ID } from "./providerDocumentationMedicationRefillGoldStandard";

export const MEDICATION_REFILL_GOVERNED_TEMPLATE_IDS = [MEDICATION_REFILL_TEMPLATE_ID] as const satisfies readonly ProviderDocumentationTemplateId[];

export type MedicationRefillGovernedTemplateId = (typeof MEDICATION_REFILL_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(MEDICATION_REFILL_GOVERNED_TEMPLATE_IDS);

export const MEDICATION_REFILL_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseHpiChipsPediatric.caregiverHistorian",
  "erMseHpiChipsPediatric.immunizationStatus",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.waTrauma",
] as const;

export const MEDICATION_REFILL_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.palpit",
  "providerDocumentationComplaintIntel.chfSymptoms",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.pediatric",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

export function isMedicationRefillGovernedTemplate(
  templateId: string | null | undefined
): templateId is MedicationRefillGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isMedicationRefillDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    MEDICATION_REFILL_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof MEDICATION_REFILL_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return MEDICATION_REFILL_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterMedicationRefillChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isMedicationRefillDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveMedicationRefillRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isMedicationRefillGovernedTemplate(templateId)) return baseGroups;
  return filterMedicationRefillChipGroups(baseGroups);
}

export function resolveMedicationRefillExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isMedicationRefillGovernedTemplate(templateId)) return baseGroups;
  return filterMedicationRefillChipGroups(baseGroups);
}

export function resolveMedicationRefillHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isMedicationRefillGovernedTemplate(templateId)) return baseGroups;
  return filterMedicationRefillChipGroups(baseGroups);
}

export function filterMedicationRefillMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isMedicationRefillGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isMedicationRefillDeniedStickyNoteFragment(option.fragmentKey));
}

export function allowedMedicationRefillComplaintIntelFragmentKeys(bundleFragmentKeys: string[]): Set<string> {
  return new Set(bundleFragmentKeys);
}

export function filterStickyNoteChipsForMedicationRefillTemplate<TChip extends { fragmentKey: string }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  chips: TChip[],
  allowedComplaintIntelKeys: Set<string>
): TChip[] {
  if (!isMedicationRefillGovernedTemplate(templateId)) return chips;
  const denied = new Set<string>(MEDICATION_REFILL_DENIED_STICKY_NOTE_FRAGMENT_KEYS);
  const deniedPrefixes = MEDICATION_REFILL_DENIED_HPI_FRAGMENT_PREFIXES;
  return chips.filter((chip) => {
    if (denied.has(chip.fragmentKey)) return false;
    if (deniedPrefixes.some((prefix) => chip.fragmentKey.startsWith(prefix))) return false;
    if (chip.fragmentKey.startsWith("providerDocumentationComplaintIntel.")) {
      return allowedComplaintIntelKeys.has(chip.fragmentKey);
    }
    return true;
  });
}

export function collectMedicationRefillComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
