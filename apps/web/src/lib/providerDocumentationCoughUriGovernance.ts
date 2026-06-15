/**
 * MEDUI.ED.ME.2F — Cough / URI sticky note governance (simple respiratory infection templates).
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
  COUGH_COMPLAINT_INTEL,
  URI_RESPIRATORY_COMPLAINT_INTEL,
  flattenComplaintIntelligenceKeys,
  type ProviderDocumentationComplaintIntelligence,
} from "./providerDocumentationComplaintIntelligence";
import {
  COUGH_COMPLAINT_V1_INTEL,
  URI_CONGESTION_COMPLAINT_V1_INTEL,
  CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
} from "./providerDocumentationRespiratoryComplaintIntelligence19Mdm3";

type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export const COUGH_URI_GOVERNED_TEMPLATE_IDS = [
  "cough",
  "adult_uri_respiratory",
  "uri_respiratory",
  "cough_complaint_v1",
  "uri_congestion_complaint_v1",
  "chest_congestion_complaint_v1",
  "flu_like_illness_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type CoughUriGovernedTemplateId = (typeof COUGH_URI_GOVERNED_TEMPLATE_IDS)[number];

const COUGH_URI_GOVERNED_TEMPLATE_ID_SET = new Set<string>(COUGH_URI_GOVERNED_TEMPLATE_IDS);

const FLU_LIKE_GI_OVERLAP_ALLOWED_FRAGMENT_KEYS = new Set<string>([
  "erMseRosChips.posVomiting",
  "erMseHpiChips.assocNausea",
  "erMseHpiChips.assocVomiting",
]);

/** Wrong-domain and over-broad global chips denied for cough / URI templates. */
export const COUGH_URI_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChips.locLimbPain",
  "erMseHpiChips.locBackPain",
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.qualPressureLike",
  "erMseHpiChips.qualBurning",
  "erMseHpiChips.timExertional",
  "erMseHpiChips.assocDiaphoresis",
  "erMseHpiChips.assocNausea",
  "erMseHpiChips.assocVomiting",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.negDeniesAbdominalPain",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfSeverePain",
  "erMseRosChips.rfNeuroDeficit",
  "erMseRosChips.posVomiting",
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
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.planEcg",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const COUGH_URI_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationTemplateLocation.abdominal.",
  "providerDocumentationTemplateLocation.sob.",
  "providerDocumentationTemplateLocation.chestPain.",
  "providerDocumentationTemplateLocation.headache.",
  "providerDocumentationComplaintIntel.headache.",
  "providerDocumentationComplaintIntel.dizzinessSyncope.",
  "providerDocumentationComplaintIntel.vertigoComplaintV1.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.pediatricAbdominalPain.",
  "providerDocumentationComplaintIntel.abdominalPainComplaintV1.",
  "providerDocumentationComplaintIntel.sob.",
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

/** Over-broad cardiopulmonary / PE / ICU fragments denied on simple cough / URI templates. */
export const COUGH_URI_DENIED_OVERBROAD_FRAGMENT_SUFFIXES = [
  ".diffPe",
  ".diffPulmonaryEmbolism",
  ".diffPeAcsWhenRelevant",
  ".diffChfPeWhenRelevant",
  ".diffChf",
  ".diffChfExacerbation",
  ".diffAcs",
  ".diffAcsEquivalent",
  ".hpiOrthopnea",
  ".mdmPeConsideredBasedOnRiskFactors",
  ".mdmPeConsidered",
  ".mdmEcgReviewed",
  ".mdmTroponinReviewed",
  ".mdmBnpReviewed",
  ".mdmCta",
  ".rfPeConcern",
  ".rfChfConcern",
] as const;

export const COUGH_URI_ALLOWED_EXAM_SECTION_IDS = [
  "general",
  "heent",
  "respiratory",
  "cardiovascular",
  "reassessment",
] as const;

