/**
 * Deployment / startup schema compatibility checks (no PHI).
 * MEDORA.PROD.TRACKBOARD_PRISMA_500_2026_07_20
 * MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING
 *
 * Expand-and-contract rule:
 * - Required Encounter columns for reviewed query contracts must exist.
 * - D3B/D3C objects are optional while their feature flags are OFF.
 * - Shared Encounter query contracts must never select unapplied D3 columns.
 * - Feature flags alone are NOT sufficient — runtime contracts are validated too.
 */

import {
  hospitalEpisodeFoundationEnabledFromProcessEnv,
  internalPlacementWorkflowEnabledFromProcessEnv,
  receivingEncounterFoundationEnabledFromProcessEnv,
} from "@medora/shared";
import type { PrismaClient } from "@prisma/client";
import {
  assertAllEncounterQueryContractsExcludeD3,
  ENCOUNTER_CORE_REQUIRED_COLUMNS,
  ENCOUNTER_FORBIDDEN_SELECT_KEYS,
} from "../encounters/encounter-query-contracts";

export const D3B_MIGRATION_FOLDER = "20261024120000_hospital_episode_foundation_d3b";
export const D3C_MIGRATION_FOLDER = "20261025120000_internal_placement_request_d3c";

/** Scalar Encounter columns required by Trackboard explicit select (pre-D3B). */
export const TRACKBOARD_REQUIRED_ENCOUNTER_COLUMNS = [
  "id",
  "patientId",
  "facilityId",
  "type",
  "status",
  "createdAt",
  "updatedAt",
  "chiefComplaint",
  "roomLabel",
  "workflowState",
  "providerDocumentationStatus",
  "admittedAt",
  "dischargedAt",
  "physicianAssignedUserId",
  "nurseAssignedUserId",
  "nursingAssessment",
  "dischargeSummaryJson",
  "admissionSummaryJson",
  "billingReadinessSnapshotJson",
] as const;

export const D3B_OPTIONAL_OBJECTS = {
  encounterColumn: "hospitalEpisodeId",
  hospitalEpisodeTable: "HospitalEpisode",
  statusEnum: "HospitalEpisodeStatus",
  closeReasonEnum: "HospitalEpisodeCloseReason",
} as const;

export const D3C_OPTIONAL_OBJECTS = {
  placementTable: "InternalPlacementRequest",
  statusEnum: "InternalPlacementStatus",
  requestedTypeEnum: "InternalPlacementRequestedEncounterType",
  receivingLifecycleEnum: "ReceivingEncounterLifecycle",
} as const;

export type SchemaObjectPresence = {
  trackboardRequiredColumnsMissing: string[];
  encounterCoreColumnsMissing: string[];
  hospitalEpisodeTablePresent: boolean;
  hospitalEpisodeIdColumnPresent: boolean;
  hospitalEpisodeStatusEnumPresent: boolean;
  hospitalEpisodeCloseReasonEnumPresent: boolean;
  d3bMigrationRecorded: boolean;
  internalPlacementTablePresent: boolean;
  internalPlacementStatusEnumPresent: boolean;
  internalPlacementRequestedTypeEnumPresent: boolean;
  receivingEncounterLifecycleEnumPresent: boolean;
  d3cMigrationRecorded: boolean;
  appliedMigrationCount: number;
  latestAppliedMigration: string | null;
};

export type SchemaCompatibilityVerdict =
  | "COMPATIBLE"
  | "REQUIRED_SCHEMA_MISSING"
  | "FEATURE_ON_SCHEMA_MISSING"
  | "UNSAFE_RUNTIME_QUERY_CONTRACT"
  | "DATABASE_UNREACHABLE";

export type SchemaCompatibilityReport = {
  ok: boolean;
  verdict: SchemaCompatibilityVerdict;
  hospitalEpisodeFoundationEnabled: boolean;
  internalPlacementWorkflowEnabled: boolean;
  receivingEncounterFoundationEnabled: boolean;
  encounterQueryContractsSafe: boolean;
  presence: SchemaObjectPresence | null;
  reasons: string[];
  deploymentSha: string | null;
  checkedAt: string;
};

