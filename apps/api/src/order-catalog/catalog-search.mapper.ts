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
  searchTextTruncated?: string | undefined,
  opts?: {
    matchedBrandAlias?: string | null;
    commonAliases?: string[];
  }
): CatalogSearchItemDto {
  const genericName = m.genericName?.trim() || "";
  const matchedBrandRaw = opts?.matchedBrandAlias?.trim() || "";
  const matchedBrand = matchedBrandRaw
    ? matchedBrandRaw.replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    : "";
  const aliasSet = [...(opts?.commonAliases ?? [])];
  if (matchedBrand && !aliasSet.some((a) => a.toLowerCase() === matchedBrand.toLowerCase())) {
    aliasSet.unshift(matchedBrand);
  }

  const displayNameFr = (m.displayNameFr ?? "").trim();
  const displayNameEn = m.displayNameEn?.trim() || null;
  const localizedSecondary = buildMedicationCatalogSecondaryTexts({
    strength: m.strength,
    dosageForm: m.dosageForm,
    route: m.route,
    therapeuticClass: m.therapeuticClass,
  });
  const secondaryTextFr = localizedSecondary.secondaryTextFr || undefined;
  const secondaryTextEn = localizedSecondary.secondaryTextEn || undefined;
  const secondaryText = secondaryTextFr || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "MEDICATION",
    displayNameFr,
    displayNameEn,
    name: m.name?.trim() || undefined,
    secondaryText,
    secondaryTextFr,
    secondaryTextEn,
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
      genericName: genericName || undefined,
      therapeuticClass: m.therapeuticClass?.trim() || undefined,
      administrationType: m.administrationType?.trim() || undefined,
      billingClass: m.billingClass?.trim() || undefined,
      commonAliases: aliasSet.length ? aliasSet : undefined,
    },
  };
}

export function mapLabRowToCatalogSearchItem(
  m: LabRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const namePrimary = m.name.trim();
  const displayNameFr = (m.displayNameFr ?? "").trim();
  let legacyCategory: string | undefined;
  if (m.description?.startsWith("Catégorie : ")) {
    legacyCategory = m.description.slice("Catégorie : ".length).trim() || undefined;
  }
  const categoryFr = resolveLabCategoryDisplay(m, legacyCategory, "fr");
  const categoryEn = resolveLabCategoryDisplay(m, legacyCategory, "en");
  const secondaryTextFr = [m.code, categoryFr].filter(Boolean).join(" · ") || undefined;
  const secondaryTextEn = [m.code, categoryEn].filter(Boolean).join(" · ") || undefined;
  const billing = m.billingCodeDefault?.trim() || undefined;
  const meta: { category?: string; billingCodeDefault?: string } = {
    ...(legacyCategory ? { category: legacyCategory } : {}),
    ...(billing ? { billingCodeDefault: billing } : {}),
  };

  return {
    id: m.id,
    code: m.code,
    type: "LAB_TEST",
    displayNameFr,
    displayNameEn: m.displayNameEn?.trim() || null,
    name: namePrimary,
    secondaryText: secondaryTextFr,
    secondaryTextFr,
    secondaryTextEn,
    searchText: searchTextTruncated,
    metadata: Object.keys(meta).length ? meta : undefined,
  };
}

export function mapImagingRowToCatalogSearchItem(
  m: ImagingRow,
  searchTextTruncated?: string | undefined
): CatalogSearchItemDto {
  const displayNameFr = (m.displayNameFr ?? "").trim();
  const metaLineFr = buildImagingClassifierMetaLine(m, "fr");
  const metaLineEn = buildImagingClassifierMetaLine(m, "en");
  const secondaryTextFr = [m.code, metaLineFr].filter(Boolean).join(" · ") || undefined;
  const secondaryTextEn = [m.code, metaLineEn].filter(Boolean).join(" · ") || undefined;

  return {
    id: m.id,
    code: m.code,
    type: "IMAGING_STUDY",
    displayNameFr,
    displayNameEn: m.displayNameEn?.trim() || null,
    name: m.name.trim() || undefined,
    secondaryText: secondaryTextFr,
    secondaryTextFr,
    secondaryTextEn,
    searchText: searchTextTruncated,
    metadata: {
      modality: m.modality ?? undefined,
      bodyRegion: m.bodyRegion ?? undefined,
    },
  };
}
