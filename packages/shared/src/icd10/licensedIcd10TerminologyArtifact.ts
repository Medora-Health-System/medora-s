/**
 * MEDUI.TRILANG.DX.P3-F — vendor-neutral licensed terminology artifact contract.
 *
 * Consumes operator-provided CSV or JSONL. Does not generate, translate, or
 * substitute WHO CIM / CIE / other national modifications as ICD-10-CM wording.
 * Does not insert search aliases as clinician preferred labels.
 *
 * Licensed source files are never committed. Pass a local --file path.
 */

import { formatIcd10CmDisplayCode } from "./formatIcd10CmDisplayCode.js";
import { normalizeIcd10CodeForLookup } from "../icd10Normalize.js";
import type { Icd10CatalogIdentity } from "./buildGovernedIcd10TerminologySeed.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_SOURCE_PRIORITY,
  type Icd10TerminologyExactness,
  type Icd10TerminologyProvenance,
  type Icd10TerminologyStatus,
} from "./icd10TerminologyTypes.js";

export const ICD10_LICENSED_ARTIFACT_LOCALES = ["fr", "es"] as const;
export type Icd10LicensedArtifactLocale = (typeof ICD10_LICENSED_ARTIFACT_LOCALES)[number];

/** Bounded apply chunk. Small enough for Postgres parameter limits; large enough to avoid ~149k round trips. */
export const ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE = 500;

export function chunkLicensedImportRows<T>(
  rows: readonly T[],
  chunkSize = ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE,
): T[][] {
  const size = Math.max(1, Math.floor(Number(chunkSize)) || ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE);
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size) as T[]);
  return out;
}

export type Icd10LicensedArtifactRecord = {
  code: string;
  locale: string;
  label: string;
  sourceId: string;
  terminologyVersion: string;
  provenance: string;
  sourcePriority?: number;
  status?: string;
  labelRegister?: string;
  exactness?: string;
  codeSystem?: string;
  releaseVersion?: string;
};

export type Icd10LicensedTerminologyRow = {
  icd10CatalogId: string;
  codeSystem: string;
  releaseVersion: string;
  code: string;
  normalizedCode: string;
  locale: Icd10LicensedArtifactLocale;
  preferredLabel: string;
  labelRegister: "CLINICIAN_PREFERRED";
  provenance: Icd10TerminologyProvenance;
  exactness: Icd10TerminologyExactness;
  sourceId: string;
  terminologyVersion: string;
  sourcePriority: number;
  status: Icd10TerminologyStatus;
};

export type Icd10LicensedRejectReason =
  | "REJECTED_UNKNOWN_CODE"
  | "REJECTED_WRONG_RELEASE"
  | "REJECTED_NONSELECTABLE"
  | "REJECTED_EMPTY"
  | "REJECTED_UNSUPPORTED_LOCALE"
  | "REJECTED_CONSUMER_REGISTER"
  | "DUPLICATE_SOURCE_IDENTITY"
  | "REJECT_SAME_VERSION_MUTATION"
  | "REJECTED_INVALID_PROVENANCE"
  | "REJECTED_INVALID_STATUS"
  | "REJECTED_INCONSISTENT_SOURCE"
  | "IDENTITY_MISMATCH";

export type Icd10LicensedRejectedRow = {
  code: string;
  locale: string;
  label: string;
  reason: Icd10LicensedRejectReason;
};

export type Icd10LicensedExistingRow = {
  code: string;
  locale: string;
  labelRegister: string;
  provenance: string;
  sourceId: string;
  terminologyVersion: string;
  preferredLabel: string;
  exactness: string;
  sourcePriority: number;
  status: string;
};

export type Icd10LicensedImportStatus = "DRY_RUN" | "COMPLETE" | "PARTIAL" | "NOT_APPLIED";
export type Icd10LicensedImportFailedPhase = "INSERT" | "UPDATE" | "SUPERSEDE" | "RECOMPUTE" | null;

