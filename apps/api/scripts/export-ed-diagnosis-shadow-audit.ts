/**
 * MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2
 * Read-only ED diagnosis export for family resolver shadow audit.
 *
 * Usage (from repo root):
 *   pnpm --filter @medora/api run export:ed-diagnosis-shadow
 *
 * Writes PHI-safe rows to exports/ed-diagnosis-shadow-audit.json
 * Does NOT write to the database.
 */
import "reflect-metadata";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildDiagnosisResolverShadowAuditQuery,
  mapPrismaDiagnosisRowToShadowAuditRow,
} from "../src/encounters/diagnosis-resolver-shadow-audit.util";

const prisma = new PrismaClient();

export type EdDiagnosisShadowAuditExportRow = {
  diagnosisCode: string;
  diagnosisDescription: string;
  encounterType: "ED" | "INPATIENT" | "OBSERVATION" | "OUTPATIENT";
  patientAgeYears?: number;
  patientSex?: "male" | "female" | "unknown";
  encounterDate: string;
};

export type EdDiagnosisShadowAuditExportFile = {
  meta: {
    version: string;
    exportSource: "database";
    databaseAvailable: true;
    generatedAt: string;
    environment: string;
    encounterTypeFilter: string;
    totalRows: number;
    uniqueIcdCodes: number;
    uniqueDiagnoses: number;
    dateRange: { min: string | null; max: string | null };
  };
  rows: EdDiagnosisShadowAuditExportRow[];
};

function normalizeSex(sex?: string): EdDiagnosisShadowAuditExportRow["patientSex"] {
  if (!sex?.trim()) return undefined;
  const s = sex.trim().toLowerCase();
  if (s === "female" || s === "f") return "female";
  if (s === "male" || s === "m") return "male";
  return "unknown";
}

function maskDatabaseUrl(url: string | undefined): string {
  if (!url?.trim()) return "unset";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//, "").split("?")[0]}`;
  } catch {
    return "configured";
  }
}

export function mapShadowAuditRowToExportRow(
  row: ReturnType<typeof mapPrismaDiagnosisRowToShadowAuditRow>
): EdDiagnosisShadowAuditExportRow {
  return {
    diagnosisCode: row.diagnosisCode,
    diagnosisDescription: row.diagnosisLabel,
    encounterType: row.encounterClass ?? "ED",
    patientAgeYears: row.patientAgeYears,
    patientSex: normalizeSex(row.patientSex),
    encounterDate: row.createdAt?.slice(0, 10) ?? "1970-01-01",
  };
}

export function buildEdDiagnosisShadowAuditExportFile(
  rows: EdDiagnosisShadowAuditExportRow[],
  meta: Omit<EdDiagnosisShadowAuditExportFile["meta"], "totalRows" | "uniqueIcdCodes" | "uniqueDiagnoses" | "dateRange">
): EdDiagnosisShadowAuditExportFile {
  const icdSet = new Set(rows.map((r) => r.diagnosisCode.trim().toUpperCase()));
  const diagSet = new Set(rows.map((r) => `${r.diagnosisCode}|${r.diagnosisDescription}`.toLowerCase()));
  const dates = rows.map((r) => r.encounterDate).filter(Boolean).sort();
  return {
    meta: {
      ...meta,
      totalRows: rows.length,
      uniqueIcdCodes: icdSet.size,
      uniqueDiagnoses: diagSet.size,
      dateRange: {
        min: dates[0] ?? null,
        max: dates[dates.length - 1] ?? null,
      },
    },
    rows,
  };
}

async function fetchEdDiagnosisRows(limit = 5000): Promise<EdDiagnosisShadowAuditExportRow[]> {
  const query = buildDiagnosisResolverShadowAuditQuery({
    encounterType: "EMERGENCY",
    limit,
  });
  const prismaRows = await prisma.diagnosis.findMany(query);
  return prismaRows.map((row) =>
    mapShadowAuditRowToExportRow(mapPrismaDiagnosisRowToShadowAuditRow(row))
  );
}

export async function exportEdDiagnosisShadowAuditToFile(outputPath: string): Promise<EdDiagnosisShadowAuditExportFile> {
  const rows = await fetchEdDiagnosisRows();
  const payload = buildEdDiagnosisShadowAuditExportFile(rows, {
    version: "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2",
    exportSource: "database",
    databaseAvailable: true,
    generatedAt: new Date().toISOString(),
    environment: maskDatabaseUrl(process.env.DATABASE_URL),
    encounterTypeFilter: "EMERGENCY",
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

async function main() {
  const outputPath =
    process.argv[2] ??
    join(process.cwd(), "..", "..", "exports", "ed-diagnosis-shadow-audit.json");

  try {
    const payload = await exportEdDiagnosisShadowAuditToFile(outputPath);
    console.log(
      JSON.stringify({
        ok: true,
        outputPath,
        totalRows: payload.meta.totalRows,
        uniqueIcdCodes: payload.meta.uniqueIcdCodes,
        dateRange: payload.meta.dateRange,
      })
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        hint: "Ensure PostgreSQL is running and DATABASE_URL is configured in apps/api/.env",
      })
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
