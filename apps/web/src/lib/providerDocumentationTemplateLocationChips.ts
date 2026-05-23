import type { ProviderDocumentationTemplateId, ProviderDocumentationWorkspaceState } from "./providerDocumentationModel";

export type ProviderDocumentationHpiLocationChip = {
  labelKey: string;
  fragmentKey: string;
};

export type ProviderDocumentationHpiChipGroupLike = {
  titleKey: string;
  field: keyof ProviderDocumentationWorkspaceState;
  chips: ProviderDocumentationHpiLocationChip[];
};

export const HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY = "providerDocumentationWorkspace.chipLocation";

const locationChip = (fragmentKey: string): ProviderDocumentationHpiLocationChip => ({
  labelKey: fragmentKey,
  fragmentKey,
});

const CHEST_PAIN_LOCATION_CHIPS: ProviderDocumentationHpiLocationChip[] = [
  "providerDocumentationTemplateLocation.chestPain.midChest",
  "providerDocumentationTemplateLocation.chestPain.substernalChest",
  "providerDocumentationTemplateLocation.chestPain.leftUpperChest",
  "providerDocumentationTemplateLocation.chestPain.rightUpperChest",
  "providerDocumentationTemplateLocation.chestPain.leftSidedChestPain",
  "providerDocumentationTemplateLocation.chestPain.rightSidedChestPain",
  "providerDocumentationTemplateLocation.chestPain.epigastric",
  "providerDocumentationTemplateLocation.chestPain.chestWall",
  "providerDocumentationTemplateLocation.chestPain.retrosternal",
  "providerDocumentationTemplateLocation.chestPain.radiatingToLeftArm",
  "providerDocumentationTemplateLocation.chestPain.radiatingToJaw",
  "providerDocumentationTemplateLocation.chestPain.radiatingToBack",
].map(locationChip);

const SOB_CONTEXT_CHIPS: ProviderDocumentationHpiLocationChip[] = [
  "providerDocumentationTemplateLocation.sob.atRest",
  "providerDocumentationTemplateLocation.sob.withExertion",
  "providerDocumentationTemplateLocation.sob.lyingFlat",
  "providerDocumentationTemplateLocation.sob.nighttimeSymptoms",
  "providerDocumentationTemplateLocation.sob.associatedChestTightness",
  "providerDocumentationTemplateLocation.sob.associatedWheezing",
].map(locationChip);

const ABDOMINAL_PAIN_LOCATION_CHIPS: ProviderDocumentationHpiLocationChip[] = [
  "providerDocumentationTemplateLocation.abdominal.epigastric",
  "providerDocumentationTemplateLocation.abdominal.periumbilical",
  "providerDocumentationTemplateLocation.abdominal.rightUpperQuadrant",
  "providerDocumentationTemplateLocation.abdominal.leftUpperQuadrant",
  "providerDocumentationTemplateLocation.abdominal.rightLowerQuadrant",
  "providerDocumentationTemplateLocation.abdominal.leftLowerQuadrant",
  "providerDocumentationTemplateLocation.abdominal.suprapubic",
  "providerDocumentationTemplateLocation.abdominal.flank",
  "providerDocumentationTemplateLocation.abdominal.diffuse",
  "providerDocumentationTemplateLocation.abdominal.generalized",
  "providerDocumentationTemplateLocation.abdominal.pelvic",
  "providerDocumentationTemplateLocation.abdominal.radiatingToBack",
].map(locationChip);

export const TEMPLATE_HPI_LOCATION_CHIP_GROUPS: Partial<
  Record<
    ProviderDocumentationTemplateId,
    { titleKey: string; chips: ProviderDocumentationHpiLocationChip[] }
  >
> = {
  chest_pain: {
    titleKey: HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY,
    chips: CHEST_PAIN_LOCATION_CHIPS,
  },
  sob: {
    titleKey: "providerDocumentationWorkspace.chipDyspneaContext",
    chips: SOB_CONTEXT_CHIPS,
  },
  abdominal_pain: {
    titleKey: HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY,
    chips: ABDOMINAL_PAIN_LOCATION_CHIPS,
  },
};

export function resolveHpiChipGroupsForTemplate<T extends ProviderDocumentationHpiChipGroupLike>(
  templateId: ProviderDocumentationTemplateId | null,
  baseGroups: T[]
): T[] {
  const specific = templateId ? TEMPLATE_HPI_LOCATION_CHIP_GROUPS[templateId] : undefined;
  if (!specific) return baseGroups;

  return baseGroups.map((group) =>
    group.titleKey === HPI_GENERIC_LOCATION_CHIP_GROUP_TITLE_KEY
      ? { ...group, titleKey: specific.titleKey, chips: specific.chips }
      : group
  );
}

export function templateUsesComplaintSpecificLocationChips(
  templateId: ProviderDocumentationTemplateId | null
): boolean {
  return Boolean(templateId && TEMPLATE_HPI_LOCATION_CHIP_GROUPS[templateId]);
}