type Queryable = Pick<PrismaClient, "$queryRawUnsafe">;

async function tableExists(db: Queryable, table: string): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    table
  );
  return Boolean(rows[0]?.exists);
}

async function columnExists(
  db: Queryable,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) AS exists`,
    table,
    column
  );
  return Boolean(rows[0]?.exists);
}

async function enumExists(db: Queryable, enumName: string): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typname = $1
    ) AS exists`,
    enumName
  );
  return Boolean(rows[0]?.exists);
}

async function listMissingEncounterColumns(
  db: Queryable,
  columns: readonly string[]
): Promise<string[]> {
  const missing: string[] = [];
  for (const col of columns) {
    const ok = await columnExists(db, "Encounter", col);
    if (!ok) missing.push(col);
  }
  return missing;
}

async function readMigrationFingerprint(db: Queryable): Promise<{
  count: number;
  latest: string | null;
  d3bRecorded: boolean;
  d3cRecorded: boolean;
}> {
  const hasTable = await tableExists(db, "_prisma_migrations");
  if (!hasTable) {
    return { count: 0, latest: null, d3bRecorded: false, d3cRecorded: false };
  }
  const rows = await db.$queryRawUnsafe<
    Array<{ migration_name: string; finished_at: Date | null }>
  >(
    `SELECT migration_name, finished_at
     FROM "_prisma_migrations"
     WHERE finished_at IS NOT NULL
     ORDER BY finished_at DESC
     LIMIT 200`
  );
  const names = rows.map((r) => r.migration_name);
  return {
    count: names.length,
    latest: names[0] ?? null,
    d3bRecorded: names.some((n) => n.includes("hospital_episode_foundation_d3b")),
    d3cRecorded: names.some((n) => n.includes("internal_placement_request_d3c")),
  };
}

/**
 * Validate shared Encounter query contracts at runtime.
 * Returns null when safe; otherwise an error message.
 */
