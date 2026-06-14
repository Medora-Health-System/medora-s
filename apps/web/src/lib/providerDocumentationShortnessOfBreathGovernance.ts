/**
 * MEDUI.ED.ME.2E — Shortness of breath / respiratory sticky note governance.
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
  SOB_COMPLAINT_INTEL,
  PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
  type ProviderDocumentationComplaintIntelligence,
} from "./providerDocumentationComplaintIntelligence";
import {
  RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";

export const SHORTNESS_OF_BREATH_HIGH_ACUITY_TEMPLATE_IDS = [
  "asthma_wheezing_complaint_v1",
  "copd_exacerbation_complaint_v1",
  "pneumonia_symptoms_complaint_v1",
  "hemoptysis_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export const SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS = [
  "sob",
  "asthma_wheezing",
  ...SHORTNESS_OF_BREATH_HIGH_ACUITY_TEMPLATE_IDS,
] as const satisfies readonly ProviderDocumentationTemplateId[];

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export type ShortnessOfBreathGovernedTemplateId = (typeof SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS)[number];

const SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_ID_SET = new Set<string>(SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_IDS);

/** Fragment keys that must not appear when a respiratory / SOB template is active. */
export const SHORTNESS_OF_BREATH_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.assocNausea",
  "erMseHpiChips.assocVomiting",
  "erMseHpiChips.qualBurning",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.posVomiting",
  "erMseRosChips.posHeadache",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.negDeniesVomiting",
  "erMseRosChips.negDeniesHeadache",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfSeverePain",
  "erMseRosChips.rfNeuroDeficit",
  "erMseExamChips.heentHeadAtraumatic",
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
  "erMseExamChips.abdSoft",
  "erMseExamChips.abdNonTender",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.abdGuarding",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
  "erMseMdmChips.waNeurologic",
] as const;

export const SHORTNESS_OF_BREATH_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.utiUrinarySymptoms.",
  "providerDocumentationComplaintIntel.dysuriaComplaintV1.",
  "providerDocumentationComplaintIntel.adultDiarrhea.",
  "providerDocumentationComplaintIntel.pediatricVomitingDiarrhea.",
  "providerDocumentationComplaintIntel.adultNauseaVomiting.",
  "providerDocumentationComplaintIntel.diarrheaComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingComplaintV1.",
  "providerDocumentationComplaintIntel.nauseaVomitingMetabolicComplaintV1.",
  "providerDocumentationComplaintIntel.constipationComplaintV1.",
  "providerDocumentationComplaintIntel.giBleedComplaintV1.",
  "providerDocumentationComplaintIntel.hematuriaComplaintV1.",
  "providerDocumentationComplaintIntel.shoulderInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.kneeInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.ankleFootInjuryComplaintV1.",
  "providerDocumentationComplaintIntel.penetratingInjury.",
  "providerDocumentationComplaintIntel.pediatricTrauma.",
] as const;

export const SHORTNESS_OF_BREATH_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "respiratory",
  "cardiovascular",
  "reassessment",
] as const;

export const SHORTNESS_OF_BREATH_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationTemplateLocation.sob.withExertion",
  "providerDocumentationComplaintIntel.sob.hpiSuddenOnsetDyspnea",
  "providerDocumentationComplaintIntel.sob.hpiOrthopnea",
  "providerDocumentationComplaintIntel.sob.hpiWheezing",
  "providerDocumentationComplaintIntel.sob.hpiProductiveCough",
  "providerDocumentationComplaintIntel.sob.rosCough",
  "providerDocumentationComplaintIntel.sob.examWheezing",
  "providerDocumentationComplaintIntel.sob.diffAsthmaExacerbation",
  "providerDocumentationComplaintIntel.sob.diffCopdExacerbation",
  "providerDocumentationComplaintIntel.sob.diffChfExacerbation",
  "providerDocumentationComplaintIntel.sob.diffPneumonia",
  "providerDocumentationComplaintIntel.sob.diffPe",
  "providerDocumentationComplaintIntel.sob.mdmPeConsidered",
  "providerDocumentationComplaintIntel.asthmaWheezingComplaintV1.diffAsthmaExacerbation",
  "providerDocumentationComplaintIntel.copdExacerbationComplaintV1.diffCopdExacerbation",
  "providerDocumentationComplaintIntel.pneumoniaSymptomsComplaintV1.diffPneumonia",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(SHORTNESS_OF_BREATH_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_SHORTNESS_OF_BREATH_TEMPLATE_ID: Partial<
  Record<ShortnessOfBreathGovernedTemplateId, ProviderDocumentationComplaintIntelligence>
> = {
  sob: SOB_COMPLAINT_INTEL,
  asthma_wheezing: PEDIATRIC_ASTHMA_WHEEZING_COMPLAINT_INTEL,
  asthma_wheezing_complaint_v1: RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.asthma_wheezing_complaint_v1,
  copd_exacerbation_complaint_v1: RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.copd_exacerbation_complaint_v1,
  pneumonia_symptoms_complaint_v1: RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.pneumonia_symptoms_complaint_v1,
  hemoptysis_complaint_v1: RESPIRATORY_COMPLAINT_V1_INTEL_BY_TEMPLATE_ID.hemoptysis_complaint_v1,
};

export function templateUsesShortnessOfBreathStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is ShortnessOfBreathGovernedTemplateId {
  return Boolean(templateId && SHORTNESS_OF_BREATH_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

export function isShortnessOfBreathDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  return SHORTNESS_OF_BREATH_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isShortnessOfBreathDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveShortnessOfBreathRosChipGroupsForTemplate<
  T extends StickyNoteChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesShortnessOfBreathStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(baseGroups);
}

export function resolveShortnessOfBreathExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesShortnessOfBreathStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) =>
      (SHORTNESS_OF_BREATH_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId)
    )
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isShortnessOfBreathDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveShortnessOfBreathHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesShortnessOfBreathStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isShortnessOfBreathDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterShortnessOfBreathMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesShortnessOfBreathStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isShortnessOfBreathDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectShortnessOfBreathVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: ShortnessOfBreathGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveShortnessOfBreathHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isShortnessOfBreathDeniedStickyNoteFragment(chip.fragmentKey)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveShortnessOfBreathRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveShortnessOfBreathExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isShortnessOfBreathDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isShortnessOfBreathDeniedStickyNoteFragment(fragmentKey)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_SHORTNESS_OF_BREATH_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      keys.add(fragmentKey);
    }
  }

  return keys;
}