export const COUGH_URI_REQUIRED_STICKY_NOTE_FRAGMENT_KEYS = [
  "providerDocumentationComplaintIntel.cough.hpiDryCough",
  "providerDocumentationComplaintIntel.cough.hpiProductiveCough",
  "providerDocumentationComplaintIntel.cough.hpiSickContacts",
  "providerDocumentationComplaintIntel.uriRespiratory.hpiNasalCongestion",
  "providerDocumentationComplaintIntel.uriRespiratory.hpiRunnyNose",
  "providerDocumentationComplaintIntel.uriRespiratory.hpiSoreThroat",
  "providerDocumentationComplaintIntel.uriRespiratory.hpiSickContacts",
  "providerDocumentationComplaintIntel.coughComplaintV1.hpiDryCough",
  "providerDocumentationComplaintIntel.uriCongestionComplaintV1.hpiNasalCongestion",
  "providerDocumentationComplaintIntel.fluLikeIllnessComplaintV1.hpiFever",
  "providerDocumentationComplaintIntel.cough.examScatteredWheezing",
  "providerDocumentationComplaintIntel.uriRespiratory.examNasalCongestionPresent",
  "providerDocumentationComplaintIntel.uriRespiratory.diffViralUri",
  "providerDocumentationComplaintIntel.uriRespiratory.diffInfluenza",
  "providerDocumentationComplaintIntel.coughComplaintV1.diffAcuteBronchitis",
] as const;

const DENIED_STICKY_NOTE_FRAGMENT_KEY_SET = new Set<string>(COUGH_URI_DENIED_STICKY_NOTE_FRAGMENT_KEYS);

const COMPLAINT_INTEL_BY_COUGH_URI_TEMPLATE_ID: Partial<
  Record<CoughUriGovernedTemplateId, ProviderDocumentationComplaintIntelligence>
> = {
  cough: COUGH_COMPLAINT_INTEL,
  adult_uri_respiratory: URI_RESPIRATORY_COMPLAINT_INTEL,
  uri_respiratory: URI_RESPIRATORY_COMPLAINT_INTEL,
  cough_complaint_v1: COUGH_COMPLAINT_V1_INTEL,
  uri_congestion_complaint_v1: URI_CONGESTION_COMPLAINT_V1_INTEL,
  chest_congestion_complaint_v1: CHEST_CONGESTION_COMPLAINT_V1_INTEL,
  flu_like_illness_complaint_v1: FLU_LIKE_ILLNESS_COMPLAINT_V1_INTEL,
};

export function templateUsesCoughUriStickyNoteGovernance(
  templateId: ProviderDocumentationTemplateId | null
): templateId is CoughUriGovernedTemplateId {
  return Boolean(templateId && COUGH_URI_GOVERNED_TEMPLATE_ID_SET.has(templateId));
}

function allowsChfDifferential(templateId: CoughUriGovernedTemplateId): boolean {
  return templateId === "chest_congestion_complaint_v1";
}

function allowsFluLikeGiOverlap(
  templateId: CoughUriGovernedTemplateId,
  fragmentKey: string
): boolean {
  return templateId === "flu_like_illness_complaint_v1" && FLU_LIKE_GI_OVERLAP_ALLOWED_FRAGMENT_KEYS.has(fragmentKey);
}

function isOverBroadCardiopulmonaryFragmentDenied(
  fragmentKey: string,
  templateId: CoughUriGovernedTemplateId
): boolean {
  if (fragmentKey.endsWith(".diffChf") && allowsChfDifferential(templateId)) return false;
  return COUGH_URI_DENIED_OVERBROAD_FRAGMENT_SUFFIXES.some((suffix) => fragmentKey.endsWith(suffix));
}

export function isCoughUriDeniedStickyNoteFragment(
  fragmentKey: string,
  templateId: ProviderDocumentationTemplateId | null = null
): boolean {
  if (
    templateUsesCoughUriStickyNoteGovernance(templateId) &&
    allowsFluLikeGiOverlap(templateId, fragmentKey)
  ) {
    return false;
  }
  if (DENIED_STICKY_NOTE_FRAGMENT_KEY_SET.has(fragmentKey)) return true;
  if (COUGH_URI_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix))) return true;
  if (
    templateUsesCoughUriStickyNoteGovernance(templateId) &&
    isOverBroadCardiopulmonaryFragmentDenied(fragmentKey, templateId)
  ) {
    return true;
  }
  return false;
}

