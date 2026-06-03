import { buildMedicationCatalogSecondaryTexts } from "@medora/shared";
import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import type { CatalogMedication } from "@prisma/client";
import {
  buildImagingClassifierMetaLine,
  resolveLabCategoryDisplay,
  type ClassifierWithLabels,
} from "../terminology/resolve-classifier-catalog-meta.util";

type LabRow = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  description: string | null;
  searchText: string | null;
  billingCodeDefault: string | null;
  labCategoryClassifier?: ClassifierWithLabels | null;
};

type ImagingRow = {
  id: string;
  code: string;
  name: string;
  displayNameEn: string | null;
  displayNameFr: string | null;
  modality: string | null;
  bodyRegion: string | null;
  searchText: string | null;
  modalityClassifier?: ClassifierWithLabels | null;
  bodyRegionClassifier?: ClassifierWithLabels | null;
};

export function mapMedicationToCatalogSearchItem(
  m: CatalogMedication & { isFavorite?: boolean },
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? m.name ?? "").trim() || m.name;
  const localizedSecondary = buildMedicationCatalogSecondaryTexts({
    strength: m.strength,
    dosageForm: m.dosageForm,
    route: m.route,
    therapeuticClass: m.therapeuticClass,
  });
  const secondaryText =
    localizedSecondary.secondaryTextFr ||
    localizedSecondary.secondaryTextEn ||
    m.genericName?.trim() ||
    undefined;

  return {
    id: m.id,
    code: m.code,
    type: "MEDICATION",
    displayNameFr,
    displayNameEn: m.displayNameEn?.trim() || null,
    name: m.name?.trim() || undefined,
    secondaryText,
    secondaryTextFr: localizedSecondary.secondaryTextFr || undefined,
    secondaryTextEn: localizedSecondary.secondaryTextEn || undefined,
    searchText: searchTextTruncated,
    isFavorite: m.isFavorite,
    isEssential: m.isEssential,
    metadata: {
      strength: m.strength ?? undefined,
      dosageForm: m.dosageForm ?? undefined,
      route: m.route ?? undefined,
      ndc11: m.ndc11 ?? undefined,
      billingUnitType: m.billingUnitType ?? undefined,
      isControlled: m.isControlled || undefined,
      controlledSchedule: m.controlledSchedule ?? undefined,
      requiresWitness: m.requiresWitness || undefined,
      requiresDoubleSign: m.requiresDoubleSign || undefined,
      genericName: m.genericName?.trim() || undefined,
      therapeuticClass: m.therapeuticClass?.trim() || undefined,
      administrationType: m.administrationType?.trim() || undefined,
      billingClass: m.billingClass?.trim() || undefined,
    },
  };
}

export function mapLabRowToCatalogSearchItem(
  m: LabRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const namePrimary = m.name.trim();
  const displayNameFr = (m.displayNameFr ?? m.name).trim();
  let category: string | undefined;
  if (m.description?.startsWith("Catégorie : ")) {
    category = m.description.slice("Catégorie : ".length).trim() || undefined;
  }
  category = resolveLabCategoryDisplay(m, category, "fr");
  const secondaryText = [m.code, category].filter(Boolean).join(" · ") || undefined;
  const billing = m.billingCodeDefault?.trim() || undefined;
  const meta: { category?: string; billingCodeDefault?: string } = {
    ...(category ? { category } : {}),
    ...(billing ? { billingCodeDefault: billing } : {}),
  };

  return {
    id: m.id,
    code: m.code,
    type: "LAB_TEST",
    displayNameFr,
    displayNameEn: m.displayNameEn?.trim() || null,
    name: namePrimary,
    secondaryText,
    searchText: searchTextTruncated,
    metadata: Object.keys(meta).length ? meta : undefined,
  };
}

export function mapImagingRowToCatalogSearchItem(
  m: ImagingRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? m.name).trim();
  const metaLine = buildImagingClassifierMetaLine(m, "fr");
  const secondaryText = [m.code, metaLine].filter(Boolean).join(" · ") || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "IMAGING_STUDY",
    displayNameFr,
    displayNameEn: m.displayNameEn?.trim() || null,
    name: m.name.trim() || undefined,
    secondaryText,
    searchText: searchTextTruncated,
    metadata: {
      modality: m.modality ?? undefined,
      bodyRegion: m.bodyRegion ?? undefined,
    },
  };
}
