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
import {
  filterNauseaVomitingMdmTemplateOptionsForTemplate,
  resolveNauseaVomitingExamChipGroupsForTemplate,
  resolveNauseaVomitingHpiChipGroupsForTemplate,
  resolveNauseaVomitingRosChipGroupsForTemplate,
} from "./providerDocumentationNauseaVomitingGovernance";

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
  return resolveNauseaVomitingRosChipGroupsForTemplate(
    templateId,
    resolveDiarrheaRosChipGroupsForTemplate(
      templateId,
      resolveUrinaryRosChipGroupsForTemplate(templateId, baseGroups)
    )
  );
}

export function resolveExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveNauseaVomitingExamChipGroupsForTemplate(
    templateId,
    resolveDiarrheaExamChipGroupsForTemplate(
      templateId,
      resolveUrinaryExamChipGroupsForTemplate(templateId, baseGroups)
    )
  );
}

export function resolveHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveNauseaVomitingHpiChipGroupsForTemplate(
    templateId,
    resolveDiarrheaHpiChipGroupsForTemplate(templateId, baseGroups)
  );
}

export function filterMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  return filterNauseaVomitingMdmTemplateOptionsForTemplate(
    templateId,
    filterDiarrheaMdmTemplateOptionsForTemplate(
      templateId,
      filterUrinaryMdmTemplateOptionsForTemplate(templateId, options)
    )
  );
}
