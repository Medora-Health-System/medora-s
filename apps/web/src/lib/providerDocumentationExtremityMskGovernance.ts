/**
 * MEDUI.ED.ME.2O — Extremity pain / MSK sticky note governance (non-traumatic MSK).
 *
 * Discovery note: expected non-traumatic MSK template IDs (shoulder_pain_complaint_v1,
 * arthritis_flare_complaint_v1, etc.) are not yet in the provider documentation catalog.
 * `trauma_musculoskeletal` is the catalog's generic limb-pain template and is governed here
 * instead of trauma governance (ME.2N) to avoid overlapping filters.
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

/**
 * Non-traumatic / generic extremity MSK templates discovered in catalog.
 * Injury-specific templates remain under trauma governance (ME.2N).
 */
export const EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS = [
  "trauma_musculoskeletal",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type ExtremityMskGovernedTemplateId = (typeof EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS)[number];

const EXTREMITY_MSK_GOVERNED_TEMPLATE_ID_SET = new Set<string>(EXTREMITY_MSK_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when an extremity/MSK template is active. */
export const EXTREMITY_MSK_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocSob",
  "erMseHpiChips.assocCough",
  "erMseHpiChips.assocNausea",
  "erMseHpiChips.assocVomiting",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posCough",
  "erMseRosChips.posVomiting",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.negDeniesHeadache",
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
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waInfectious",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const EXTREMITY_MSK_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
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
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.hematuriaComplaintV1.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.",
  "providerDocumentationComplaintIntel.nearSyncopeComplaintV1.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.assaultTrauma.",
  "providerDocumentationComplaintIntel.headInjury.",
  "providerDocumentationComplaintIntel.laceration.",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.backPainTrauma.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

export const EXTREMITY_MSK_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "musculoskeletal",
  "neuroPsych",
  "reassessment",
] as const;

export const EXTREMITY_MSK_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.qualAching",
  "erMseHpiChips.timSuddenOnset",
  "erMseHpiChipsTrauma.mechanismReviewed",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.diffRotatorCuffInjury",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.diffFracture",
  "providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.diffFracture",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.diffSprain",
  "providerDocumentationComplaintIntel.fractureConcern.diffFracture",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.planImaging",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.mskTendernessPresent",
  "erMseRosChips.posWeakness",
  "erMseRosChips.rfNeuroDeficit",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(EXTREMITY_MSK_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

export function templateUsesExtremityMskStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is ExtremityMskGovernedTemplateId {
  return Boolean(templateId && EXTREMITY_MSK_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isExtremityMskDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return EXTREMITY_MSK_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isExtremityMskDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveExtremityMskRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesExtremityMskStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveExtremityMskExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesExtremityMskStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (EXTREMITY_MSK_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isExtremityMskDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveExtremityMskHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesExtremityMskStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isExtremityMskDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterExtremityMskMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesExtremityMskStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isExtremityMskDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectExtremityMskVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: ExtremityMskGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveExtremityMskHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isExtremityMskDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveExtremityMskRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveExtremityMskExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isExtremityMskDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isExtremityMskDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const fieldKeys of Object.values(template.guidance ?? {})) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isExtremityMskDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    if (template.complaintIntelligence) {
      for (const fragmentKey of flattenComplaintIntelligenceKeys(template.complaintIntelligence)) {
        if (!isExtremityMskDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  return keys;
}