export type Icd10LicensedImportReport = {
  TOTAL_INPUT: number;
  VALID_EXACT: number;
  REJECTED_UNKNOWN_CODE: number;
  REJECTED_NONSELECTABLE: number;
  REJECTED_WRONG_RELEASE: number;
  REJECTED_EMPTY: number;
  DUPLICATE_SOURCE_IDENTITY: number;
  REJECTED_INCONSISTENT_SOURCE: number;
  INSERTED: number;
  UPDATED: number;
  UNCHANGED: number;
  SUPERSEDED: number;
  EFFECTIVE_AFTER: number | null;
  COVERAGE_AFTER: string | null;
  ARTIFACT_SHA256: string | null;
  /** Basename only. Never an absolute operator path. */
  ARTIFACT_FILE: string | null;
  ARTIFACT_FILE_NAME: string | null;
  SOURCE_ID: string | null;
  TERMINOLOGY_VERSION: string | null;
  TARGET_RELEASE: string | null;
  LOCALE_SET: string | null;
  LOCALES: string | null;
  INPUT_ROW_COUNT: number;
  CHUNK_SIZE: number | null;
  CHUNK_COUNT: number | null;
  WRITE_ROUND_TRIPS: number | null;
  RECOMPUTE_CALL_COUNT: number | null;
  RECOMPUTE_BATCH_SIZE: number | null;
  RECOMPUTE_BATCH_COUNT: number | null;
  RECOMPUTE_SELECT_OPERATIONS: number | null;
  RECOMPUTE_CLEAR_OPERATIONS: number | null;
  RECOMPUTE_SET_OPERATIONS: number | null;
  IMPORT_STATUS: Icd10LicensedImportStatus | null;
  FAILED_CHUNK: number | null;
  FAILED_PHASE: Icd10LicensedImportFailedPhase;
};

export type Icd10LicensedImportPlan = {
  acceptedInserts: Icd10LicensedTerminologyRow[];
  acceptedUpdates: Icd10LicensedTerminologyRow[];
  unchanged: Icd10LicensedTerminologyRow[];
  supersede: Array<{
    code: string;
    locale: Icd10LicensedArtifactLocale;
    provenance: Icd10TerminologyProvenance;
    sourceId: string;
    labelRegister: "CLINICIAN_PREFERRED";
    keepTerminologyVersion: string;
  }>;
  rejected: Icd10LicensedRejectedRow[];
  report: Icd10LicensedImportReport;
};

export type Icd10LicensedArtifactConsistency = {
  sourceIds: string[];
  terminologyVersions: string[];
  locales: string[];
  codeSystems: string[];
  releaseVersions: string[];
  consistent: boolean;
};

/** Basename only — never persist operator absolute paths on terminology rows. */
export function licensedArtifactFileName(filePath: string | null | undefined): string {
  const trimmed = (filePath ?? "").trim();
  if (!trimmed || trimmed === "(inline)") return "(inline)";
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] || "(inline)";
}

export function inspectLicensedArtifactConsistency(
  records: readonly Icd10LicensedArtifactRecord[],
): Icd10LicensedArtifactConsistency {
  const sourceIds = [...new Set(records.map((row) => row.sourceId.trim()).filter(Boolean))];
  const terminologyVersions = [...new Set(records.map((row) => row.terminologyVersion.trim()).filter(Boolean))];
  const locales = [...new Set(records.map((row) => row.locale.trim().toLowerCase()).filter(Boolean))];
  const codeSystems = [...new Set(records.map((row) => (row.codeSystem ?? "").trim()).filter(Boolean))];
  const releaseVersions = [...new Set(records.map((row) => (row.releaseVersion ?? "").trim()).filter(Boolean))];
  return {
    sourceIds,
    terminologyVersions,
    locales,
    codeSystems,
    releaseVersions,
    consistent: sourceIds.length <= 1 && terminologyVersions.length <= 1,
  };
}

const PROVENANCES: readonly Icd10TerminologyProvenance[] = ["OFFICIAL_SOURCE", "LICENSED_VENDOR", "MEDORA_GOVERNED"];
const STATUSES: readonly Icd10TerminologyStatus[] = ["APPROVED", "PENDING_REVIEW", "REJECTED", "SUPERSEDED"];

function isLocale(value: string): value is Icd10LicensedArtifactLocale {
  return value === "fr" || value === "es";
}

function isProvenance(value: string): value is Icd10TerminologyProvenance {
  return (PROVENANCES as readonly string[]).includes(value);
}

function isStatus(value: string): value is Icd10TerminologyStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export function licensedSourceIdentityKey(row: {
  code: string;
  locale: string;
  labelRegister: string;
  provenance: string;
  sourceId: string;
  terminologyVersion: string;
}): string {
  return `${row.code}|${row.locale}|${row.labelRegister}|${row.provenance}|${row.sourceId}|${row.terminologyVersion}`;
}

