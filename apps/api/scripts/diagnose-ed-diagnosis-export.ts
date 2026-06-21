/**
 * MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3
 * Read-only diagnostic for ED diagnosis shadow export pilot qualification.
 *
 * Usage (from repo root):
 *   DATABASE_URL="READ_ONLY_DATABASE_URL" pnpm --filter @medora/api run diagnose:ed-diagnosis-export
 *
 * Does NOT write to the database or export files.
 */
import "reflect-metadata";
import { PrismaClient } from "@prisma/client";
import { buildDiagnosisResolverShadowAuditQuery } from "../src/encounters/diagnosis-resolver-shadow-audit.util";

const PILOT_MINIMUM_ED_DIAGNOSIS_ROWS = 500;

const prisma = new PrismaClient();

function maskDatabaseUrl(url: string | undefined): string {
  if (!url?.trim()) return "unset";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//, "").split("?")[0]}`;
  } catch {
    return "configured";
  }
}

export type EdDiagnosisExportDiagnosticReport = {
  version: "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3";
  generatedAt: string;
  databaseUrlConfigured: boolean;
  databaseReachable: boolean;
  environment: string;
  totalEncounters: number | null;
  encountersByType: Record<string, number> | null;
  totalActiveDiagnoses: number | null;
  activeDiagnosesByEncounterType: Record<string, number> | null;
  edDiagnosesExportable: number | null;
  pilotMinimumRows: number;
  meetsPilotThreshold: boolean;
  uniqueEdIcdCodes: number | null;
  edDiagnosisDateRange: { min: string | null; max: string | null } | null;
  warnings: string[];
  recommendation: string;
};

