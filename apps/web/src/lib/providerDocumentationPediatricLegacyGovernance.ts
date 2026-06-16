/**
 * MEDUI.ED.ME.2V-R — Pediatric legacy chief complaint sticky note governance.
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

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS = [
  "fever",
  "seizure",
  "pediatric_rash",
  "dehydration",
  "croup",
  "rsv_like_illness",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type PediatricLegacyGovernedTemplateId = (typeof PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS)[number];

const PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_ID_SET = new Set<string>(PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_IDS);

export const PEDIATRIC_LEGACY_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posHeadache",
  "erMseRosChips.posDizziness",
  "erMseRosChips.posSyncope",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const PEDIATRIC_LEGACY_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.assaultTrauma.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(PEDIATRIC_LEGACY_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

export function templateUsesPediatricLegacyStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is PediatricLegacyGovernedTemplateId {
  return Boolean(templateId && PEDIATRIC_LEGACY_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isPediatricLegacyDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return PEDIATRIC_LEGACY_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isPediatricLegacyDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolvePediatricLegacyRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesPediatricLegacyStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolvePediatricLegacyExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesPediatricLegacyStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isPediatricLegacyDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolvePediatricLegacyHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesPediatricLegacyStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isPediatricLegacyDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterPediatricLegacyMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesPediatricLegacyStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isPediatricLegacyDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectPediatricLegacyVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: PediatricLegacyGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolvePediatricLegacyHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isPediatricLegacyDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }
  for (const group of resolvePediatricLegacyRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolvePediatricLegacyExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  if (template?.complaintIntelligence) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(template.complaintIntelligence)) {
      if (!isPediatricLegacyDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }
  return keys;
}
