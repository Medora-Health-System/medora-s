/**
 * MEDUI.ED.ME.2Z-R — Renal / metabolic / endocrine sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

/** nausea_vomiting_metabolic_complaint_v1 remains under nausea governance (ME.2C-R). */
export const RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS = [
  "hyperglycemia_complaint_v1",
  "hypoglycemia_complaint_v1",
  "diabetes_sick_day_complaint_v1",
  "insulin_medication_issue_complaint_v1",
  "polyuria_polydipsia_complaint_v1",
  "dehydration_metabolic_complaint_v1",
  "electrolyte_abnormality_complaint_v1",
  "thyroid_symptoms_complaint_v1",
  "generalized_weakness_metabolic_complaint_v1",
  "renal_failure_symptoms_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type RenalMetabolicEndocrineGovernedTemplateId =
  (typeof RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(RENAL_METABOLIC_ENDOCRINE_GOVERNED_TEMPLATE_IDS);

export const RENAL_METABOLIC_ENDOCRINE_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posChestPain",
  "erMseRosChips.rfNeuroDeficit",
  "erMseExamChips.neuroFocalDeficitNoted",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.psychAnxious",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.heentDentalCaries",
  "providerDocumentationWorkspace.stickerHpiDysuria",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waPsychiatric",
] as const;

export const RENAL_METABOLIC_ENDOCRINE_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.alteredMentalStatusComplaintV1.",
  "providerDocumentationComplaintIntel.focalWeaknessComplaintV1.",
  "providerDocumentationComplaintIntel.palpitationsComplaintV1.",
  "providerDocumentationComplaintIntel.hypertensionComplaintV1.",
  "providerDocumentationComplaintIntel.chfSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.dentalOral.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaint.",
] as const;

export function isRenalMetabolicEndocrineGovernedTemplate(
  templateId: string | null | undefined
): templateId is RenalMetabolicEndocrineGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isRenalMetabolicEndocrineDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    RENAL_METABOLIC_ENDOCRINE_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof RENAL_METABOLIC_ENDOCRINE_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return RENAL_METABOLIC_ENDOCRINE_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterRenalMetabolicEndocrineChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isRenalMetabolicEndocrineDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveRenalMetabolicEndocrineRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isRenalMetabolicEndocrineGovernedTemplate(templateId)) return baseGroups;
  return filterRenalMetabolicEndocrineChipGroups(baseGroups);
}

export function resolveRenalMetabolicEndocrineExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isRenalMetabolicEndocrineGovernedTemplate(templateId)) return baseGroups;
  return filterRenalMetabolicEndocrineChipGroups(baseGroups);
}

export function resolveRenalMetabolicEndocrineHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isRenalMetabolicEndocrineGovernedTemplate(templateId)) return baseGroups;
  return filterRenalMetabolicEndocrineChipGroups(baseGroups);
}

export function filterRenalMetabolicEndocrineMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isRenalMetabolicEndocrineGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isRenalMetabolicEndocrineDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectRenalMetabolicEndocrineComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