export async function runEdDiagnosisExportDiagnostic(): Promise<EdDiagnosisExportDiagnosticReport> {
  const warnings: string[] = [];
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());
  const environment = maskDatabaseUrl(process.env.DATABASE_URL);

  if (!databaseUrlConfigured) {
    return {
      version: "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3",
      generatedAt: new Date().toISOString(),
      databaseUrlConfigured: false,
      databaseReachable: false,
      environment: "unset",
      totalEncounters: null,
      encountersByType: null,
      totalActiveDiagnoses: null,
      activeDiagnosesByEncounterType: null,
      edDiagnosesExportable: null,
      pilotMinimumRows: PILOT_MINIMUM_ED_DIAGNOSIS_ROWS,
      meetsPilotThreshold: false,
      uniqueEdIcdCodes: null,
      edDiagnosisDateRange: null,
      warnings: ["DATABASE_URL is not configured."],
      recommendation:
        "Set DATABASE_URL to a read-only staging or restored dump connection, then re-run diagnose:ed-diagnosis-export.",
    };
  }

  try {
    const [totalEncounters, encounterGroups, totalActiveDiagnoses, diagnosisTypeRows, edCount, edIcdGroups, edDateBounds] =
      await Promise.all([
        prisma.encounter.count(),
        prisma.encounter.groupBy({ by: ["type"], _count: { _all: true } }),
        prisma.diagnosis.count({ where: { status: "ACTIVE" } }),
        prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
          SELECT e.type, COUNT(d.id)::bigint AS count
          FROM "Diagnosis" d
          INNER JOIN "Encounter" e ON e.id = d."encounterId"
          WHERE d.status = 'ACTIVE'
          GROUP BY e.type
        `,
        prisma.diagnosis.count({
          where: {
            status: "ACTIVE",
            encounter: { type: "EMERGENCY" },
          },
        }),
        prisma.diagnosis.groupBy({
          by: ["code"],
          where: {
            status: "ACTIVE",
            encounter: { type: "EMERGENCY" },
          },
          _count: { _all: true },
        }),
        prisma.diagnosis.aggregate({
          where: {
            status: "ACTIVE",
            encounter: { type: "EMERGENCY" },
          },
          _min: { createdAt: true },
          _max: { createdAt: true },
        }),
      ]);

    const encountersByType = Object.fromEntries(
      encounterGroups.map((g) => [g.type, g._count._all])
    );

    const activeDiagnosesByEncounterType = Object.fromEntries(
      diagnosisTypeRows.map((row) => [row.type, Number(row.count)])
    );

    const edDiagnosesExportable = edCount;
    const meetsPilotThreshold = edDiagnosesExportable >= PILOT_MINIMUM_ED_DIAGNOSIS_ROWS;
    const uniqueEdIcdCodes = edIcdGroups.length;

    if (edDiagnosesExportable < PILOT_MINIMUM_ED_DIAGNOSIS_ROWS) {
      warnings.push(
        `Only ${edDiagnosesExportable} ACTIVE EMERGENCY diagnoses available; need ${PILOT_MINIMUM_ED_DIAGNOSIS_ROWS} for limited pilot qualification.`
      );
    }

    const emergencyEncounters = encountersByType.EMERGENCY ?? 0;
    if (emergencyEncounters === 0) {
      warnings.push("No EMERGENCY encounters found — export will return zero rows.");
    } else if (edDiagnosesExportable < emergencyEncounters) {
      warnings.push(
        "Many EMERGENCY encounters have no ACTIVE diagnosis rows — ensure clinicians document diagnoses on ED charts."
      );
    }

    const urgentCareCount = encountersByType.URGENT_CARE ?? 0;
    if (urgentCareCount > 0 && edDiagnosesExportable < PILOT_MINIMUM_ED_DIAGNOSIS_ROWS) {
      warnings.push(
        `${urgentCareCount} URGENT_CARE encounters exist but are excluded from export (filter: EMERGENCY only).`
      );
    }

    const exportQuery = buildDiagnosisResolverShadowAuditQuery({
      encounterType: "EMERGENCY",
      limit: PILOT_MINIMUM_ED_DIAGNOSIS_ROWS,
    });
    if ((exportQuery.take ?? 0) < edDiagnosesExportable) {
      warnings.push(
        `Export query take=${exportQuery.take} — sufficient for pilot minimum; increase limit if exporting full history.`
      );
    }

    let recommendation: string;
    if (meetsPilotThreshold) {
      recommendation =
        "Database meets ≥500 ED diagnosis threshold. Run export:ed-diagnosis-shadow, then pilot qualification recheck.";
    } else if ((encountersByType.EMERGENCY ?? 0) > 0) {
      recommendation =
        "Current database is real but under volume. Prefer staging/production read-only with more ED traffic, or restore a larger staging dump locally. Do not use synthetic fallback for pilot qualification.";
    } else {
      recommendation =
        "Connect to an environment with EMERGENCY encounters and documented diagnoses, or restore a staging dump locally.";
    }

    return {
      version: "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3",
      generatedAt: new Date().toISOString(),
      databaseUrlConfigured: true,
      databaseReachable: true,
      environment,
      totalEncounters,
      encountersByType,
      totalActiveDiagnoses,
      activeDiagnosesByEncounterType,
      edDiagnosesExportable,
      pilotMinimumRows: PILOT_MINIMUM_ED_DIAGNOSIS_ROWS,
      meetsPilotThreshold,
      uniqueEdIcdCodes,
      edDiagnosisDateRange: {
        min: edDateBounds._min.createdAt?.toISOString().slice(0, 10) ?? null,
        max: edDateBounds._max.createdAt?.toISOString().slice(0, 10) ?? null,
      },
      warnings,
      recommendation,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      version: "MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.3",
      generatedAt: new Date().toISOString(),
      databaseUrlConfigured: true,
      databaseReachable: false,
      environment,
      totalEncounters: null,
      encountersByType: null,
      totalActiveDiagnoses: null,
      activeDiagnosesByEncounterType: null,
      edDiagnosesExportable: null,
      pilotMinimumRows: PILOT_MINIMUM_ED_DIAGNOSIS_ROWS,
      meetsPilotThreshold: false,
      uniqueEdIcdCodes: null,
      edDiagnosisDateRange: null,
      warnings: [message],
      recommendation:
        "Ensure PostgreSQL is reachable and DATABASE_URL points to staging read-only or a local restored dump.",
    };
  }
}

async function main() {
  const report = await runEdDiagnosisExportDiagnostic();
  console.log(JSON.stringify(report, null, 2));
  if (!report.databaseReachable || !report.meetsPilotThreshold) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  void main().finally(() => prisma.$disconnect());
}
