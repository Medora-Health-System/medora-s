/**
 * MEDUI.ED.ME.2M — Dizziness / vertigo / syncope sticky note governance.
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
  DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
} from "./providerDocumentationComplaintIntelligence";
import { NEAR_SYNCOPE_COMPLAINT_V1_INTEL } from "./providerDocumentationCardiacComplaintIntelligence19Mdm4";
import { VERTIGO_COMPLAINT_V1_INTEL } from "./providerDocumentationNeuroExpansionComplaintIntelligence19Mdm9";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS = [
  "dizziness_syncope",
  "near_syncope_complaint_v1",
  "vertigo_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type DizzinessVertigoGovernedTemplateId = (typeof DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS)[number];

const DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_ID_SET = new Set<string>(DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a dizziness/vertigo/syncope template is active. */
export const DIZZINESS_VERTIGO_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.qualPressureLike",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
  "erMseExamChips.skinWarmDry",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseExamChips.mskRomNormal",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waInfectious",
] as const;

export const DIZZINESS_VERTIGO_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationTemplateLocation.backPain.",
  "providerDocumentationTemplateLocation.chestPain.",
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
  "providerDocumentationComplaintIntel.uriRespiratory.",
  "providerDocumentationComplaintIntel.cough.",
  "providerDocumentationComplaintIntel.coughComplaintV1.",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatComplaintV1.",
  "providerDocumentationComplaintIntel.soreThroatInfectiousComplaintV1.",
  "providerDocumentationComplaintIntel.chestCongestionComplaintV1.",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.",
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.testicularPainComplaintV1.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
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

export const DIZZINESS_VERTIGO_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "neuroPsych",
  "cardiovascular",
  "respiratory",
  "musculoskeletal",
  "reassessment",
] as const;

export const DIZZINESS_VERTIGO_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.assocDizziness",
  "providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxRoomSpinning",
  "providerDocumentationTemplateHpiDimensions.dizzinessSyncope.ctxCompleteSyncope",
  "providerDocumentationTemplateHpiDimensions.dizzinessSyncope.qualVertigo",
  "providerDocumentationComplaintIntel.dizzinessSyncope.hpiRoomSpinningSensation",
  "providerDocumentationComplaintIntel.dizzinessSyncope.hpiSyncope",
  "providerDocumentationComplaintIntel.dizzinessSyncope.diffPosteriorCirculationStroke",
  "providerDocumentationComplaintIntel.dizzinessSyncope.diffBenignParoxysmalPositionalVertigo",
  "providerDocumentationComplaintIntel.dizzinessSyncope.mdmEkgReviewed",
  "providerDocumentationComplaintIntel.dizzinessSyncope.mdmCtHeadReviewed",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.rosVertigo",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.diffBenignParoxysmalPositionalVertigo",
  "providerDocumentationComplaintIntel.nearSyncopeComplaintV1.rosNearSyncope",
  "providerDocumentationComplaintIntel.nearSyncopeComplaintV1.diffCardiacArrhythmia",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.planEcg",
  "erMseExamChips.heentPerrla",
  "erMseExamChips.neuroAlertOriented",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfAlteredMs",
  "erMseRosChips.rfSyncope",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(DIZZINESS_VERTIGO_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_DIZZINESS_VERTIGO_TEMPLATE_ID = {
  dizziness_syncope: DIZZINESS_SYNCOPE_COMPLAINT_INTEL,
  near_syncope_complaint_v1: NEAR_SYNCOPE_COMPLAINT_V1_INTEL,
  vertigo_complaint_v1: VERTIGO_COMPLAINT_V1_INTEL,
} as const;

export function templateUsesDizzinessVertigoStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is DizzinessVertigoGovernedTemplateId {
  return Boolean(templateId && DIZZINESS_VERTIGO_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isDizzinessVertigoDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return DIZZINESS_VERTIGO_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDizzinessVertigoDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDizzinessVertigoRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesDizzinessVertigoStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveDizzinessVertigoExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesDizzinessVertigoStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (DIZZINESS_VERTIGO_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDizzinessVertigoDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveDizzinessVertigoHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesDizzinessVertigoStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isDizzinessVertigoDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterDizzinessVertigoMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesDizzinessVertigoStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isDizzinessVertigoDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectDizzinessVertigoVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: DizzinessVertigoGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveDizzinessVertigoHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isDizzinessVertigoDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveDizzinessVertigoRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveDizzinessVertigoExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isDizzinessVertigoDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isDizzinessVertigoDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const fieldKeys of Object.values(template.guidance ?? {})) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isDizzinessVertigoDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_DIZZINESS_VERTIGO_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isDizzinessVertigoDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
    }
  }

  return keys;
}