function isSelectableCatalogRow(catalog: Icd10CatalogIdentity): boolean {
  if (catalog.isSelectable === false) return false;
  if (catalog.isBillable === false) return false;
  return true;
}

function defaultExactness(provenance: Icd10TerminologyProvenance): Icd10TerminologyExactness {
  return provenance === "MEDORA_GOVERNED" ? "EXACT_GOVERNED" : "EXACT_SOURCE";
}

function defaultPriority(provenance: Icd10TerminologyProvenance): number {
  if (provenance === "MEDORA_GOVERNED") return ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED;
  if (provenance === "OFFICIAL_SOURCE") return ICD10_SOURCE_PRIORITY.OFFICIAL_SOURCE;
  return ICD10_SOURCE_PRIORITY.LICENSED_VENDOR;
}

/** RFC4180-ish CSV field split (quoted commas). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((cell) => cell.trim());
}

export function parseLicensedTerminologyCsv(text: string): Icd10LicensedArtifactRecord[] {
  const lines = text.split(/\r?\n/);
  let header: string[] | null = null;
  const rows: Icd10LicensedArtifactRecord[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cells = splitCsvLine(line);
    if (!header) {
      header = cells.map((h) => h.trim());
      continue;
    }
    const rec: Record<string, string> = {};
    header.forEach((key, i) => {
      rec[key] = cells[i] ?? "";
    });
    rows.push({
      code: rec.code ?? "",
      locale: rec.locale ?? "",
      label: rec.label ?? rec.preferredLabel ?? "",
      sourceId: rec.sourceId ?? "",
      terminologyVersion: rec.terminologyVersion ?? "",
      provenance: rec.provenance ?? "",
      sourcePriority: rec.sourcePriority ? Number(rec.sourcePriority) : undefined,
      status: rec.status || undefined,
      labelRegister: rec.labelRegister || undefined,
      exactness: rec.exactness || undefined,
      codeSystem: rec.codeSystem || undefined,
      releaseVersion: rec.releaseVersion || undefined,
    });
  }
  return rows;
}

export function parseLicensedTerminologyJsonl(text: string): Icd10LicensedArtifactRecord[] {
  const rows: Icd10LicensedArtifactRecord[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parsed = JSON.parse(line) as Record<string, unknown>;
    if (parsed._meta === true) continue;
    rows.push({
      code: String(parsed.code ?? ""),
      locale: String(parsed.locale ?? ""),
      label: String(parsed.label ?? parsed.preferredLabel ?? ""),
      sourceId: String(parsed.sourceId ?? ""),
      terminologyVersion: String(parsed.terminologyVersion ?? ""),
      provenance: String(parsed.provenance ?? ""),
      sourcePriority: parsed.sourcePriority == null ? undefined : Number(parsed.sourcePriority),
      status: parsed.status == null ? undefined : String(parsed.status),
      labelRegister: parsed.labelRegister == null ? undefined : String(parsed.labelRegister),
      exactness: parsed.exactness == null ? undefined : String(parsed.exactness),
      codeSystem: parsed.codeSystem == null ? undefined : String(parsed.codeSystem),
      releaseVersion: parsed.releaseVersion == null ? undefined : String(parsed.releaseVersion),
    });
  }
  return rows;
}

export function parseLicensedTerminologyArtifact(input: {
  text: string;
  format: "csv" | "jsonl";
}): Icd10LicensedArtifactRecord[] {
  return input.format === "jsonl" ? parseLicensedTerminologyJsonl(input.text) : parseLicensedTerminologyCsv(input.text);
}

function countReason(rejected: Icd10LicensedRejectedRow[], reason: Icd10LicensedRejectReason): number {
  return rejected.filter((row) => row.reason === reason).length;
}

export function buildLicensedIcd10TerminologyImportPlan(input: {
  records: readonly Icd10LicensedArtifactRecord[];
  catalogByNormalizedCode: ReadonlyMap<string, Icd10CatalogIdentity>;
  expectedCodeSystem?: string;
  expectedReleaseVersion: string;
  existingRows?: readonly Icd10LicensedExistingRow[];
  otherReleaseNormalizedCodes?: ReadonlySet<string>;
  allowSameVersionUpdate?: boolean;
  supersedePrior?: boolean;
  allowMixedSourceIds?: boolean;
}): Icd10LicensedImportPlan {
  const expectedCodeSystem = input.expectedCodeSystem ?? ICD10_CM_CODE_SYSTEM;
  const allowSameVersionUpdate = input.allowSameVersionUpdate === true;
  const existing = new Map(
    (input.existingRows ?? []).map((row) => [licensedSourceIdentityKey(row), row] as const),
  );
  const seenIdentity = new Set<string>();
  const rejected: Icd10LicensedRejectedRow[] = [];
  const acceptedInserts: Icd10LicensedTerminologyRow[] = [];
  const acceptedUpdates: Icd10LicensedTerminologyRow[] = [];
  const unchanged: Icd10LicensedTerminologyRow[] = [];
  const supersede: Icd10LicensedImportPlan["supersede"] = [];
  const consistency = inspectLicensedArtifactConsistency(input.records);
  if (!consistency.consistent && input.allowMixedSourceIds !== true && input.records.length > 0) {
    const rejectedAll = input.records.map((rec) => ({
      code: rec.code,
      locale: rec.locale,
      label: rec.label,
      reason: "REJECTED_INCONSISTENT_SOURCE" as const,
    }));
    return {
      acceptedInserts: [],
      acceptedUpdates: [],
      unchanged: [],
      supersede: [],
      rejected: rejectedAll,
      report: emptyLicensedImportReport(input.records.length, rejectedAll),
    };
  }

  for (const rec of input.records) {
    const label = rec.label.trim();
    const localeRaw = rec.locale.trim().toLowerCase();
    const sourceId = rec.sourceId.trim();
    const terminologyVersion = rec.terminologyVersion.trim();
    const provenanceRaw = rec.provenance.trim();
    const register = (rec.labelRegister?.trim() || "CLINICIAN_PREFERRED").toUpperCase();
    const statusRaw = (rec.status?.trim() || "APPROVED").toUpperCase();
    const codeRaw = rec.code.trim();

    if (!codeRaw || !label || !sourceId || !terminologyVersion) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_EMPTY" });
      continue;
    }
    if (!isLocale(localeRaw)) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_UNSUPPORTED_LOCALE" });
      continue;
    }
    if (register === "CONSUMER") {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_CONSUMER_REGISTER" });
      continue;
    }
    if (register !== "CLINICIAN_PREFERRED") {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_CONSUMER_REGISTER" });
      continue;
    }
    if (!isProvenance(provenanceRaw)) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_INVALID_PROVENANCE" });
      continue;
    }
    if (!isStatus(statusRaw)) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_INVALID_STATUS" });
      continue;
    }
    if (rec.codeSystem && rec.codeSystem !== expectedCodeSystem) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_WRONG_RELEASE" });
      continue;
    }
    if (rec.releaseVersion && rec.releaseVersion !== input.expectedReleaseVersion) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_WRONG_RELEASE" });
      continue;
    }

    const normalized = normalizeIcd10CodeForLookup(codeRaw);
    const catalog = input.catalogByNormalizedCode.get(normalized);
    if (!catalog) {
      const other = input.otherReleaseNormalizedCodes?.has(normalized) === true;
      rejected.push({
        code: codeRaw,
        locale: localeRaw,
        label,
        reason: other ? "REJECTED_WRONG_RELEASE" : "REJECTED_UNKNOWN_CODE",
      });
      continue;
    }
    if (catalog.codeSystem !== expectedCodeSystem || catalog.releaseVersion !== input.expectedReleaseVersion) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "IDENTITY_MISMATCH" });
      continue;
    }
    if (normalizeIcd10CodeForLookup(catalog.code) !== normalized) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "IDENTITY_MISMATCH" });
      continue;
    }
    if (!isSelectableCatalogRow(catalog)) {
      rejected.push({ code: codeRaw, locale: localeRaw, label, reason: "REJECTED_NONSELECTABLE" });
      continue;
    }

    const exactnessRaw = rec.exactness?.trim().toUpperCase();
    const exactness: Icd10TerminologyExactness =
      exactnessRaw === "EXACT_GOVERNED" || exactnessRaw === "EXACT_SOURCE"
        ? exactnessRaw
        : defaultExactness(provenanceRaw);
    const sourcePriority =
      Number.isFinite(rec.sourcePriority) && rec.sourcePriority != null
        ? Number(rec.sourcePriority)
        : defaultPriority(provenanceRaw);
    const displayCode = catalog.code || formatIcd10CmDisplayCode(normalized);
    const row: Icd10LicensedTerminologyRow = {
      icd10CatalogId: catalog.id,
      codeSystem: catalog.codeSystem,
      releaseVersion: catalog.releaseVersion,
      code: displayCode,
      normalizedCode: catalog.normalizedCode,
      locale: localeRaw,
      preferredLabel: label,
      labelRegister: "CLINICIAN_PREFERRED",
      provenance: provenanceRaw,
      exactness,
      sourceId,
      terminologyVersion,
      sourcePriority,
      status: statusRaw,
    };
    const key = licensedSourceIdentityKey(row);
    if (seenIdentity.has(key)) {
      rejected.push({ code: displayCode, locale: localeRaw, label, reason: "DUPLICATE_SOURCE_IDENTITY" });
      continue;
    }
    seenIdentity.add(key);

    const prior = existing.get(key);
    if (!prior) {
      acceptedInserts.push(row);
      if (input.supersedePrior === true) {
        supersede.push({
          code: row.code,
          locale: row.locale,
          provenance: row.provenance,
          sourceId: row.sourceId,
          labelRegister: "CLINICIAN_PREFERRED",
          keepTerminologyVersion: row.terminologyVersion,
        });
      }
      continue;
    }
    const sameContent =
      prior.preferredLabel === row.preferredLabel &&
      prior.exactness === row.exactness &&
      prior.sourcePriority === row.sourcePriority &&
      prior.status === row.status;
    if (sameContent) {
      unchanged.push(row);
      continue;
    }
    if (!allowSameVersionUpdate) {
      rejected.push({ code: displayCode, locale: localeRaw, label, reason: "REJECT_SAME_VERSION_MUTATION" });
      continue;
    }
    acceptedUpdates.push(row);
  }

  const valid = acceptedInserts.length + acceptedUpdates.length + unchanged.length;
  const report = emptyLicensedImportReport(input.records.length, rejected);
  report.VALID_EXACT = valid;
  report.INSERTED = acceptedInserts.length;
  report.UPDATED = acceptedUpdates.length;
  report.UNCHANGED = unchanged.length;
  report.SUPERSEDED = supersede.length;
  report.SOURCE_ID = consistency.sourceIds[0] ?? null;
  report.TERMINOLOGY_VERSION = consistency.terminologyVersions[0] ?? null;
  report.LOCALE_SET = consistency.locales.join(",") || null;
  report.LOCALES = report.LOCALE_SET;
  report.TARGET_RELEASE = input.expectedReleaseVersion;

  return { acceptedInserts, acceptedUpdates, unchanged, supersede, rejected, report };
}

function emptyLicensedImportReport(total: number, rejected: Icd10LicensedRejectedRow[]): Icd10LicensedImportReport {
  return {
    TOTAL_INPUT: total,
    VALID_EXACT: 0,
    REJECTED_UNKNOWN_CODE: countReason(rejected, "REJECTED_UNKNOWN_CODE"),
    REJECTED_NONSELECTABLE: countReason(rejected, "REJECTED_NONSELECTABLE"),
    REJECTED_WRONG_RELEASE: countReason(rejected, "REJECTED_WRONG_RELEASE") + countReason(rejected, "IDENTITY_MISMATCH"),
    REJECTED_EMPTY: countReason(rejected, "REJECTED_EMPTY"),
    DUPLICATE_SOURCE_IDENTITY: countReason(rejected, "DUPLICATE_SOURCE_IDENTITY"),
    REJECTED_INCONSISTENT_SOURCE: countReason(rejected, "REJECTED_INCONSISTENT_SOURCE"),
    INSERTED: 0,
    UPDATED: 0,
    UNCHANGED: 0,
    SUPERSEDED: 0,
    EFFECTIVE_AFTER: null,
    COVERAGE_AFTER: null,
    ARTIFACT_SHA256: null,
    ARTIFACT_FILE: null,
    ARTIFACT_FILE_NAME: null,
    SOURCE_ID: null,
    TERMINOLOGY_VERSION: null,
    TARGET_RELEASE: null,
    LOCALE_SET: null,
    LOCALES: null,
    INPUT_ROW_COUNT: total,
    CHUNK_SIZE: null,
    CHUNK_COUNT: null,
    WRITE_ROUND_TRIPS: null,
    RECOMPUTE_CALL_COUNT: null,
    RECOMPUTE_BATCH_SIZE: null,
    RECOMPUTE_BATCH_COUNT: null,
    RECOMPUTE_SELECT_OPERATIONS: null,
    RECOMPUTE_CLEAR_OPERATIONS: null,
    RECOMPUTE_SET_OPERATIONS: null,
    IMPORT_STATUS: null,
    FAILED_CHUNK: null,
    FAILED_PHASE: null,
  };
}

export function formatLicensedImportReport(report: Icd10LicensedImportReport): string[] {
  return [
    `TOTAL_INPUT=${report.TOTAL_INPUT}`,
    `VALID_EXACT=${report.VALID_EXACT}`,
    `REJECTED_UNKNOWN_CODE=${report.REJECTED_UNKNOWN_CODE}`,
    `REJECTED_NONSELECTABLE=${report.REJECTED_NONSELECTABLE}`,
    `REJECTED_WRONG_RELEASE=${report.REJECTED_WRONG_RELEASE}`,
    `REJECTED_EMPTY=${report.REJECTED_EMPTY}`,
    `DUPLICATE_SOURCE_IDENTITY=${report.DUPLICATE_SOURCE_IDENTITY}`,
    `REJECTED_INCONSISTENT_SOURCE=${report.REJECTED_INCONSISTENT_SOURCE}`,
    `INSERTED=${report.INSERTED}`,
    `UPDATED=${report.UPDATED}`,
    `UNCHANGED=${report.UNCHANGED}`,
    `SUPERSEDED=${report.SUPERSEDED}`,
    `EFFECTIVE_AFTER=${report.EFFECTIVE_AFTER ?? ""}`,
    `COVERAGE_AFTER=${report.COVERAGE_AFTER ?? ""}`,
    `ARTIFACT_SHA256=${report.ARTIFACT_SHA256 ?? ""}`,
    `ARTIFACT_FILE=${report.ARTIFACT_FILE ?? ""}`,
    `ARTIFACT_FILE_NAME=${report.ARTIFACT_FILE_NAME ?? report.ARTIFACT_FILE ?? ""}`,
    `SOURCE_ID=${report.SOURCE_ID ?? ""}`,
    `TERMINOLOGY_VERSION=${report.TERMINOLOGY_VERSION ?? ""}`,
    `TARGET_RELEASE=${report.TARGET_RELEASE ?? ""}`,
    `LOCALE_SET=${report.LOCALE_SET ?? ""}`,
    `LOCALES=${report.LOCALES ?? report.LOCALE_SET ?? ""}`,
    `INPUT_ROW_COUNT=${report.INPUT_ROW_COUNT}`,
    `CHUNK_SIZE=${report.CHUNK_SIZE ?? ""}`,
    `CHUNK_COUNT=${report.CHUNK_COUNT ?? ""}`,
    `WRITE_ROUND_TRIPS=${report.WRITE_ROUND_TRIPS ?? ""}`,
    `RECOMPUTE_CALL_COUNT=${report.RECOMPUTE_CALL_COUNT ?? ""}`,
    `RECOMPUTE_BATCH_SIZE=${report.RECOMPUTE_BATCH_SIZE ?? ""}`,
    `RECOMPUTE_BATCH_COUNT=${report.RECOMPUTE_BATCH_COUNT ?? ""}`,
    `RECOMPUTE_SELECT_OPERATIONS=${report.RECOMPUTE_SELECT_OPERATIONS ?? ""}`,
    `RECOMPUTE_CLEAR_OPERATIONS=${report.RECOMPUTE_CLEAR_OPERATIONS ?? ""}`,
    `RECOMPUTE_SET_OPERATIONS=${report.RECOMPUTE_SET_OPERATIONS ?? ""}`,
    `IMPORT_STATUS=${report.IMPORT_STATUS ?? ""}`,
    `FAILED_CHUNK=${report.FAILED_CHUNK ?? ""}`,
    `FAILED_PHASE=${report.FAILED_PHASE ?? ""}`,
  ];
}

export type LicensedImportChunkWriter = {
  insertChunk(rows: readonly Icd10LicensedTerminologyRow[]): Promise<{ count: number }>;
  updateRow(row: Icd10LicensedTerminologyRow): Promise<void>;
  supersedeChunk(targets: Icd10LicensedImportPlan["supersede"]): Promise<void>;
};

export type LicensedImportApplyResult = {
  insertChunks: number;
  updateCount: number;
  supersedeChunks: number;
  writeRoundTrips: number;
  failedChunk: number | null;
  failedPhase: Icd10LicensedImportFailedPhase;
};

/**
 * Bounded sequential chunk apply. One writer call per chunk — not one promise per row.
 * Caller must wrap each writer method in its own DB transaction if needed.
 * Recompute is intentionally NOT invoked here.
 */
