/**
 * Composed complaint-specific sticky note governance router (UTI, diarrhea, …).
 */
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";
import type { MdmTemplateOption } from "./providerDocumentationMdmTemplateCatalog";
import type { ProviderDocumentationHpiDimensionGroup } from "./providerDocumentationTemplateHpiDimensions";
import {
  filterMdmTemplateOptionsForTemplate as filterUrinaryMdmTemplateOptionsForTemplate,
  resolveExamChipGroupsForTemplate as resolveUrinaryExamChipGroupsForTemplate,
  resolveRosChipGroupsForTemplate as resolveUrinaryRosChipGroupsForTemplate,
} from "./providerDocumentationUrinarySymptomsGovernance";
import {
  filterDiarrheaMdmTemplateOptionsForTemplate,
  resolveDiarrheaExamChipGroupsForTemplate,
  resolveDiarrheaHpiChipGroupsForTemplate,
  resolveDiarrheaRosChipGroupsForTemplate,
} from "./providerDocumentationDiarrheaGovernance";

export type StickyNoteChipGroup<TChip extends { fragmentKey: string }> = {
  chips: TChip[];
};

export type StickyNoteExamChipGroup<TChip extends { fragmentKey: string }> = StickyNoteChipGroup<TChip> & {
  sectionId: string;
};

export function resolveRosChipGroupsForTemplate<T extends StickyNoteChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveDiarrheaRosChipGroupsForTemplate(
    templateId,
    resolveUrinaryRosChipGroupsForTemplate(templateId, baseGroups)
  );
}

export function resolveExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveDiarrheaExamChipGroupsForTemplate(
    templateId,
    resolveUrinaryExamChipGroupsForTemplate(templateId, baseGroups)
  );
}

export function resolveHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveDiarrheaHpiChipGroupsForTemplate(templateId, baseGroups);
}

export function filterMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  return filterDiarrheaMdmTemplateOptionsForTemplate(
    templateId,
    filterUrinaryMdmTemplateOptionsForTemplate(templateId, options)
  );
}
