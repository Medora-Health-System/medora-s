import { z } from "zod";

/** CatalogMedication.dataClassification — metadata only; does not delete rows. */
export const DATA_CLASSIFICATION_VALUES = ["PRODUCTION", "FIXTURE", "DEV_SAMPLE", "UNKNOWN"] as const;

export type MedicationDataClassification = (typeof DATA_CLASSIFICATION_VALUES)[number];

export const medicationDataClassificationSchema = z.enum(DATA_CLASSIFICATION_VALUES);

/** Patterns shared with Phase 1 medication audit tooling. */
export const FIXTURE_LIKE_CODE_PATTERNS = [
  "GENERIC_MST_",
  "ROUTE_IM_MST_",
  "_MST_",
  "DEV-SAMPLE",
  "DEV_SAMPLE",
  "MEDORA-DEV-SAMPLE",
] as const;

export function isFixtureLikeMedicationCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return false;
  const upper = code.trim().toUpperCase();
  return FIXTURE_LIKE_CODE_PATTERNS.some((pattern) => upper.includes(pattern.toUpperCase()));
}

function isDevSampleMedicationCode(code: string): boolean {
  const upper = code.toUpperCase();
  return (
    upper.includes("DEV-SAMPLE") ||
    upper.includes("DEV_SAMPLE") ||
    upper.includes("MEDORA-DEV-SAMPLE")
  );
}

/**
 * Heuristic classification from catalog code alone.
 * Does not mutate data; used for audit/backfill and optional search filtering.
 */
export function classifyMedicationCode(code: string | null | undefined): MedicationDataClassification {
  const trimmed = code?.trim();
  if (!trimmed) return "UNKNOWN";
  if (isDevSampleMedicationCode(trimmed)) return "DEV_SAMPLE";
  if (isFixtureLikeMedicationCode(trimmed)) return "FIXTURE";
  return "PRODUCTION";
}

export function isNonProductionDataClassification(
  classification: string | null | undefined
): boolean {
  const normalized = classification?.trim().toUpperCase();
  return normalized === "FIXTURE" || normalized === "DEV_SAMPLE";
}

export function parseMedicationDataClassification(
  raw: string | null | undefined
): MedicationDataClassification | null {
  if (raw == null || typeof raw !== "string") return null;
  const result = medicationDataClassificationSchema.safeParse(raw.trim().toUpperCase());
  return result.success ? result.data : null;
}
