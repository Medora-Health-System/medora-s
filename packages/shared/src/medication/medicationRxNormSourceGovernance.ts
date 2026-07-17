import { z } from "zod";
import { isSyntheticRxCui } from "./medicationRxNormVerification.js";

export const RXNORM_SOURCE_CLASSIFICATION_VALUES = [
  "NLM_OFFICIAL",
  "APPROVED_NLM_EXTRACT",
  "SYNTHETIC_FIXTURE",
  "DEV_SAMPLE",
  "UNKNOWN",
] as const;

export type RxNormSourceClassification = (typeof RXNORM_SOURCE_CLASSIFICATION_VALUES)[number];

export const RXNORM_RELEASE_SCOPE_VALUES = [
  "LIMITED_APPROVED_EXTRACT",
  "DEVELOPMENT_SUBSET",
  "TERM_TYPE_SCOPED_IMPORT",
  "RXCUI_ALLOWLIST",
  "FULL_RELEASE",
] as const;

export type RxNormReleaseScope = (typeof RXNORM_RELEASE_SCOPE_VALUES)[number];

export const REAL_IMPORT_MODE_VALUES = [
  "VALIDATE_MANIFEST",
  "VALIDATE_SOURCE",
  "STAGE_REAL_REFERENCE",
  "GENERATE_REAL_CANDIDATES",
  "REPORT_RELEASE",
  "ROLLBACK_REAL_RELEASE",
] as const;

export type RxNormRealImportMode = (typeof REAL_IMPORT_MODE_VALUES)[number];

export const RXNORM_NORMALIZATION_VERSION = "RXNORM_NORMALIZATION_V1";
export const RXNORM_PARSING_VERSION = "RXNCONSO_PARSER_V1";
export const RXNORM_RELEASE_MANIFEST_VERSION = "RXNORM_RELEASE_MANIFEST_V1";