export function validateEncounterQueryContractsForDeployment(): string | null {
  try {
    assertAllEncounterQueryContractsExcludeD3();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  return null;
}

export async function inspectSchemaObjectPresence(
  db: Queryable
): Promise<SchemaObjectPresence> {
  const requiredCore = Array.from(
    new Set([...TRACKBOARD_REQUIRED_ENCOUNTER_COLUMNS, ...ENCOUNTER_CORE_REQUIRED_COLUMNS])
  );
  const [
    trackboardRequiredColumnsMissing,
    encounterCoreColumnsMissing,
    hospitalEpisodeTablePresent,
    hospitalEpisodeIdColumnPresent,
    hospitalEpisodeStatusEnumPresent,
    hospitalEpisodeCloseReasonEnumPresent,
    internalPlacementTablePresent,
    internalPlacementStatusEnumPresent,
    internalPlacementRequestedTypeEnumPresent,
    receivingEncounterLifecycleEnumPresent,
    migrations,
  ] = await Promise.all([
    listMissingEncounterColumns(db, TRACKBOARD_REQUIRED_ENCOUNTER_COLUMNS),
    listMissingEncounterColumns(db, ENCOUNTER_CORE_REQUIRED_COLUMNS),
    tableExists(db, D3B_OPTIONAL_OBJECTS.hospitalEpisodeTable),
    columnExists(db, "Encounter", D3B_OPTIONAL_OBJECTS.encounterColumn),
    enumExists(db, D3B_OPTIONAL_OBJECTS.statusEnum),
    enumExists(db, D3B_OPTIONAL_OBJECTS.closeReasonEnum),
    tableExists(db, D3C_OPTIONAL_OBJECTS.placementTable),
    enumExists(db, D3C_OPTIONAL_OBJECTS.statusEnum),
    enumExists(db, D3C_OPTIONAL_OBJECTS.requestedTypeEnum),
    enumExists(db, D3C_OPTIONAL_OBJECTS.receivingLifecycleEnum),
    readMigrationFingerprint(db),
  ]);

  void requiredCore;

  return {
    trackboardRequiredColumnsMissing,
    encounterCoreColumnsMissing,
    hospitalEpisodeTablePresent,
    hospitalEpisodeIdColumnPresent,
    hospitalEpisodeStatusEnumPresent,
    hospitalEpisodeCloseReasonEnumPresent,
    d3bMigrationRecorded: migrations.d3bRecorded,
    internalPlacementTablePresent,
    internalPlacementStatusEnumPresent,
    internalPlacementRequestedTypeEnumPresent,
    receivingEncounterLifecycleEnumPresent,
    d3cMigrationRecorded: migrations.d3cRecorded,
    appliedMigrationCount: migrations.count,
    latestAppliedMigration: migrations.latest,
  };
}

export function evaluateSchemaCompatibility(
  presence: SchemaObjectPresence,
  options?: {
    hospitalEpisodeFoundationEnabled?: boolean;
    internalPlacementWorkflowEnabled?: boolean;
    receivingEncounterFoundationEnabled?: boolean;
    deploymentSha?: string | null;
    /** Injected for tests; default validates live contracts. */
    encounterQueryContractError?: string | null;
  }
): SchemaCompatibilityReport {
  const hospitalEpisodeFoundationEnabled =
    options?.hospitalEpisodeFoundationEnabled ??
    hospitalEpisodeFoundationEnabledFromProcessEnv();
  const internalPlacementWorkflowEnabled =
    options?.internalPlacementWorkflowEnabled ??
    internalPlacementWorkflowEnabledFromProcessEnv();
  const receivingEncounterFoundationEnabled =
    options?.receivingEncounterFoundationEnabled ??
    receivingEncounterFoundationEnabledFromProcessEnv();
  const reasons: string[] = [];
  const checkedAt = new Date().toISOString();
  const deploymentSha =
    options?.deploymentSha ??
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ??
    process.env.GIT_COMMIT_SHA?.trim() ??
    process.env.COMMIT_SHA?.trim() ??
    null;

  const contractError =
    options?.encounterQueryContractError !== undefined
      ? options.encounterQueryContractError
      : validateEncounterQueryContractsForDeployment();
  const encounterQueryContractsSafe = contractError == null;

  const baseFlags = {
    hospitalEpisodeFoundationEnabled,
    internalPlacementWorkflowEnabled,
    receivingEncounterFoundationEnabled,
    encounterQueryContractsSafe,
  };

  if (!encounterQueryContractsSafe) {
    reasons.push(
      `Unsafe Encounter query contract: ${contractError}. Shared selects must not reference ${ENCOUNTER_FORBIDDEN_SELECT_KEYS.join(", ")} while expand-and-contract is active.`
    );
    return {
      ok: false,
      verdict: "UNSAFE_RUNTIME_QUERY_CONTRACT",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  const requiredMissing = Array.from(
    new Set([
      ...presence.trackboardRequiredColumnsMissing,
      ...presence.encounterCoreColumnsMissing,
    ])
  );

  if (requiredMissing.length > 0) {
    reasons.push(
      `Missing required Encounter columns for reviewed query contracts: ${requiredMissing.join(", ")}`
    );
    return {
      ok: false,
      verdict: "REQUIRED_SCHEMA_MISSING",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  const d3bComplete =
    presence.hospitalEpisodeTablePresent &&
    presence.hospitalEpisodeIdColumnPresent &&
    presence.hospitalEpisodeStatusEnumPresent &&
    presence.hospitalEpisodeCloseReasonEnumPresent;

  const d3cComplete =
    presence.internalPlacementTablePresent &&
    presence.internalPlacementStatusEnumPresent &&
    presence.internalPlacementRequestedTypeEnumPresent &&
    presence.receivingEncounterLifecycleEnumPresent;

  if (hospitalEpisodeFoundationEnabled && !d3bComplete) {
    reasons.push(
      "hospitalEpisodeFoundationEnabled is ON but D3B schema objects are incomplete."
    );
    return {
      ok: false,
      verdict: "FEATURE_ON_SCHEMA_MISSING",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  if (internalPlacementWorkflowEnabled && !d3cComplete) {
    reasons.push(
      "internalPlacementWorkflowEnabled is ON but D3C InternalPlacementRequest schema is incomplete."
    );
    return {
      ok: false,
      verdict: "FEATURE_ON_SCHEMA_MISSING",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  if (internalPlacementWorkflowEnabled && !d3bComplete) {
    reasons.push(
      "internalPlacementWorkflowEnabled is ON but D3B HospitalEpisode schema is incomplete (required dependency)."
    );
    return {
      ok: false,
      verdict: "FEATURE_ON_SCHEMA_MISSING",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  if (receivingEncounterFoundationEnabled && !d3cComplete) {
    reasons.push(
      "receivingEncounterFoundationEnabled is ON but D3C schema is incomplete."
    );
    return {
      ok: false,
      verdict: "FEATURE_ON_SCHEMA_MISSING",
      ...baseFlags,
      presence,
      reasons,
      deploymentSha,
      checkedAt,
    };
  }

  if (!d3bComplete && !hospitalEpisodeFoundationEnabled) {
    reasons.push(
      "D3B schema optional objects absent; feature flag OFF; shared Encounter contracts exclude hospitalEpisodeId; feature-OFF writers must use explicit pre-D3B selects (no RETURNING of hospitalEpisodeId) — OK."
    );
  } else if (d3bComplete) {
    reasons.push("D3B schema objects present.");
  }

  if (!d3cComplete && !internalPlacementWorkflowEnabled && !receivingEncounterFoundationEnabled) {
    reasons.push(
      "D3C schema optional objects absent; placement flags OFF — OK when Trackboard does not query InternalPlacementRequest."
    );
  } else if (d3cComplete) {
    reasons.push("D3C schema objects present.");
  }

  reasons.push("Encounter query contracts validated (no unconditional D3B fields).");

  return {
    ok: true,
    verdict: "COMPATIBLE",
    ...baseFlags,
    presence,
    reasons,
    deploymentSha,
    checkedAt,
  };
}

let cachedReport: { at: number; report: SchemaCompatibilityReport } | null = null;
const CACHE_TTL_MS = 30_000;

export async function checkSchemaCompatibility(
  db: Queryable,
  options?: {
    hospitalEpisodeFoundationEnabled?: boolean;
    internalPlacementWorkflowEnabled?: boolean;
    receivingEncounterFoundationEnabled?: boolean;
    deploymentSha?: string | null;
    bypassCache?: boolean;
  }
): Promise<SchemaCompatibilityReport> {
  if (
    !options?.bypassCache &&
    cachedReport &&
    Date.now() - cachedReport.at < CACHE_TTL_MS
  ) {
    return cachedReport.report;
  }
  try {
    const presence = await inspectSchemaObjectPresence(db);
    const report = evaluateSchemaCompatibility(presence, options);
    cachedReport = { at: Date.now(), report };
    return report;
  } catch {
    const report: SchemaCompatibilityReport = {
      ok: false,
      verdict: "DATABASE_UNREACHABLE",
      hospitalEpisodeFoundationEnabled:
        options?.hospitalEpisodeFoundationEnabled ??
        hospitalEpisodeFoundationEnabledFromProcessEnv(),
      internalPlacementWorkflowEnabled:
        options?.internalPlacementWorkflowEnabled ??
        internalPlacementWorkflowEnabledFromProcessEnv(),
      receivingEncounterFoundationEnabled:
        options?.receivingEncounterFoundationEnabled ??
        receivingEncounterFoundationEnabledFromProcessEnv(),
      encounterQueryContractsSafe: false,
      presence: null,
      reasons: ["Could not inspect information_schema / _prisma_migrations"],
      deploymentSha:
        options?.deploymentSha ??
        process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ??
        process.env.GIT_COMMIT_SHA?.trim() ??
        null,
      checkedAt: new Date().toISOString(),
    };
    return report;
  }
}

/** Test helper — clears readiness cache. */
export function resetSchemaCompatibilityCache(): void {
  cachedReport = null;
}

/** Whether startup should exit when compatibility check fails. */
export function schemaCompatGuardEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.MEDORA_SCHEMA_COMPAT_GUARD ?? "").trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  return (env.NODE_ENV ?? "").toLowerCase() === "production";
}
