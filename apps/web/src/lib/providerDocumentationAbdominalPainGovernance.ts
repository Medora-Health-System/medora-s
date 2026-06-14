/**
 * MEDUI.ED.ME.2D — Abdominal pain sticky note governance (adult, pediatric, v1).
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
  ABDOMINAL_COMPLAINT_INTEL,
  PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { ABDOMINAL_PAIN_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS = [
  "abdominal_pain",
  "abdominal_pain_pediatric",
  "abdominal_pain_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type AbdominalPainGovernedTemplateId = (typeof ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS)[number];

const ABDOMINAL_PAIN_GOVERNED_TEMPLATE_ID_SET = new Set<string>(ABDOMINAL_PAIN_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when an abdominal pain template is active. */
export const ABDOMINAL_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
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
] as const;

export const ABDOMINAL_PAIN_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.strokeSymptoms.",
] as const;

export const ABDOMINAL_PAIN_ALLOWED_EXAM_SECTION_IDS = ["general", "heent", "abdomen", "reassessment"] as const;

export const ABDOMINAL_PAIN_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationTemplateLocation.abdominal.rightLowerQuadrant",
  "providerDocumentationComplaintIntel.abdominal.hpiRlqPain",
  "providerDocumentationComplaintIntel.abdominal.examGuarding",
  "providerDocumentationComplaintIntel.abdominal.examReboundTenderness",
  "providerDocumentationComplaintIntel.abdominal.diffAppendicitis",
  "providerDocumentationComplaintIntel.abdominal.diffCholecystitis",
  "providerDocumentationComplaintIntel.abdominal.diffGiBleed",
  "providerDocumentationComplaintIntel.abdominal.hpiPregnancyConcern",
  "providerDocumentationComplaintIntel.abdominal.rfGiBleedingConcern",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.examGuarding",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.examReboundTenderness",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.examGuardingRebound",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.diffAppendicitis",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.rfGiBleedingConcern",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(ABDOMINAL_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_ABDOMINAL_PAIN_TEMPLATE_ID: Partial<
  Record<AbdominalPainGovernedTemplateId, typeof ABDOMINAL_COMPLAINT_INTEL>
> = {
  abdominal_pain: ABDOMINAL_COMPLAINT_INTEL,
  abdominal_pain_pediatric: PEDIATRIC_ABDOMINAL_PAIN_COMPLAINT_INTEL,
  abdominal_pain_complaint_v1: ABDOMINAL_PAIN_COMPLAINT_V1_INTEL,
};

export function templateUsesAbdominalPainStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is AbdominalPainGovernedTemplateId {
  return Boolean(templateId && ABDOMINAL_PAIN_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isAbdominalPainDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return ABDOMINAL_PAIN_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAbdominalPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveAbdominalPainRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesAbdominalPainStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveAbdominalPainExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesAbdominalPainStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) =>
      (ABDOMINAL_PAIN_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId)
    )
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAbdominalPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveAbdominalPainHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesAbdominalPainStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isAbdominalPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterAbdominalPainMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesAbdominalPainStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isAbdominalPainDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectAbdominalPainVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: AbdominalPainGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveAbdominalPainHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isAbdominalPainDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveAbdominalPainRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveAbdominalPainExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isAbdominalPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isAbdominalPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_ABDOMINAL_PAIN_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      keys.add(fragmentKey);
    }
  }

  return keys;
}
