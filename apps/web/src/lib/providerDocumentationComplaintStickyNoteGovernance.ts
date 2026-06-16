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
  filterAbdominalPainMdmTemplateOptionsForTemplate,
  resolveAbdominalPainExamChipGroupsForTemplate,
  resolveAbdominalPainHpiChipGroupsForTemplate,
  resolveAbdominalPainRosChipGroupsForTemplate,
} from "./providerDocumentationAbdominalPainGovernance";
import {
  filterNauseaVomitingMdmTemplateOptionsForTemplate,
  resolveNauseaVomitingExamChipGroupsForTemplate,
  resolveNauseaVomitingHpiChipGroupsForTemplate,
  resolveNauseaVomitingRosChipGroupsForTemplate,
} from "./providerDocumentationNauseaVomitingGovernance";
import {
  filterShortnessOfBreathMdmTemplateOptionsForTemplate,
  resolveShortnessOfBreathExamChipGroupsForTemplate,
  resolveShortnessOfBreathHpiChipGroupsForTemplate,
  resolveShortnessOfBreathRosChipGroupsForTemplate,
} from "./providerDocumentationShortnessOfBreathGovernance";
import {
  filterCoughUriMdmTemplateOptionsForTemplate,
  resolveCoughUriExamChipGroupsForTemplate,
  resolveCoughUriHpiChipGroupsForTemplate,
  resolveCoughUriRosChipGroupsForTemplate,
} from "./providerDocumentationCoughUriGovernance";
import {
  filterAdultFeverMdmTemplateOptionsForTemplate,
  resolveAdultFeverExamChipGroupsForTemplate,
  resolveAdultFeverHpiChipGroupsForTemplate,
  resolveAdultFeverRosChipGroupsForTemplate,
} from "./providerDocumentationAdultFeverGovernance";
import {
  filterBackPainMdmTemplateOptionsForTemplate,
  resolveBackPainExamChipGroupsForTemplate,
  resolveBackPainHpiChipGroupsForTemplate,
  resolveBackPainRosChipGroupsForTemplate,
} from "./providerDocumentationBackPainGovernance";
import {
  filterFemalePelvicGynMdmTemplateOptionsForTemplate,
  resolveFemalePelvicGynExamChipGroupsForTemplate,
  resolveFemalePelvicGynHpiChipGroupsForTemplate,
  resolveFemalePelvicGynRosChipGroupsForTemplate,
} from "./providerDocumentationFemalePelvicGynGovernance";
import {
  filterRashMdmTemplateOptionsForTemplate,
  resolveRashExamChipGroupsForTemplate,
  resolveRashHpiChipGroupsForTemplate,
  resolveRashRosChipGroupsForTemplate,
} from "./providerDocumentationRashGovernance";
import {
  filterHeadacheMdmTemplateOptionsForTemplate,
  resolveHeadacheExamChipGroupsForTemplate,
  resolveHeadacheHpiChipGroupsForTemplate,
  resolveHeadacheRosChipGroupsForTemplate,
} from "./providerDocumentationHeadacheGovernance";
import {
  filterChestPainMdmTemplateOptionsForTemplate,
  resolveChestPainExamChipGroupsForTemplate,
  resolveChestPainHpiChipGroupsForTemplate,
  resolveChestPainRosChipGroupsForTemplate,
} from "./providerDocumentationChestPainGovernance";
import {
  filterDizzinessVertigoMdmTemplateOptionsForTemplate,
  resolveDizzinessVertigoExamChipGroupsForTemplate,
  resolveDizzinessVertigoHpiChipGroupsForTemplate,
  resolveDizzinessVertigoRosChipGroupsForTemplate,
} from "./providerDocumentationDizzinessVertigoGovernance";
import {
  filterTraumaMdmTemplateOptionsForTemplate,
  resolveTraumaExamChipGroupsForTemplate,
  resolveTraumaHpiChipGroupsForTemplate,
  resolveTraumaRosChipGroupsForTemplate,
} from "./providerDocumentationTraumaGovernance";
import {
  filterExtremityMskMdmTemplateOptionsForTemplate,
  resolveExtremityMskExamChipGroupsForTemplate,
  resolveExtremityMskHpiChipGroupsForTemplate,
  resolveExtremityMskRosChipGroupsForTemplate,
} from "./providerDocumentationExtremityMskGovernance";
import {
  filterMaleGuMdmTemplateOptionsForTemplate,
  resolveMaleGuExamChipGroupsForTemplate,
  resolveMaleGuHpiChipGroupsForTemplate,
  resolveMaleGuRosChipGroupsForTemplate,
} from "./providerDocumentationMaleGuGovernance";
import {
  filterSoreThroatMdmTemplateOptionsForTemplate,
  resolveSoreThroatExamChipGroupsForTemplate,
  resolveSoreThroatHpiChipGroupsForTemplate,
  resolveSoreThroatRosChipGroupsForTemplate,
} from "./providerDocumentationSoreThroatGovernance";
import {
  filterDehydrationViralIllnessMdmTemplateOptionsForTemplate,
  resolveDehydrationViralIllnessExamChipGroupsForTemplate,
  resolveDehydrationViralIllnessHpiChipGroupsForTemplate,
  resolveDehydrationViralIllnessRosChipGroupsForTemplate,
} from "./providerDocumentationDehydrationViralIllnessGovernance";
import {
  filterSinusSymptomsMdmTemplateOptionsForTemplate,
  resolveSinusSymptomsExamChipGroupsForTemplate,
  resolveSinusSymptomsHpiChipGroupsForTemplate,
  resolveSinusSymptomsRosChipGroupsForTemplate,
} from "./providerDocumentationSinusSymptomsGovernance";
import {
  filterEarPainMdmTemplateOptionsForTemplate,
  resolveEarPainExamChipGroupsForTemplate,
  resolveEarPainHpiChipGroupsForTemplate,
  resolveEarPainRosChipGroupsForTemplate,
} from "./providerDocumentationEarPainGovernance";
import {
  filterDentalOralMdmTemplateOptionsForTemplate,
  resolveDentalOralExamChipGroupsForTemplate,
  resolveDentalOralHpiChipGroupsForTemplate,
  resolveDentalOralRosChipGroupsForTemplate,
} from "./providerDocumentationDentalOralGovernance";
import {
  filterFlankPainRenalMdmTemplateOptionsForTemplate,
  resolveFlankPainRenalExamChipGroupsForTemplate,
  resolveFlankPainRenalHpiChipGroupsForTemplate,
  resolveFlankPainRenalRosChipGroupsForTemplate,
} from "./providerDocumentationFlankPainRenalGovernance";

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
  return resolveFlankPainRenalRosChipGroupsForTemplate(
    templateId,
    resolveDehydrationViralIllnessRosChipGroupsForTemplate(
    templateId,
    resolveSoreThroatRosChipGroupsForTemplate(
    templateId,
    resolveSinusSymptomsRosChipGroupsForTemplate(
    templateId,
    resolveEarPainRosChipGroupsForTemplate(
    templateId,
    resolveDentalOralRosChipGroupsForTemplate(
    templateId,
    resolveMaleGuRosChipGroupsForTemplate(
    templateId,
    resolveExtremityMskRosChipGroupsForTemplate(
    templateId,
    resolveTraumaRosChipGroupsForTemplate(
    templateId,
    resolveDizzinessVertigoRosChipGroupsForTemplate(
      templateId,
      resolveChestPainRosChipGroupsForTemplate(
        templateId,
        resolveHeadacheRosChipGroupsForTemplate(
          templateId,
          resolveRashRosChipGroupsForTemplate(
            templateId,
            resolveFemalePelvicGynRosChipGroupsForTemplate(
              templateId,
              resolveBackPainRosChipGroupsForTemplate(
                templateId,
                resolveAdultFeverRosChipGroupsForTemplate(
                  templateId,
                  resolveCoughUriRosChipGroupsForTemplate(
                    templateId,
                    resolveShortnessOfBreathRosChipGroupsForTemplate(
                      templateId,
                      resolveAbdominalPainRosChipGroupsForTemplate(
                        templateId,
                        resolveNauseaVomitingRosChipGroupsForTemplate(
                          templateId,
                          resolveDiarrheaRosChipGroupsForTemplate(
                            templateId,
                            resolveUrinaryRosChipGroupsForTemplate(templateId, baseGroups)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
    )
    )
    )
    )
    )
    )
    )
    )
  );
}

export function resolveExamChipGroupsForTemplate<T extends StickyNoteExamChipGroup<{ fragmentKey: string }>>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveFlankPainRenalExamChipGroupsForTemplate(
    templateId,
    resolveDehydrationViralIllnessExamChipGroupsForTemplate(
    templateId,
    resolveSoreThroatExamChipGroupsForTemplate(
    templateId,
    resolveSinusSymptomsExamChipGroupsForTemplate(
    templateId,
    resolveEarPainExamChipGroupsForTemplate(
    templateId,
    resolveDentalOralExamChipGroupsForTemplate(
    templateId,
    resolveMaleGuExamChipGroupsForTemplate(
    templateId,
    resolveExtremityMskExamChipGroupsForTemplate(
    templateId,
    resolveTraumaExamChipGroupsForTemplate(
    templateId,
    resolveDizzinessVertigoExamChipGroupsForTemplate(
      templateId,
      resolveChestPainExamChipGroupsForTemplate(
        templateId,
        resolveHeadacheExamChipGroupsForTemplate(
          templateId,
          resolveRashExamChipGroupsForTemplate(
            templateId,
            resolveFemalePelvicGynExamChipGroupsForTemplate(
              templateId,
              resolveBackPainExamChipGroupsForTemplate(
                templateId,
                resolveAdultFeverExamChipGroupsForTemplate(
                  templateId,
                  resolveCoughUriExamChipGroupsForTemplate(
                    templateId,
                    resolveShortnessOfBreathExamChipGroupsForTemplate(
                      templateId,
                      resolveAbdominalPainExamChipGroupsForTemplate(
                        templateId,
                        resolveNauseaVomitingExamChipGroupsForTemplate(
                          templateId,
                          resolveDiarrheaExamChipGroupsForTemplate(
                            templateId,
                            resolveUrinaryExamChipGroupsForTemplate(templateId, baseGroups)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
    )
    )
    )
    )
    )
    )
    )
    )
  );
}

export function resolveHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiDimensionGroup>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  return resolveFlankPainRenalHpiChipGroupsForTemplate(
    templateId,
    resolveDehydrationViralIllnessHpiChipGroupsForTemplate(
    templateId,
    resolveSoreThroatHpiChipGroupsForTemplate(
    templateId,
    resolveSinusSymptomsHpiChipGroupsForTemplate(
    templateId,
    resolveEarPainHpiChipGroupsForTemplate(
    templateId,
    resolveDentalOralHpiChipGroupsForTemplate(
    templateId,
    resolveMaleGuHpiChipGroupsForTemplate(
    templateId,
    resolveExtremityMskHpiChipGroupsForTemplate(
    templateId,
    resolveTraumaHpiChipGroupsForTemplate(
    templateId,
    resolveDizzinessVertigoHpiChipGroupsForTemplate(
      templateId,
      resolveChestPainHpiChipGroupsForTemplate(
        templateId,
        resolveHeadacheHpiChipGroupsForTemplate(
          templateId,
          resolveRashHpiChipGroupsForTemplate(
            templateId,
            resolveFemalePelvicGynHpiChipGroupsForTemplate(
              templateId,
              resolveBackPainHpiChipGroupsForTemplate(
                templateId,
                resolveAdultFeverHpiChipGroupsForTemplate(
                  templateId,
                  resolveCoughUriHpiChipGroupsForTemplate(
                    templateId,
                    resolveShortnessOfBreathHpiChipGroupsForTemplate(
                      templateId,
                      resolveAbdominalPainHpiChipGroupsForTemplate(
                        templateId,
                        resolveNauseaVomitingHpiChipGroupsForTemplate(
                          templateId,
                          resolveDiarrheaHpiChipGroupsForTemplate(templateId, baseGroups)
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
        )
      )
    )
    )
    )
    )
    )
    )
    )
    )
  );
}

export function filterMdmTemplateOptionsForTemplate(
  templateId: ProviderDocumentationTemplateId | null,
  options: MdmTemplateOption[]
): MdmTemplateOption[] {
  return filterFlankPainRenalMdmTemplateOptionsForTemplate(
    templateId,
    filterDehydrationViralIllnessMdmTemplateOptionsForTemplate(
    templateId,
    filterSoreThroatMdmTemplateOptionsForTemplate(
    templateId,
    filterSinusSymptomsMdmTemplateOptionsForTemplate(
    templateId,
    filterEarPainMdmTemplateOptionsForTemplate(
    templateId,
    filterDentalOralMdmTemplateOptionsForTemplate(
    templateId,
    filterMaleGuMdmTemplateOptionsForTemplate(
    templateId,
    filterExtremityMskMdmTemplateOptionsForTemplate(
    templateId,
    filterTraumaMdmTemplateOptionsForTemplate(
    templateId,
    filterDizzinessVertigoMdmTemplateOptionsForTemplate(
      templateId,
      filterChestPainMdmTemplateOptionsForTemplate(
        templateId,
        filterHeadacheMdmTemplateOptionsForTemplate(
          templateId,
          filterRashMdmTemplateOptionsForTemplate(
            templateId,
            filterFemalePelvicGynMdmTemplateOptionsForTemplate(
              templateId,
              filterBackPainMdmTemplateOptionsForTemplate(
                templateId,
                filterAdultFeverMdmTemplateOptionsForTemplate(
                  templateId,
                  filterCoughUriMdmTemplateOptionsForTemplate(
                    templateId,
                    filterShortnessOfBreathMdmTemplateOptionsForTemplate(
                      templateId,
                      filterAbdominalPainMdmTemplateOptionsForTemplate(
                        templateId,
                        filterNauseaVomitingMdmTemplateOptionsForTemplate(
                          templateId,
                          filterDiarrheaMdmTemplateOptionsForTemplate(
                            templateId,
                            filterUrinaryMdmTemplateOptionsForTemplate(templateId, options)
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
    )
    )
    )
    )
    )
    )
    )
    )
  );
}
