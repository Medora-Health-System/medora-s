/**
 * Medication Intelligence Phase 1 — shared audit types and JSON helpers.
 * Read-only; no catalog imports or DB mutations.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

export type AuditDataSource = "database" | "seed_files_only";
export type AuditConfidence = "HIGH" | "MEDIUM" | "LOW";
export type AuditStatus = "COMPLETE";

export type MedicationAuditBase = {
  generatedAt: string;
  auditStatus: AuditStatus;
  dataSource: AuditDataSource;
  confidence: AuditConfidence;
  catalogClassification: "CURATED";
  catalogComplete: false;
};

export const FIXTURE_CODE_PATTERNS = [
  "GENERIC_MST_",
  "ROUTE_IM_MST_",
  "_MST_",
  "DEV-SAMPLE",
  "DEV_SAMPLE",
  "MEDORA-DEV-SAMPLE",
] as const;

export const AUDIT_SUMMARIES_DIR = resolve(__dirname, "../audit-summaries");
export const API_ROOT = resolve(__dirname, "../../..");

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function ensureAuditEnvLoaded(): void {
  loadEnvFile(resolve(API_ROOT, ".env"));
  loadEnvFile(resolve(API_ROOT, "../.env"));
  loadEnvFile(resolve(process.cwd(), ".env"));
}

ensureAuditEnvLoaded();

export function generatedAtIso(): string {
  return new Date().toISOString();
}

export function isFixtureLikeCode(code: string): boolean {
  const upper = code.toUpperCase();
  return FIXTURE_CODE_PATTERNS.some((pattern) => upper.includes(pattern.toUpperCase()));
}

export function isDevSampleRow(row: { code?: string; description?: string | null; name?: string | null }): boolean {
  const blob = [row.code, row.description, row.name].filter(Boolean).join(" ").toUpperCase();
  return blob.includes("DEV SAMPLE") || blob.includes("DEV-SAMPLE") || blob.includes("MEDORA-DEV-SAMPLE");
}

export function classifyProductionVsFixture(codes: string[]): {
  productionLike: number;
  fixtureLike: number;
  fixtureExamples: string[];
} {
  const fixtureExamples: string[] = [];
  let fixtureLike = 0;
  for (const code of codes) {
    if (isFixtureLikeCode(code)) {
      fixtureLike += 1;
      if (fixtureExamples.length < 10) fixtureExamples.push(code);
    }
  }
  return {
    productionLike: codes.length - fixtureLike,
    fixtureLike,
    fixtureExamples: fixtureExamples.sort(),
  };
}

/** Deterministic JSON with recursively sorted object keys. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === "object" && !(value instanceof Date)) {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}

export function stableJsonStringify(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

export function writeAuditArtifact(filename: string, payload: unknown): string {
  mkdirSync(AUDIT_SUMMARIES_DIR, { recursive: true });
  const path = join(AUDIT_SUMMARIES_DIR, filename);
  writeFileSync(path, stableJsonStringify(payload), "utf8");
  return path;
}

export function auditBase(dataSource: AuditDataSource, confidence: AuditConfidence): MedicationAuditBase {
  return {
    generatedAt: generatedAtIso(),
    auditStatus: "COMPLETE",
    dataSource,
    confidence,
    catalogClassification: "CURATED",
    catalogComplete: false,
  };
}

export async function withPrisma<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, error: "DATABASE_URL not configured" };
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const value = await fn(prisma);
    return { ok: true, value };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

export function findDuplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) dups.add(value);
    else seen.add(key);
  }
  return [...dups].sort();
}

/** Read-only guard — audit scripts must not mutate clinical/catalog data. */
export const READ_ONLY_MUTATION_METHODS = [
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
] as const;

export function assertReadOnlyPrismaSurface(methodNames: string[]): boolean {
  return methodNames.every((name) => !(READ_ONLY_MUTATION_METHODS as readonly string[]).includes(name));
}
