/**
 * MEDUI.ED.ME.2Y-R — Cardiac non-chest-pain sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

/** near_syncope_complaint_v1 remains under dizziness governance (ME.2M-R). */
export const CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS = [
  "palpitations_complaint_v1",
  "hypertension_complaint_v1",
  "leg_swelling_dvt_complaint_v1",
  "chf_symptoms_complaint_v1",
  "afib_rapid_rate_complaint_v1",
  "generalized_weakness_cardiac_equivalent_complaint_v1",
  "exertional_dyspnea_complaint_v1",
  "edema_volume_overload_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type CardiacNonChestPainGovernedTemplateId = (typeof CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(CARDIAC_NON_CHEST_PAIN_GOVERNED_TEMPLATE_IDS);

export const CARDIAC_NON_CHEST_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locAbdominalPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChips.locFlankPain",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posAbdominalPain",
  "erMseRosChips.rfPregnancyConcern",
  "erMseRosChips.rfBleeding",
  "erMseExamChips.abdTendernessPresent",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.neuroFocalDeficitNoted",
  "providerDocumentationWorkspace.stickerHpiDysuria",
  "providerDocumentationWorkspace.stickerRosDysuria",
  "erMseMdmChips.waAbdominal",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waMedIntox",
] as const;

export const CARDIAC_NON_CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.abdominal.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.dentalOral.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaint.",
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.alteredMentalStatusComplaintV1.",
  "providerDocumentationComplaintIntel.focalWeaknessComplaintV1.",
] as const;

export function isCardiacNonChestPainGovernedTemplate(
  templateId: string | null | undefined
): templateId is CardiacNonChestPainGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isCardiacNonChestPainDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    CARDIAC_NON_CHEST_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof CARDIAC_NON_CHEST_PAIN_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return CARDIAC_NON_CHEST_PAIN_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterCardiacChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isCardiacNonChestPainDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveCardiacNonChestPainRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isCardiacNonChestPainGovernedTemplate(templateId)) return baseGroups;
  return filterCardiacChipGroups(baseGroups);
}

export function resolveCardiacNonChestPainExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isCardiacNonChestPainGovernedTemplate(templateId)) return baseGroups;
  return filterCardiacChipGroups(baseGroups);
}

export function resolveCardiacNonChestPainHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isCardiacNonChestPainGovernedTemplate(templateId)) return baseGroups;
  return filterCardiacChipGroups(baseGroups);
}

export function filterCardiacNonChestPainMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isCardiacNonChestPainGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isCardiacNonChestPainDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectCardiacNonChestPainComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
