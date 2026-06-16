/**
 * MEDUI.ED.ME.2J — Rash / skin sticky note governance.
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
  ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import {
  ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  RASH_SKIN_COMPLAINT_V1_INTEL,
  WOUND_INFECTION_COMPLAINT_V1_INTEL,
} from "./providerDocumentationInfectiousEntComplaintIntelligence19Mdm7";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const RASH_GOVERNED_TEMPLATE_IDS = [
  "allergic_reaction_rash",
  "pediatric_rash",
  "cellulitis_skin_infection_complaint_v1",
  "abscess_soft_tissue_complaint_v1",
  "wound_infection_complaint_v1",
  "rash_skin_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type RashGovernedTemplateId = (typeof RASH_GOVERNED_TEMPLATE_IDS)[number];

const RASH_GOVERNED_TEMPLATE_ID_SET = new Set<string>(RASH_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a rash/skin template is active. */
export const RASH_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocSob",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.negDeniesHeadache",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioPeripheralPulsesPresent",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
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
  "erMseExamChips.skinLacerationPresent",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const RASH_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.uriRespiratory.",
  "providerDocumentationComplaintIntel.cough.",
  "providerDocumentationComplaintIntel.coughComplaintV1.",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1.",
  "providerDocumentationComplaintIntel.chestCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.",
  "providerDocumentationComplaintIntel.asthmaWheezing.",
  "providerDocumentationComplaintIntel.copdExacerbationComplaintV1.",
  "providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.hemoptysisComplaintV1.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.",
  "providerDocumentationComplaintIntel.backPainTrauma.",
  "providerDocumentationComplaintIntel.backPainComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.testicularPainComplaintV1.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
  "providerDocumentationComplaintIntel.pediatricFever.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.handWristInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.strokeSymptoms.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

export const RASH_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "skin",
  "heent",
  "respiratory",
  "cardiovascular",
  "reassessment",
] as const;

export const RASH_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.allergicReactionRash.hpiRashBeganToday",
  "providerDocumentationComplaintIntel.allergicReactionRash.hpiMedicationExposure",
  "providerDocumentationComplaintIntel.allergicReactionRash.hpiInsectSting",
  "providerDocumentationComplaintIntel.allergicReactionRash.rfPurpuraPetechiaeConcern",
  "providerDocumentationComplaintIntel.allergicReactionRash.rfMucosalInvolvement",
  "providerDocumentationComplaintIntel.allergicReactionRash.diffAnaphylaxis",
  "providerDocumentationComplaintIntel.allergicReactionRash.diffUrticaria",
  "providerDocumentationComplaintIntel.allergicReactionRash.planEpinephrineAdministered",
  "providerDocumentationComplaintIntel.allergicReactionRash.planAntihistaminePrescribed",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.hpiRashBeganToday",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.hpiNewMedicationExposure",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.rfPurpuraConcern",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.diffAllergicDermatitis",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.planAntihistaminePrescribed",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.diffCellulitis",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.hpiInsectBite",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.planAntibioticsPrescribed",
  "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.diffAbscess",
  "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.planIncisionDrainagePerformed",
  "providerDocumentationComplaintIntel.woundInfectionComplaintV1.diffSuperficialInfection",
  "erMseExamChips.skinRashPresent",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(RASH_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_RASH_TEMPLATE_ID = {
  allergic_reaction_rash: ALLERGIC_REACTION_RASH_COMPLAINT_INTEL,
  cellulitis_skin_infection_complaint_v1: CELLULITIS_SKIN_INFECTION_COMPLAINT_V1_INTEL,
  abscess_soft_tissue_complaint_v1: ABSCESS_SOFT_TISSUE_COMPLAINT_V1_INTEL,
  wound_infection_complaint_v1: WOUND_INFECTION_COMPLAINT_V1_INTEL,
  rash_skin_complaint_v1: RASH_SKIN_COMPLAINT_V1_INTEL,
} as const;

export function templateUsesRashStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is RashGovernedTemplateId {
  return Boolean(templateId && RASH_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isRashDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return RASH_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isRashDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveRashRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesRashStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveRashExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesRashStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (RASH_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isRashDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveRashHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesRashStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isRashDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterRashMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesRashStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isRashDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectRashVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: RashGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveRashHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isRashDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveRashRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveRashExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isRashDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isRashDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_RASH_TEMPLATE_ID[templateId as keyof typeof COMPLAINT_INTEL_BY_RASH_TEMPLATE_ID];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isRashDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