export const rxNormFileManifestEntrySchema = z.object({
  fileName: z.string().min(1),
  fileRole: z.enum(["RXNCONSO", "RXNSAT", "RXNREL", "OTHER"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "sha256 must be 64 hex characters"),
  byteSize: z.number().int().nonnegative().optional(),
  rowCountHint: z.number().int().nonnegative().optional(),
});

export type RxNormFileManifestEntry = z.infer<typeof rxNormFileManifestEntrySchema>;

export const rxNormReleaseManifestSchema = z.object({
  manifestVersion: z.literal(RXNORM_RELEASE_MANIFEST_VERSION),
  sourceClassification: z.enum(RXNORM_SOURCE_CLASSIFICATION_VALUES),
  releaseScope: z.enum(RXNORM_RELEASE_SCOPE_VALUES),
  releaseVersionOfficial: z.string().min(1).max(64),
  licenseAcknowledged: z.boolean(),
  importPurpose: z.string().min(1).max(64),
  sourceUrlOrDescription: z.string().optional(),
  retrievedAt: z.string().datetime().optional(),
  authorizedOperator: z.string().max(128).optional(),
  termTypes: z.array(z.string().min(1)).default([]),
  rxcuiAllowlist: z.array(z.string().min(1)).default([]),
  files: z.array(rxNormFileManifestEntrySchema).min(1),
  notes: z.string().optional(),
});

export type RxNormReleaseManifest = z.infer<typeof rxNormReleaseManifestSchema>;

const REAL_SOURCE_CLASSIFICATIONS = new Set<RxNormSourceClassification>([
  "NLM_OFFICIAL",
  "APPROVED_NLM_EXTRACT",
]);

const NON_REAL_SOURCE_CLASSIFICATIONS = new Set<RxNormSourceClassification>([
  "SYNTHETIC_FIXTURE",
  "DEV_SAMPLE",
]);

export function isRealSourceClassification(
  sourceClassification: string | null | undefined
): boolean {
  const normalized = sourceClassification?.trim().toUpperCase() as RxNormSourceClassification;
  return REAL_SOURCE_CLASSIFICATIONS.has(normalized);
}

export function requiresFullReleaseConfirm(scope: string | null | undefined): boolean {
  return scope?.trim().toUpperCase() === "FULL_RELEASE";
}

export function resolveIsSyntheticFromClassification(
  sourceClassification: RxNormSourceClassification
): boolean {
  if (REAL_SOURCE_CLASSIFICATIONS.has(sourceClassification)) return false;
  if (NON_REAL_SOURCE_CLASSIFICATIONS.has(sourceClassification)) return true;
  return true;
}

export function validateRxNormReleaseManifest(manifest: unknown): string[] {
  const errors: string[] = [];
  const parsed = rxNormReleaseManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".") || "manifest"}: ${issue.message}`);
    }
    return errors;
  }

  const data = parsed.data;

  if (!data.licenseAcknowledged) {
    errors.push("licenseAcknowledged must be true before real reference import.");
  }

  const rxnconsoFiles = data.files.filter((file) => file.fileRole === "RXNCONSO");
  if (rxnconsoFiles.length !== 1) {
    errors.push("manifest must declare exactly one RXNCONSO file.");
  }

  if (data.sourceClassification === "DEV_SAMPLE" && data.releaseScope === "FULL_RELEASE") {
    errors.push("DEV_SAMPLE sourceClassification cannot use FULL_RELEASE scope.");
  }

  if (data.sourceClassification === "SYNTHETIC_FIXTURE" && isRealSourceClassification(data.sourceClassification)) {
    errors.push("SYNTHETIC_FIXTURE cannot be classified as a real NLM source.");
  }

  if (
    data.releaseScope === "TERM_TYPE_SCOPED_IMPORT" &&
    data.termTypes.length === 0
  ) {
    errors.push("TERM_TYPE_SCOPED_IMPORT requires non-empty termTypes.");
  }

  if (
    data.releaseScope === "RXCUI_ALLOWLIST" &&
    data.rxcuiAllowlist.length === 0
  ) {
    errors.push("RXCUI_ALLOWLIST scope requires non-empty rxcuiAllowlist.");
  }

  return errors;
}

export function assertRealSyntheticBoundary(input: {
  sourceClassification: string;
  isSynthetic: boolean;
  rxcui?: string;
}): void {
  const classification = input.sourceClassification.trim().toUpperCase() as RxNormSourceClassification;
  const rxcui = input.rxcui?.trim() ?? "";

  if (classification === "DEV_SAMPLE" && input.isSynthetic === false && isSyntheticRxCui(rxcui)) {
    throw new Error(
      "RealSyntheticBoundaryViolation: DEV_SAMPLE structural rows must not use SYNTH-prefixed RxCUIs."
    );
  }

  if (isRealSourceClassification(classification) && input.isSynthetic) {
    throw new Error(
      `RealSyntheticBoundaryViolation: ${classification} releases must have isSynthetic=false.`
    );
  }

  if (
    NON_REAL_SOURCE_CLASSIFICATIONS.has(classification) &&
    !input.isSynthetic &&
    classification !== "UNKNOWN"
  ) {
    throw new Error(
      `RealSyntheticBoundaryViolation: ${classification} releases must have isSynthetic=true.`
    );
  }

  if (isRealSourceClassification(classification) && rxcui && isSyntheticRxCui(rxcui)) {
    throw new Error(
      "RealSyntheticBoundaryViolation: real source classifications cannot include SYNTH-prefixed RxCUIs."
    );
  }

  if (classification === "DEV_SAMPLE" && rxcui && isSyntheticRxCui(rxcui)) {
    throw new Error(
      "RealSyntheticBoundaryViolation: DEV_SAMPLE rows cannot use SYNTH-prefixed RxCUIs."
    );
  }
}

export function stagingDataClassificationForSource(
  sourceClassification: RxNormSourceClassification
): "REFERENCE" | "DEV_SAMPLE" | "FIXTURE" {
  if (isRealSourceClassification(sourceClassification)) return "REFERENCE";
  if (sourceClassification === "DEV_SAMPLE") return "DEV_SAMPLE";
  return "FIXTURE";
}

export function buildRealReleaseIdentifier(input: {
  releaseVersionOfficial: string;
  releaseScope: string;
  manifestHashSha256: string;
}): string {
  const version = input.releaseVersionOfficial.trim().replace(/\s+/g, "-");
  const scope = input.releaseScope.trim().toUpperCase();
  const hashPrefix = input.manifestHashSha256.slice(0, 12).toLowerCase();
  return `REAL-${version}-${scope}-${hashPrefix}`;
}
