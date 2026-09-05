/**
 * Live ICD presentation adapter for list/chart-summary.
 *
 * Responsibility: attach/strip presentation fields on already-loaded Diagnosis rows.
 * Terminology winner selection is delegated to Icd10TerminologyService.resolveDisplaysForCatalogRows
 * (P2 resolveIcd10DiagnosisDisplay). This adapter only maps resolver output onto list/chart DTOs.
 *
 * Does not mutate Diagnosis.description / code / icd10CatalogId.
 */

import {
  formatIcd10CmDisplayCode,
  mapIcd10ExactnessToDisplayResolution,
  type Icd10DiagnosisDisplayResult,
  type Icd10SelectableDisplayResolution,
  type ProductUiLanguage,
} from "@medora/shared";
import type { Icd10CatalogTerminologySource, Icd10TerminologyService } from "./icd10-terminology.service";

export type Icd10PresentationCatalogSlice = Icd10CatalogTerminologySource;

export type Icd10PresentedFields = {
  displayLabel: string;
  displayResolution: Icd10SelectableDisplayResolution;
  codeSystem: string | null;
  releaseVersion: string | null;
};

export const ICD10_PRESENTATION_CATALOG_SELECT = {
  id: true,
  code: true,
  codeSystem: true,
  releaseVersion: true,
  shortDescription: true,
  longDescription: true,
} as const;

export function uniqueIcd10PresentationCatalogRows(
  rows: readonly (Icd10PresentationCatalogSlice | null | undefined)[],
): Icd10PresentationCatalogSlice[] {
  const unique: Icd10PresentationCatalogSlice[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}

export async function resolveIcd10PresentationByCatalogId(
  terminology: Icd10TerminologyService,
  locale: ProductUiLanguage | null,
  catalogRows: readonly Icd10PresentationCatalogSlice[],
): Promise<Map<string, Icd10DiagnosisDisplayResult>> {
  const unique = uniqueIcd10PresentationCatalogRows(catalogRows);
  if (!locale || unique.length === 0) {
    return new Map();
  }
  return terminology.resolveDisplaysForCatalogRows({ locale, catalogRows: unique });
}

export function applyIcd10DiagnosisPresentation<
  T extends {
    code: string;
    description: string | null;
    icd10Catalog: Icd10PresentationCatalogSlice | null;
  },
>(
  locale: ProductUiLanguage | null,
  row: T,
  displays: Map<string, Icd10DiagnosisDisplayResult>,
): T & Icd10PresentedFields {
  const catalog = row.icd10Catalog;
  if (catalog) {
    const display = displays.get(catalog.id);
    return {
      ...row,
      displayLabel: display?.displayName ?? (formatIcd10CmDisplayCode(row.code) || row.code),
      displayResolution: display
        ? mapIcd10ExactnessToDisplayResolution(display.exactness)
        : "UNLOCALIZED_CODE",
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
    };
  }
  if (locale === "en" && row.description?.trim()) {
    return {
      ...row,
      displayLabel: row.description.trim(),
      displayResolution: "EXACT_SOURCE_LABEL",
      codeSystem: null,
      releaseVersion: null,
    };
  }
  const code = formatIcd10CmDisplayCode(row.code) || row.code;
  return {
    ...row,
    displayLabel: code,
    displayResolution: "UNLOCALIZED_CODE",
    codeSystem: null,
    releaseVersion: null,
  };
}

export async function attachIcd10DiagnosisPresentation<
  T extends {
    code: string;
    description: string | null;
    icd10Catalog: Icd10PresentationCatalogSlice | null;
  },
>(
  terminology: Icd10TerminologyService,
  locale: ProductUiLanguage | null,
  rows: T[],
): Promise<Array<T & Icd10PresentedFields>> {
  if (rows.length === 0) return [];
  const catalogRows = uniqueIcd10PresentationCatalogRows(rows.map((row) => row.icd10Catalog));
  const displays = await resolveIcd10PresentationByCatalogId(terminology, locale, catalogRows);
  return rows.map((row) => applyIcd10DiagnosisPresentation(locale, row, displays));
}

export function stripIcd10CatalogFromPresentedRow<T extends { icd10Catalog?: unknown }>(
  row: T,
): Omit<T, "icd10Catalog"> {
  const { icd10Catalog: _catalog, ...rest } = row;
  void _catalog;
  return rest;
}
