/**
 * MEDUI.ED.ME.2P — Male GU / testicular sticky note governance.
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

/** Male GU templates discovered in provider documentation catalog. */
export const MALE_GU_GOVERNED_TEMPLATE_IDS = [
  "male_genital_complaint",
  "testicular_pain_complaint_v1",
  "dysuria_complaint_v1",
  "hematuria_complaint_v1",
  "urinary_retention_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type MaleGuGovernedTemplateId = (typeof MALE_GU_GOVERNED_TEMPLATE_IDS)[number];

const MALE_GU_GOVERNED_TEMPLATE_ID_SET = new Set<string>(MALE_GU_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a male GU template is active. */
export const MALE_GU_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locLimbPain",
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
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfRespDistress",
  "erMseRosChips.rfSyncope",
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
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.skinLacerationPresent",
  "erMseExamChips.skinDiaphoresis",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const MALE_GU_DENIED_HPI_FRAGMENT_PREFIXES = [
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
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.pelvicPainComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalBleedingComplaintV1.",
  "providerDocumentationComplaintIntel.vaginalDischargeComplaintV1.",
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
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
] as const;

/** Workspace has no dedicated genitourinary section; GU findings live in abdomen/skin chips. */
export const MALE_GU_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "abdomen",
  "skin",
  "reassessment",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(MALE_GU_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

export function templateUsesMaleGuStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is MaleGuGovernedTemplateId {
  return Boolean(templateId && MALE_GU_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isMaleGuDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return MALE_GU_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isMaleGuDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveMaleGuRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesMaleGuStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveMaleGuExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesMaleGuStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (MALE_GU_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isMaleGuDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveMaleGuHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesMaleGuStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isMaleGuDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterMaleGuMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesMaleGuStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isMaleGuDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectMaleGuVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: MaleGuGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveMaleGuHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isMaleGuDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveMaleGuRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveMaleGuExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isMaleGuDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isMaleGuDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const fieldKeys of Object.values(template.guidance ?? {})) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isMaleGuDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    if (template.complaintIntelligence) {
      for (const fragmentKey of flattenComplaintIntelligenceKeys(template.complaintIntelligence)) {
        if (!isMaleGuDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  return keys;
}
