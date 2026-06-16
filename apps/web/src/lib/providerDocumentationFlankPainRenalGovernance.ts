/**
 * MEDUI.ED.ME.2PB-R — Flank pain / renal colic sticky note governance.
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
  FLANK_PAIN_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { FLANK_PAIN_COMPLAINT_V1_INTEL } from "./providerDocumentationGiComplaintIntelligence19Mdm2";
import { FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL } from "./providerDocumentationGuRenalComplaintIntelligence19Mdm5";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS = [
  "flank_pain",
  "flank_pain_renal_complaint_v1",
  "flank_pain_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type FlankPainRenalGovernedTemplateId = (typeof FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS)[number];

const FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_ID_SET = new Set<string>(FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a flank / renal colic template is active. */
export const FLANK_PAIN_RENAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocSob",
  "erMseHpiChips.assocCough",
  "erMseHpiChips.assocDizziness",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseHpiChipsTrauma.mechanismReviewed",
  "erMseRosChips.posChestPain",
  "erMseRosChips.posSob",
  "erMseRosChips.posCough",
  "erMseRosChips.posHeadache",
  "erMseRosChips.posDizziness",
  "erMseRosChips.negDeniesChestPain",
  "erMseRosChips.negDeniesSob",
  "erMseRosChips.negDeniesHeadache",
  "erMseRosChips.negDeniesSyncope",
  "erMseRosChips.rfRespDistress",
  "erMseRosChips.rfSyncope",
  "erMseRosChips.rfNeuroDeficit",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.respNoDistress",
  "erMseExamChips.respClearBs",
  "erMseExamChips.respWheezing",
  "erMseExamChips.respCrackles",
  "erMseExamChips.respIncreasedWob",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioNoMurmur",
  "erMseExamChips.cardioPeripheralPulsesPresent",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskTendernessPresent",
  "erMseExamChips.mskSwellingPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const FLANK_PAIN_RENAL_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
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
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.",
  "providerDocumentationComplaintIntel.nearSyncopeComplaintV1.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.",
  "providerDocumentationComplaintIntel.backPainTrauma.",
  "providerDocumentationComplaintIntel.backPainComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.assaultTrauma.",
  "providerDocumentationComplaintIntel.headInjury.",
  "providerDocumentationComplaintIntel.laceration.",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.lacerationSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.hipPainInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.handWristInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.fractureConcern.",
  "providerDocumentationComplaintIntel.dentalOralComplaintV1.",
  "providerDocumentationComplaintIntel.earPainComplaintV1.",
  "providerDocumentationComplaintIntel.sinusSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

export const FLANK_PAIN_RENAL_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "abdomen",
  "neuroPsych",
  "reassessment",
] as const;

export const FLANK_PAIN_RENAL_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.flankPain.hpiRightFlankPain",
  "providerDocumentationComplaintIntel.flankPain.hpiColickyFlankPain",
  "providerDocumentationComplaintIntel.flankPain.hpiHistoryOfKidneyStones",
  "providerDocumentationComplaintIntel.flankPain.examRightCvaTenderness",
  "providerDocumentationComplaintIntel.flankPain.diffRenalColic",
  "providerDocumentationComplaintIntel.flankPain.diffInfectedObstructingStone",
  "providerDocumentationComplaintIntel.flankPain.rfObstructingStoneConcern",
  "providerDocumentationComplaintIntel.flankPainRenalComplaintV1.diffRenalColic",
  "providerDocumentationComplaintIntel.flankPainComplaintV1.diffRenalColic",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(FLANK_PAIN_RENAL_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_FLANK_PAIN_RENAL_TEMPLATE_ID: Partial<
  Record<FlankPainRenalGovernedTemplateId, typeof FLANK_PAIN_COMPLAINT_INTEL>
> = {
  flank_pain: FLANK_PAIN_COMPLAINT_INTEL,
  flank_pain_renal_complaint_v1: FLANK_PAIN_RENAL_COMPLAINT_V1_INTEL,
  flank_pain_complaint_v1: FLANK_PAIN_COMPLAINT_V1_INTEL,
};

export function templateUsesFlankPainRenalStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is FlankPainRenalGovernedTemplateId {
  return Boolean(templateId && FLANK_PAIN_RENAL_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isFlankPainRenalDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return FLANK_PAIN_RENAL_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFlankPainRenalDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveFlankPainRenalRosChipGroupsForTemplate<
  T extends StickyNoteChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesFlankPainRenalStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveFlankPainRenalExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesFlankPainRenalStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (FLANK_PAIN_RENAL_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFlankPainRenalDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveFlankPainRenalHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesFlankPainRenalStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isFlankPainRenalDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterFlankPainRenalMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesFlankPainRenalStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isFlankPainRenalDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectFlankPainRenalVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: FlankPainRenalGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveFlankPainRenalHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isFlankPainRenalDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveFlankPainRenalRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveFlankPainRenalExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isFlankPainRenalDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isFlankPainRenalDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_FLANK_PAIN_RENAL_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      keys.add(fragmentKey);
    }
  }

  return keys;
}
