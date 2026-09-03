import {
  classifierDomainForImagingField,
  IMAGING_CLASSIFIER_FIELD_NAMES,
  type ImagingCatalogLegacy,
  type ImagingClassifierCodeTargets,
  resolveImagingClassifierCodeForField,
} from "./catalog-classifier-backfill-map";
import { isTerminologyReadClassifierEnabled } from "./terminology-flags.util";

export type ClassifierWithLabels = {
  labels: Array<{ locale: string; displayName: string }>;
};

export function resolveClassifierDisplayName(
  classifier: ClassifierWithLabels | null | undefined,
  locale: "fr" | "en"
): string | null {
  if (!classifier?.labels?.length) return null;
  const direct = classifier.labels.find((l) => l.locale === locale)?.displayName?.trim();
  return direct || null;
}

export type { ImagingClassifierCodeTargets };

export function resolveImagingCatalogClassifierCodes(
  catalogCode: string,
  legacy: ImagingCatalogLegacy
): ImagingClassifierCodeTargets {
  const targets = {} as ImagingClassifierCodeTargets;
  for (const fieldName of IMAGING_CLASSIFIER_FIELD_NAMES) {
    targets[fieldName] = resolveImagingClassifierCodeForField(catalogCode, fieldName, legacy);
  }
  return targets;
}

export { classifierDomainForImagingField };

export function buildImagingClassifierMetaLine(
  row: {
    modality: string | null;
    bodyRegion: string | null;
    modalityClassifier?: ClassifierWithLabels | null;
    bodyRegionClassifier?: ClassifierWithLabels | null;
  },
  locale: "fr" | "en"
): string {
  if (!isTerminologyReadClassifierEnabled()) {
    return [row.modality, row.bodyRegion].filter(Boolean).join(" · ");
  }

  const modalityLabel = resolveClassifierDisplayName(row.modalityClassifier, locale);
  const bodyLabel = resolveClassifierDisplayName(row.bodyRegionClassifier, locale);
  const modalityPart = modalityLabel ?? row.modality ?? "";
  const bodyPart = bodyLabel ?? row.bodyRegion ?? "";
  return [modalityPart, bodyPart].filter(Boolean).join(" · ");
}

export function resolveLabCategoryDisplay(
  row: {
    description: string | null;
    labCategoryClassifier?: ClassifierWithLabels | null;
  },
  legacyCategory: string | undefined,
  locale: "fr" | "en"
): string | undefined {
  if (isTerminologyReadClassifierEnabled()) {
    const label = resolveClassifierDisplayName(row.labCategoryClassifier, locale);
    if (label) return label;
  }
  return legacyCategory;
}
