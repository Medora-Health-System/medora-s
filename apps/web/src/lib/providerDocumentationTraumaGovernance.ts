/**
 * MEDUI.ED.ME.2N — Trauma / injury sticky note governance.
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
import { MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS } from "./providerDocumentationMskTraumaComplaintIntelligence19Mdm6";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

/** Core TRAUMA majorGroup templates from providerDocumentationTemplateCatalog. */
export const TRAUMA_MAJOR_GROUP_TEMPLATE_IDS = [
  "fall",
  "mvc",
  "assault",
  "head_injury",
  "laceration",
  "back_pain",
  "neck_pain_trauma",
  "crush_injury",
  "penetrating_injury",
  "burn",
  "fracture_concern",
  "pediatric_trauma",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export const TRAUMA_GOVERNED_TEMPLATE_IDS = [
  ...TRAUMA_MAJOR_GROUP_TEMPLATE_IDS,
  ...MSK_TRAUMA_COMPLAINT_V1_TEMPLATE_IDS,
  "concussion_followup_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type TraumaGovernedTemplateId = (typeof TRAUMA_GOVERNED_TEMPLATE_IDS)[number];

const TRAUMA_GOVERNED_TEMPLATE_ID_SET = new Set<string>(TRAUMA_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a trauma/injury template is active. */
export const TRAUMA_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseRosChips.rfPregnancyConcern",
  "erMseExamChips.heentOropharynxClear",
  "erMseExamChips.heentDryMm",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.psychAppropriateAffect",
  "erMseExamChips.psychAnxious",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waInfectious",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const TRAUMA_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.hematuriaComplaintV1.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaintV1.",
  "providerDocumentationComplaintIntel.cellulitisSkinInfectionComplaintV1.",
  "providerDocumentationComplaintIntel.abscessSoftTissueComplaintV1.",
  "providerDocumentationComplaintIntel.woundInfectionComplaintV1.",
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
  "providerDocumentationComplaintIntel.chestPain.",
  "providerDocumentationComplaintIntel.sob.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.",
  "providerDocumentationComplaintIntel.nearSyncopeComplaintV1.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.migraineHeadacheComplaintV1.",
  "providerDocumentationComplaintIntel.feverComplaintV1.",
  "providerDocumentationComplaintIntel.pediatricFever.",
  "providerDocumentationComplaintIntel.testicularPainComplaintV1.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.asthmaWheezing.",
  "providerDocumentationComplaintIntel.copdExacerbationComplaintV1.",
  "providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.backPainNeuroRedFlagsComplaintV1.",
] as const;

export const TRAUMA_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "neuroPsych",
  "musculoskeletal",
  "skin",
  "cardiovascular",
  "respiratory",
  "abdomen",
  "reassessment",
] as const;

export const TRAUMA_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChipsTrauma.mechanismReviewed",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseHpiChipsTrauma.headStrikeMechanism",
  "erMseHpiChipsTrauma.lacerationMechanism",
  "providerDocumentationComplaintIntel.fall.hpiMechanicalFall",
  "providerDocumentationComplaintIntel.headInjury.diffConcussion",
  "providerDocumentationComplaintIntel.mvcCollision.diffConcussion",
  "providerDocumentationComplaintIntel.fractureConcern.diffFracture",
  "providerDocumentationComplaintIntel.fractureConcern.mdmXrayReviewed",
  "providerDocumentationComplaintIntel.fallTraumaComplaintV1.hpiFallMechanismHeight",
  "providerDocumentationComplaintIntel.minorHeadInjuryComplaintV1.diffConcussion",
  "providerDocumentationComplaintIntel.concussionFollowupComplaintV1.diffConcussion",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.planImaging",
  "erMseExamChips.heentHeadAtraumatic",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.skinLacerationPresent",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.rfAlteredMs",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(TRAUMA_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

export function templateUsesTraumaStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is TraumaGovernedTemplateId {
  return Boolean(templateId && TRAUMA_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isTraumaDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return TRAUMA_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isTraumaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveTraumaRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesTraumaStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveTraumaExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesTraumaStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (TRAUMA_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isTraumaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveTraumaHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesTraumaStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isTraumaDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterTraumaMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesTraumaStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isTraumaDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectTraumaVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: TraumaGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveTraumaHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isTraumaDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveTraumaRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveTraumaExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isTraumaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isTraumaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const fieldKeys of Object.values(template.guidance ?? {})) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isTraumaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    if (template.complaintIntelligence) {
      for (const fragmentKey of flattenComplaintIntelligenceKeys(template.complaintIntelligence)) {
        if (!isTraumaDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  return keys;
}
