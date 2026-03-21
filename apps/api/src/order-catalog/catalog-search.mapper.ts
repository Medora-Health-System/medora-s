import type { CatalogSearchItemDto } from "./dto/catalog-search-item.dto";
import type { CatalogMedication } from "@prisma/client";

type LabRow = {
  id: string;
  code: string;
  name: string;
  displayNameFr: string | null;
  description: string | null;
  searchText: string | null;
};

type ImagingRow = {
  id: string;
  code: string;
  name: string;
  displayNameFr: string | null;
  modality: string | null;
  bodyRegion: string | null;
  searchText: string | null;
};

export function mapMedicationToCatalogSearchItem(
  m: CatalogMedication & { isFavorite?: boolean },
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? m.name ?? "").trim() || m.name;
  const secondaryParts = [m.strength, m.dosageForm].filter(Boolean) as string[];
  const secondaryText =
    secondaryParts.length > 0
      ? secondaryParts.join(" · ")
      : m.genericName?.trim() || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "MEDICATION",
    displayNameFr,
    secondaryText,
    searchText: searchTextTruncated,
    isFavorite: m.isFavorite,
    isEssential: m.isEssential,
    metadata: {
      strength: m.strength ?? undefined,
      dosageForm: m.dosageForm ?? undefined,
      route: m.route ?? undefined,
    },
  };
}

export function mapLabRowToCatalogSearchItem(
  m: LabRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? m.name).trim();
  let category: string | undefined;
  if (m.description?.startsWith("Catégorie : ")) {
    category = m.description.slice("Catégorie : ".length).trim() || undefined;
  }
  const secondaryText = [m.code, category].filter(Boolean).join(" · ") || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "LAB_TEST",
    displayNameFr,
    secondaryText,
    searchText: searchTextTruncated,
    metadata: category ? { category } : undefined,
  };
}

export function mapImagingRowToCatalogSearchItem(
  m: ImagingRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? m.name).trim();
  const metaLine = [m.modality, m.bodyRegion].filter(Boolean).join(" · ");
  const secondaryText = [m.code, metaLine].filter(Boolean).join(" · ") || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "IMAGING_STUDY",
    displayNameFr,
    secondaryText,
    searchText: searchTextTruncated,
    metadata: {
      modality: m.modality ?? undefined,
      bodyRegion: m.bodyRegion ?? undefined,
    },
  };
}
