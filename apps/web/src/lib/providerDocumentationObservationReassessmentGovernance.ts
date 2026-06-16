/**
 * MEDUI.ED.POSTCERT.1C — Observation reassessment sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";
import { OBSERVATION_REASSESSMENT_TEMPLATE_ID } from "./providerDocumentationObservationReassessmentGoldStandard";

export const OBSERVATION_REASSESSMENT_GOVERNED_TEMPLATE_IDS = [
  OBSERVATION_REASSESSMENT_TEMPLATE_ID,
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type ObservationReassessmentGovernedTemplateId =
  (typeof OBSERVATION_REASSESSMENT_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(OBSERVATION_REASSESSMENT_GOVERNED_TEMPLATE_IDS);

export const OBSERVATION_REASSESSMENT_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseHpiChipsPediatric.caregiverHistorian",
  "erMseHpiChipsPediatric.immunizationStatus",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.waTrauma",
] as const;

export const OBSERVATION_REASSESSMENT_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.palpit",
  "providerDocumentationComplaintIntel.chfSymptoms",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.pediatric",
  "providerDocumentationComplaintIntel.medicationRefill.",
] as const;

export function isObservationReassessmentGovernedTemplate(
  templateId: string | null | undefined
): templateId is ObservationReassessmentGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isObservationReassessmentDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    OBSERVATION_REASSESSMENT_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof OBSERVATION_REASSESSMENT_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return OBSERVATION_REASSESSMENT_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) =>
    fragmentKey.startsWith(prefix)
  );
}

function filterObservationReassessmentChipGroups<T extends { chips: { fragmentKey: string }[] }>(
  groups: T[]
): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isObservationReassessmentDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveObservationReassessmentRosChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isObservationReassessmentGovernedTemplate(templateId)) return baseGroups;
  return filterObservationReassessmentChipGroups(baseGroups);
}

export function resolveObservationReassessmentExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isObservationReassessmentGovernedTemplate(templateId)) return baseGroups;
  return filterObservationReassessmentChipGroups(baseGroups);
}

export function resolveObservationReassessmentHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isObservationReassessmentGovernedTemplate(templateId)) return baseGroups;
  return filterObservationReassessmentChipGroups(baseGroups);
}

export function filterObservationReassessmentMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isObservationReassessmentGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isObservationReassessmentDeniedStickyNoteFragment(option.fragmentKey));
}

export function allowedObservationReassessmentComplaintIntelFragmentKeys(
  bundleFragmentKeys: string[]
): Set<string> {
  return new Set(bundleFragmentKeys);
}

export function filterStickyNoteChipsForObservationReassessmentTemplate<TChip extends { fragmentKey: string }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  chips: TChip[],
  allowedComplaintIntelKeys: Set<string>
): TChip[] {
  if (!isObservationReassessmentGovernedTemplate(templateId)) return chips;
  const denied = new Set<string>(OBSERVATION_REASSESSMENT_DENIED_STICKY_NOTE_FRAGMENT_KEYS);
  const deniedPrefixes = OBSERVATION_REASSESSMENT_DENIED_HPI_FRAGMENT_PREFIXES;
  return chips.filter((chip) => {
    if (denied.has(chip.fragmentKey)) return false;
    if (deniedPrefixes.some((prefix) => chip.fragmentKey.startsWith(prefix))) return false;
    if (chip.fragmentKey.startsWith("providerDocumentationComplaintIntel.")) {
      return allowedComplaintIntelKeys.has(chip.fragmentKey);
    }
    return true;
  });
}

export function collectObservationReassessmentComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
