import { GOVERNED_ICD10_CLINICIAN_LABELS, type GovernedIcd10DisplayMaps } from "./governedIcd10ClinicianLabels.js";

export type { GovernedIcd10DisplayMaps };

export type GovernedIcd10LabelInspection = {
  frCount: number;
  esCount: number;
  duplicateCodes: string[];
  missingPairCodes: string[];
  emptyLabels: Array<{ locale: "fr" | "es"; code: string }>;
  invalidLocale: string[];
};

function nonEmptyKeys(map: Readonly<Record<string, string>>): string[] {
  return Object.keys(map);
}

export function inspectGovernedIcd10ClinicianLabels(
  maps: GovernedIcd10DisplayMaps = GOVERNED_ICD10_CLINICIAN_LABELS,
): GovernedIcd10LabelInspection {
  const frKeys = nonEmptyKeys(maps.fr);
  const esKeys = nonEmptyKeys(maps.es);
  const frSet = new Set(frKeys);
  const esSet = new Set(esKeys);
  const missingPairCodes = [
    ...frKeys.filter((key) => !esSet.has(key)).map((key) => `fr:${key}`),
    ...esKeys.filter((key) => !frSet.has(key)).map((key) => `es:${key}`),
  ];
  const emptyLabels: Array<{ locale: "fr" | "es"; code: string }> = [];
  for (const [code, label] of Object.entries(maps.fr)) {
    if (!label.trim()) emptyLabels.push({ locale: "fr", code });
  }
  for (const [code, label] of Object.entries(maps.es)) {
    if (!label.trim()) emptyLabels.push({ locale: "es", code });
  }
  return {
    frCount: frKeys.length,
    esCount: esKeys.length,
    duplicateCodes: [],
    missingPairCodes,
    emptyLabels,
    invalidLocale: [],
  };
}

export function assertGovernedIcd10MapsAligned(
  maps: GovernedIcd10DisplayMaps = GOVERNED_ICD10_CLINICIAN_LABELS,
): void {
  const inspection = inspectGovernedIcd10ClinicianLabels(maps);
  if (inspection.frCount !== inspection.esCount) {
    throw new Error(`Governed FR/ES key count mismatch: FR=${inspection.frCount} ES=${inspection.esCount}`);
  }
  if (inspection.missingPairCodes.length > 0) {
    throw new Error(`Governed FR/ES key mismatch: ${inspection.missingPairCodes.join(", ")}`);
  }
  if (inspection.emptyLabels.length > 0) {
    throw new Error(`Governed empty labels: ${inspection.emptyLabels.map((row) => `${row.locale}:${row.code}`).join(", ")}`);
  }
}
