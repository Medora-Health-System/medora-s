/**
 * MEDUI.ED.ME.2U — Dehydration / viral illness sticky note governance.
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
import { DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL } from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS = [
  "dehydration_viral_illness_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type DehydrationViralIllnessGovernedTemplateId = (typeof DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS)[number];

const DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_ID_SET = new Set<string>(DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_IDS);

export const DEHYDRATION_VIRAL_ILLNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
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
  "erMseRosChips.posDizziness",
  "erMseRosChips.posSyncope",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseRosChips.rfRespDistress",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskTendernessPresent",
  "erMseExamChips.mskSwellingPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.skinLacerationPresent",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const DEHYDRATION_VIRAL_ILLNESS_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dentalPainInfectionComplaintV1.",
  "providerDocumentationComplaintIntel.earPainOtitisComplaintV1.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
] as const;

export const DEHYDRATION_VIRAL_ILLNESS_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "abdomen",
  "skin",
  "neuroPsych",
  "reassessment",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(DEHYDRATION_VIRAL_ILLNESS_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_TEMPLATE_ID = {
  dehydration_viral_illness_complaint_v1: DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL,
} as const satisfies Partial<
  Record<DehydrationViralIllnessGovernedTemplateId, typeof DEHYDRATION_VIRAL_ILLNESS_COMPLAINT_V1_INTEL>
>;

export function templateUsesDehydrationViralIllnessStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is DehydrationViralIllnessGovernedTemplateId {
  return Boolean(templateId && DEHYDRATION_VIRAL_ILLNESS_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isDehydrationViralIllnessDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return DEHYDRATION_VIRAL_ILLNESS_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDehydrationViralIllnessDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDehydrationViralIllnessRosChipGroupsForTemplate<
  T extends StickyNoteChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesDehydrationViralIllnessStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveDehydrationViralIllnessExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesDehydrationViralIllnessStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (DEHYDRATION_VIRAL_ILLNESS_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDehydrationViralIllnessDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDehydrationViralIllnessHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesDehydrationViralIllnessStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDehydrationViralIllnessDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterDehydrationViralIllnessMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesDehydrationViralIllnessStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isDehydrationViralIllnessDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectDehydrationViralIllnessVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: DehydrationViralIllnessGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveDehydrationViralIllnessHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isDehydrationViralIllnessDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveDehydrationViralIllnessRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveDehydrationViralIllnessExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isDehydrationViralIllnessDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isDehydrationViralIllnessDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isDehydrationViralIllnessDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
