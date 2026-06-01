import type { Wave1ImagingCatalogSeed } from "../data/haiti-imaging-wave1";

const DOMAIN_BY_CLASSIFIER_FIELD = {
  modalityClassifierId: "MODALITY",
  bodyRegionClassifierId: "BODY_REGION",
  contrastTypeClassifierId: "CONTRAST_TYPE",
  viewCountClassifierId: "VIEW_COUNT",
  lateralityClassifierId: "LATERALITY",
  anatomicSubregionClassifierId: "ANATOMIC_SUBREGION",
  protocolClassifierId: "PROTOCOL",
} as const;

export type Wave1ClassifierFkPayload = {
  modalityClassifierId: string;
  bodyRegionClassifierId: string;
  contrastTypeClassifierId: string;
  lateralityClassifierId: string;
  viewCountClassifierId: string | null;
  anatomicSubregionClassifierId: string | null;
  protocolClassifierId: string | null;
};

export type ClassifierIndex = Map<string, string>;

export function classifierIndexKey(domain: string, code: string): string {
  return `${domain}:${code}`;
}

export function resolveClassifierId(
  index: ClassifierIndex,
  domain: string,
  code: string | null | undefined
): string | null {
  if (!code) return null;
  const id = index.get(classifierIndexKey(domain, code));
  if (!id) {
    throw new Error(`[wave1-seed] missing TermClassifier ${domain}/${code}`);
  }
  return id;
}

export function buildWave1ClassifierFkPayload(
  row: Wave1ImagingCatalogSeed,
  index: ClassifierIndex
): Wave1ClassifierFkPayload {
  const c = row.classifiers;
  return {
    modalityClassifierId: resolveClassifierId(index, DOMAIN_BY_CLASSIFIER_FIELD.modalityClassifierId, c.modality)!,
    bodyRegionClassifierId: resolveClassifierId(index, DOMAIN_BY_CLASSIFIER_FIELD.bodyRegionClassifierId, c.bodyRegion)!,
    contrastTypeClassifierId: resolveClassifierId(
      index,
      DOMAIN_BY_CLASSIFIER_FIELD.contrastTypeClassifierId,
      c.contrastType
    )!,
    lateralityClassifierId: resolveClassifierId(index, DOMAIN_BY_CLASSIFIER_FIELD.lateralityClassifierId, c.laterality)!,
    viewCountClassifierId: resolveClassifierId(index, DOMAIN_BY_CLASSIFIER_FIELD.viewCountClassifierId, c.viewCount),
    anatomicSubregionClassifierId: resolveClassifierId(
      index,
      DOMAIN_BY_CLASSIFIER_FIELD.anatomicSubregionClassifierId,
      c.anatomicSubregion
    ),
    protocolClassifierId: resolveClassifierId(index, DOMAIN_BY_CLASSIFIER_FIELD.protocolClassifierId, c.protocol),
  };
}

export function assertWave1ClassifierFkComplete(payload: Wave1ClassifierFkPayload, code: string): void {
  const required: (keyof Wave1ClassifierFkPayload)[] = [
    "modalityClassifierId",
    "bodyRegionClassifierId",
    "contrastTypeClassifierId",
    "lateralityClassifierId",
  ];
  for (const key of required) {
    if (!payload[key]) {
      throw new Error(`[wave1-seed] incomplete classifier FK ${key} on ${code}`);
    }
  }
}
