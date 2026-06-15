/**
 * MEDUI.ED.ME.2K — Headache sticky note governance.
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
  HEADACHE_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const HEADACHE_GOVERNED_TEMPLATE_IDS = [
  "headache",
  "migraine_headache_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type HeadacheGovernedTemplateId = (typeof HEADACHE_GOVERNED_TEMPLATE_IDS)[number];

const HEADACHE_GOVERNED_TEMPLATE_ID_SET = new Set<string>(HEADACHE_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a headache template is active. */
export const HEADACHE_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locAbdominalPain",
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
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.rfRespDistress",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respWheezing",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskTendernessPresent",
  "erMseExamChips.mskSwellingPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waInfectious",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const HEADACHE_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.abdominal.",
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
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.",
  "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.woundInfectionComplaintV1.",
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
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
] as const;

export const HEADACHE_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "neuroPsych",
  "cardiovascular",
  "reassessment",
] as const;

export const HEADACHE_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locHeadache",
  "providerDocumentationTemplateHpiDimensions.headache.timThunderclap",
  "providerDocumentationTemplateHpiDimensions.headache.assocPhotophobia",
  "providerDocumentationTemplateHpiDimensions.headache.assocVisionChanges",
  "providerDocumentationComplaintIntel.headache.hpiThunderclapConcern",
  "providerDocumentationComplaintIntel.headache.hpiVisualChanges",
  "providerDocumentationComplaintIntel.headache.rfSahConcern",
  "providerDocumentationComplaintIntel.headache.rfNeuroDeficit",
  "providerDocumentationComplaintIntel.headache.examCranialNervesIntact",
  "providerDocumentationComplaintIntel.headache.diffMigraine",
  "providerDocumentationComplaintIntel.headache.diffSubarachnoidHemorrhage",
  "providerDocumentationComplaintIntel.headache.mdmCtHeadReviewed",
  "providerDocumentationComplaintIntel.headache.mdmLpConsidered",
  "providerDocumentationComplaintIntel.headache.dispNeurologyConsultConsidered",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.diffMigraine",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.rfThunderclapConcern",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.hpiPhotophobiaNausea",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.neuroAlertOriented",
  "erMseRosChips.rfNeuroDeficit",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(HEADACHE_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_HEADACHE_TEMPLATE_ID = {
  headache: HEADACHE_COMPLAINT_INTEL,
  migraine_headache_complaint_v1: MIGRAINE_HEADACHE_COMPLAINT_V1_INTEL,
} as const;

export function templateUsesHeadacheStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is HeadacheGovernedTemplateId {
  return Boolean(templateId && HEADACHE_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isHeadacheDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return HEADACHE_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isHeadacheDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveHeadacheRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesHeadacheStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveHeadacheExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesHeadacheStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (HEADACHE_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isHeadacheDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveHeadacheHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesHeadacheStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isHeadacheDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterHeadacheMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesHeadacheStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isHeadacheDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectHeadacheVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: HeadacheGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveHeadacheHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isHeadacheDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveHeadacheRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveHeadacheExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isHeadacheDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isHeadacheDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_HEADACHE_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isHeadacheDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
