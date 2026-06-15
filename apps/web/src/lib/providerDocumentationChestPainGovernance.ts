/**
 * MEDUI.ED.ME.2L — Chest pain sticky note governance.
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
  CHEST_PAIN_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const CHEST_PAIN_GOVERNED_TEMPLATE_IDS = ["chest_pain"] as const satisfies readonly ProviderDocumentationTemplateId[];

export type ChestPainGovernedTemplateId = (typeof CHEST_PAIN_GOVERNED_TEMPLATE_IDS)[number];

const CHEST_PAIN_GOVERNED_TEMPLATE_ID_SET = new Set<string>(CHEST_PAIN_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a chest pain template is active. */
export const CHEST_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locFlankPain",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.negDeniesHeadache",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
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
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.waInfectious",
] as const;

export const CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.",
  "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.woundInfectionComplaintV1.",
  "providerDocumentationComplaintIntel.backPainTrauma.",
  "providerDocumentationComplaintIntel.backPainComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.",
  "providerDocumentationComplaintIntel.uriRespiratory.",
  "providerDocumentationComplaintIntel.cough.",
  "providerDocumentationComplaintIntel.coughComplaintV1.",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1.",
  "providerDocumentationComplaintIntel.chestCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
  "providerDocumentationComplaintIntel.pediatricFever.",
  "providerDocumentationComplaintIntel.testicularPainComplaintV1.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.handWristInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
] as const;

export const CHEST_PAIN_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "cardiovascular",
  "respiratory",
  "reassessment",
] as const;

export const CHEST_PAIN_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.assocSob",
  "providerDocumentationTemplateHpiDimensions.chestPain.assocDiaphoresis",
  "providerDocumentationTemplateLocation.chestPain.midChest",
  "providerDocumentationTemplateLocation.chestPain.radiatingToLeftArm",
  "providerDocumentationTemplateHpiDimensions.chestPain.timExertional",
  "providerDocumentationTemplateHpiDimensions.chestPain.assocPalpitations",
  "providerDocumentationComplaintIntel.chestPain.hpiExertional",
  "providerDocumentationComplaintIntel.chestPain.hpiRadiationLeftArm",
  "providerDocumentationComplaintIntel.chestPain.diffAcs",
  "providerDocumentationComplaintIntel.chestPain.diffStemiNstemi",
  "providerDocumentationComplaintIntel.chestPain.diffPe",
  "providerDocumentationComplaintIntel.chestPain.mdmEcgReviewed",
  "providerDocumentationComplaintIntel.chestPain.mdmTroponinReviewed",
  "providerDocumentationComplaintIntel.chestPain.mdmPeRiskEvaluated",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.planEcg",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.respClearBs",
  "erMseRosChips.rfSyncope",
  "erMseRosChips.rfHypotensionConcern",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(CHEST_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_CHEST_PAIN_TEMPLATE_ID = {
  chest_pain: CHEST_PAIN_COMPLAINT_INTEL,
} as const;

export function templateUsesChestPainStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is ChestPainGovernedTemplateId {
  return Boolean(templateId && CHEST_PAIN_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isChestPainDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isChestPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveChestPainRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesChestPainStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveChestPainExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesChestPainStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (CHEST_PAIN_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isChestPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveChestPainHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesChestPainStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isChestPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterChestPainMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesChestPainStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isChestPainDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectChestPainVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: ChestPainGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveChestPainHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isChestPainDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveChestPainRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveChestPainExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isChestPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isChestPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const fieldKeys of Object.values(template.guidance ?? {})) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isChestPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_CHEST_PAIN_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isChestPainDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
