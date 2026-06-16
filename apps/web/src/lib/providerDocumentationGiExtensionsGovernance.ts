/**
 * MEDUI.ED.ME.2AA-R — GI extensions sticky note governance.
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import { flattenComplaintIntelligenceKeys } from "./providerDocumentationComplaintIntelligence";

export const GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS = [
  "constipation_complaint_v1",
  "gi_bleed_complaint_v1",
  "hernia_complaint_v1",
  "rectal_pain_complaint_v1",
  "dysphagia_complaint_v1",
] as const satisfies readonly ProviderDocumentationTemplateId[];

export type GiExtensionsGovernedTemplateId = (typeof GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS)[number];

const GOVERNED_SET = new Set<string>(GI_EXTENSIONS_GOVERNED_TEMPLATE_IDS);

export const GI_EXTENSIONS_DENIED_STICKY_NOTE_FRAGMENT_KEYS = [
  "erMseHpiChips.locChestPain",
  "erMseHpiChips.locHeadache",
  "erMseHpiChipsTrauma.fallMechanism",
  "erMseHpiChipsTrauma.mvcMechanism",
  "erMseRosChips.posChestPain",
  "erMseRosChips.rfNeuroDeficit",
  "erMseExamChips.neuroFocalDeficitNoted",
  "erMseExamChips.cardioRrr",
  "erMseExamChips.cardioTachycardic",
  "erMseExamChips.mskDeformityNoted",
  "erMseExamChips.psychAnxious",
  "erMseExamChips.skinRashPresent",
  "erMseExamChips.heentDentalCaries",
  "providerDocumentationWorkspace.stickerHpiDysuria",
  "erMseMdmChips.waTrauma",
  "erMseMdmChips.waPsychiatric",
  "erMseMdmChips.waCardiopulmonary",
  "erMseMdmChips.waNeurologic",
  "providerDocumentationMdmHighValue.ekgNormal",
] as const;

export const GI_EXTENSIONS_DENIED_HPI_FRAGMENT_PREFIXES = [
  "providerDocumentationComplaintIntel.stroke.",
  "providerDocumentationComplaintIntel.weakness.",
  "providerDocumentationComplaintIntel.alteredMentalStatusComplaintV1.",
  "providerDocumentationComplaintIntel.focalWeaknessComplaintV1.",
  "providerDocumentationComplaintIntel.palpitationsComplaintV1.",
  "providerDocumentationComplaintIntel.hypertensionComplaintV1.",
  "providerDocumentationComplaintIntel.chfSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.hyperglycemiaComplaintV1.",
  "providerDocumentationComplaintIntel.hypoglycemiaComplaintV1.",
  "providerDocumentationComplaintIntel.diabetesSickDayComplaintV1.",
  "providerDocumentationComplaintIntel.dehydrationMetabolicComplaintV1.",
  "providerDocumentationComplaintIntel.electrolyteAbnormalityComplaintV1.",
  "providerDocumentationComplaintIntel.renalFailureSymptomsComplaintV1.",
  "providerDocumentationComplaintIntel.femalePelvicGynComplaint.",
  "providerDocumentationComplaintIntel.maleGenitalComplaint.",
  "providerDocumentationComplaintIntel.fall.",
  "providerDocumentationComplaintIntel.mvcCollision.",
  "providerDocumentationComplaintIntel.psychiatricBehavioral.",
  "providerDocumentationComplaintIntel.dentalOral.",
  "providerDocumentationComplaintIntel.allergicReactionRash.",
  "providerDocumentationComplaintIntel.rashSkinComplaint.",
] as const;

export function isGiExtensionsGovernedTemplate(
  templateId: string | null | undefined
): templateId is GiExtensionsGovernedTemplateId {
  return templateId != null && GOVERNED_SET.has(templateId);
}

function isGiExtensionsDeniedStickyNoteFragment(fragmentKey: string): boolean {
  if (
    GI_EXTENSIONS_DENIED_STICKY_NOTE_FRAGMENT_KEYS.includes(
      fragmentKey as (typeof GI_EXTENSIONS_DENIED_STICKY_NOTE_FRAGMENT_KEYS)[number]
    )
  ) {
    return true;
  }
  return GI_EXTENSIONS_DENIED_HPI_FRAGMENT_PREFIXES.some((prefix) => fragmentKey.startsWith(prefix));
}

function filterGiExtensionsChipGroups<T extends { chips: { fragmentKey: string }[] }>(groups: T[]): T[] {
  return groups
    .map((group) => ({
      ...group,
      chips: group.chips.filter((chip) => !isGiExtensionsDeniedStickyNoteFragment(chip.fragmentKey)),
    }))
    .filter((group) => group.chips.length > 0);
}

export function resolveGiExtensionsRosChipGroupsForTemplate<T extends { chips: { fragmentKey: string }[] }>(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  baseGroups: T[]
): T[] {
  if (!isGiExtensionsGovernedTemplate(templateId)) return baseGroups;
  return filterGiExtensionsChipGroups(baseGroups);
}

export function resolveGiExtensionsExamChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[]; sectionId: string },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isGiExtensionsGovernedTemplate(templateId)) return baseGroups;
  return filterGiExtensionsChipGroups(baseGroups);
}

export function resolveGiExtensionsHpiChipGroupsForTemplate<
  T extends { chips: { fragmentKey: string }[] },
>(templateId: ProviderDocumentationTemplateId | null | undefined, baseGroups: T[]): T[] {
  if (!isGiExtensionsGovernedTemplate(templateId)) return baseGroups;
  return filterGiExtensionsChipGroups(baseGroups);
}

export function filterGiExtensionsMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null | undefined,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  if (!isGiExtensionsGovernedTemplate(templateId)) return options;
  return options.filter((option) => !isGiExtensionsDeniedStickyNoteFragment(option.fragmentKey));
}

export function collectGiExtensionsComplaintIntelFragmentKeys(
  bundle: Parameters<typeof flattenComplaintIntelligenceKeys>[0]
): string[] {
  return flattenComplaintIntelligenceKeys(bundle);
}