export async function applyLicensedImportPlanInChunks(input: {
  plan: Pick<Icd10LicensedImportPlan, "acceptedInserts" | "acceptedUpdates" | "supersede">;
  writer: LicensedImportChunkWriter;
  chunkSize?: number;
  supersedePrior?: boolean;
  onChunk?: (info: { phase: "INSERT" | "UPDATE" | "SUPERSEDE"; index: number; total: number; size: number }) => void;
}): Promise<LicensedImportApplyResult> {
  const chunkSize = Math.max(1, Math.floor(Number(input.chunkSize)) || ICD10_LICENSED_IMPORT_DEFAULT_CHUNK_SIZE);
  const insertChunks = chunkLicensedImportRows(input.plan.acceptedInserts, chunkSize);
  const updateChunks = chunkLicensedImportRows(input.plan.acceptedUpdates, chunkSize);
  const supersedeChunks =
    input.supersedePrior === true ? chunkLicensedImportRows(input.plan.supersede, chunkSize) : [];
  let writeRoundTrips = 0;
  let failedChunk: number | null = null;
  let failedPhase: Icd10LicensedImportFailedPhase = null;

  try {
    for (let i = 0; i < insertChunks.length; i += 1) {
      const chunk = insertChunks[i]!;
      input.onChunk?.({ phase: "INSERT", index: i + 1, total: insertChunks.length, size: chunk.length });
      failedChunk = i + 1;
      failedPhase = "INSERT";
      await input.writer.insertChunk(chunk);
      writeRoundTrips += 1;
    }
    failedChunk = null;
    failedPhase = null;
    for (let i = 0; i < updateChunks.length; i += 1) {
      const chunk = updateChunks[i]!;
      input.onChunk?.({ phase: "UPDATE", index: i + 1, total: updateChunks.length, size: chunk.length });
      for (let j = 0; j < chunk.length; j += 1) {
        failedChunk = i + 1;
        failedPhase = "UPDATE";
        await input.writer.updateRow(chunk[j]!);
        writeRoundTrips += 1;
      }
    }
    failedChunk = null;
    failedPhase = null;
    for (let i = 0; i < supersedeChunks.length; i += 1) {
      const chunk = supersedeChunks[i]!;
      input.onChunk?.({ phase: "SUPERSEDE", index: i + 1, total: supersedeChunks.length, size: chunk.length });
      failedChunk = i + 1;
      failedPhase = "SUPERSEDE";
      await input.writer.supersedeChunk(chunk);
      writeRoundTrips += 1;
    }
    return {
      insertChunks: insertChunks.length,
      updateCount: input.plan.acceptedUpdates.length,
      supersedeChunks: supersedeChunks.length,
      writeRoundTrips,
      failedChunk: null,
      failedPhase: null,
    };
  } catch (err) {
    const wrapped = err instanceof Error ? err : new Error(String(err));
    wrapped.message = `LICENSED_IMPORT_${failedPhase ?? "UNKNOWN"}_CHUNK_${failedChunk ?? "?"}_FAILED: ${wrapped.message}`;
    throw wrapped;
  }
}

export function uniqueLicensedImportIdentities(
  rows: readonly Pick<Icd10LicensedTerminologyRow, "codeSystem" | "releaseVersion" | "code" | "locale">[],
): Array<Pick<Icd10LicensedTerminologyRow, "codeSystem" | "releaseVersion" | "code" | "locale">> {
  const seen = new Set<string>();
  const out: Array<Pick<Icd10LicensedTerminologyRow, "codeSystem" | "releaseVersion" | "code" | "locale">> = [];
  for (const row of rows) {
    const key = `${row.codeSystem}|${row.releaseVersion}|${row.code}|${row.locale}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      codeSystem: row.codeSystem,
      releaseVersion: row.releaseVersion,
      code: row.code,
      locale: row.locale,
    });
  }
  return out;
}