function filterChipGroups<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: CoughUriGovernedTemplateId,
  groups: T[]
): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isCoughUriDeniedStickyNoteFragment(chip.fragmentKey, templateId)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveCoughUriRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  if (!templateUsesCoughUriStickyNoteGovernance(templateId)) return baseGroups;
  return filterChipGroups(templateId, baseGroups);
}

export function resolveCoughUriExamChipGroupsForTemplate<
  T extends StickyNoteExamChipGroup<{ fragmentKey: string }>,
>(templateId: ProviderDocumentationTemplateId | null, baseGroups: T[]): T[] {
  if (!templateUsesCoughUriStickyNoteGovernance(templateId)) return baseGroups;
  return baseGroups
    .filter((group) => (COUGH_URI_ALLOWED_EXAM_SECTION_IDS as readonly string[]).includes(group.sectionId))
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isCoughUriDeniedStickyNoteFragment(chip.fragmentKey, templateId)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveCoughUriHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const groups = resolveBaseHpiChipGroupsForTemplate(templateId, baseGroups);
  if (!templateUsesCoughUriStickyNoteGovernance(templateId)) return groups;
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isCoughUriDeniedStickyNoteFragment(chip.fragmentKey, templateId)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function filterCoughUriMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!templateUsesCoughUriStickyNoteGovernance(templateId)) return options;
  return options.filter((option) => !isCoughUriDeniedStickyNoteFragment(option.fragmentKey, templateId));
}

export function collectCoughUriVisibleStickyNoteFragmentKeys({
  templateId,
  rosBaseGroups,
  examBaseGroups,
  hpiBaseGroups,
}: {
  templateId: CoughUriGovernedTemplateId;
  rosBaseGroups: StickyNoteChipGroup<{ fragmentKey: string }>[];
  examBaseGroups: StickyNoteExamChipGroup<{ fragmentKey: string }>[];
  hpiBaseGroups: ProviderDocumentationHpiDimensionGroup[];
}): Set<string> {
  const keys = new Set<string>();
  const template = PROVIDER_DOCUMENTATION_TEMPLATES.find((item) => item.id === templateId) ?? null;

  for (const group of resolveCoughUriHpiChipGroupsForTemplate(templateId, hpiBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of getTemplateHpiDimensionGroups(templateId) ?? []) {
    for (const chip of group.chips) {
      if (!isCoughUriDeniedStickyNoteFragment(chip.fragmentKey, templateId)) keys.add(chip.fragmentKey);
    }
  }

  for (const group of resolveCoughUriRosChipGroupsForTemplate(templateId, rosBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }
  for (const group of resolveCoughUriExamChipGroupsForTemplate(templateId, examBaseGroups)) {
    for (const chip of group.chips) keys.add(chip.fragmentKey);
  }

  if (template) {
    for (const fieldKeys of Object.values(template.fields)) {
      for (const fragmentKey of fieldKeys ?? []) {
        if (!isCoughUriDeniedStickyNoteFragment(fragmentKey, templateId)) keys.add(fragmentKey);
      }
    }
    for (const sectionKeys of Object.values(template.physicalExam)) {
      for (const fragmentKey of sectionKeys ?? []) {
        if (!isCoughUriDeniedStickyNoteFragment(fragmentKey, templateId)) keys.add(fragmentKey);
      }
    }
  }

  const complaintIntel = COMPLAINT_INTEL_BY_COUGH_URI_TEMPLATE_ID[templateId];
  if (complaintIntel) {
    for (const fragmentKey of flattenComplaintIntelligenceKeys(complaintIntel)) {
      if (!isCoughUriDeniedStickyNoteFragment(fragmentKey, templateId)) keys.add(fragmentKey);
    }
  }

  return keys;
}
