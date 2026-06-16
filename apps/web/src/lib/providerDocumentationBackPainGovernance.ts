/**
 * MEDUI.ED.ME.2H — Back pain sticky note governance.
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
  BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { BACK_PAIN_COMPLAINT_V1_INTEL } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";
import { BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const BACK_PAIN_GOVERNED_TEMPLATE_IDS = [
  "back_pain",
  "back_pain_complaint_v1",
  "back_pain_neuro_red_flags_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type BackPainGovernedTemplateId = (typeof BACK_PAIN_GOVERNED_TEMPLATE_IDS)[number];

const BACK_PAIN_GOVERNED_TEMPLATE_ID_SET = new Set<string>(BACK_PAIN_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a back pain template is active. */
export const BACK_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.qualBurning",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocNausea",
  "erMseHpiChips.assocVomiting",
  "erMseHpiChips.assocSob",
  "erMseHpiChips.assocDiaphoresis",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posVomiting",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesVomiting",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfRespDistress",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respWheezing",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioPeripheralPulsesPresent",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waInfectious",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const BACK_PAIN_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.uriRespiratory.",
  "providerDocumentationComplaintIntel.cough.",
  "providerDocumentationComplaintIntel.coughComplaintV1.",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatComplaintV1.",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
  "providerDocumentationComplaintIntel.pediatricFever.",
] as const;

export const BACK_PAIN_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "musculoskeletal",
  "neuroPsych",
  "reassessment",
] as const;

export const BACK_PAIN_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locBackPain",
  "providerDocumentationComplaintIntel.backPainTrauma.hpiBackPainAfterInjury",
  "providerDocumentationComplaintIntel.backPainTrauma.hpiDeniesWeakness",
  "providerDocumentationComplaintIntel.backPainTrauma.rosPain",
  "providerDocumentationComplaintIntel.backPainTrauma.rfNeurologicDeficit",
  "providerDocumentationComplaintIntel.backPainTrauma.rfSpinalTenderness",
  "providerDocumentationComplaintIntel.backPainTrauma.examLumbarTendernessPresent",
  "providerDocumentationComplaintIntel.backPainTrauma.diffRadiculopathy",
  "providerDocumentationComplaintIntel.backPainTrauma.diffCaudaEquina",
  "providerDocumentationComplaintIntel.backPainComplaintV1.hpiBackPainAfterInjury",
  "providerDocumentationComplaintIntel.backPainComplaintV1.diffRadiculopathy",
  "providerDocumentationComplaintIntel.backPainComplaintV1.diffCaudaEquina",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.diffCaudaEquinaSyndrome",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.rfBowelBladderSymptoms",
  "erMseExamChips.mskTendernessPresent",
  "erMseRosChips.rfNeuroDeficit",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(BACK_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_BACK_PAIN_TEMPLATE_ID = {
  back_pain: BACK_PAIN_TRAUMA_COMPLAINT_INTEL,
  back_pain_complaint_v1: BACK_PAIN_COMPLAINT_V1_INTEL,
  back_pain_neuro_red_flags_complaint_v1: BACK_PAIN_NEURO_RED_FLAGS_COMPLAINT_V1_INTEL,
} as const;

export function templateUsesBackPainStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is BackPainGovernedTemplateId {
  return Boolean(templateId && BACK_PAIN_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isBackPainDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return BACK_PAIN_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isBackPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveBackPainRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesBackPainStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveBackPainExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesBackPainStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (BACK_PAIN_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isBackPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveBackPainHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesBackPainStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isBackPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterBackPainMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesBackPainStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isBackPainDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectBackPainVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: BackPainGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveBackPainHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isBackPainDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveBackPainRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveBackPainExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isBackPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isBackPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_BACK_PAIN_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isBackPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
