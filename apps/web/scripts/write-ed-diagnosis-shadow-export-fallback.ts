/**
 * MEDUI.ED.DISCHARGE.REAL_WORLD_PARITY_VALIDATION.2
 * Writes tooling fallback export when database is unavailable locally.
 *
 * Usage:
 *   pnpm --filter @medora/web exec ts-node --transpile-only scripts/write-ed-diagnosis-shadow-export-fallback.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  buildEdDiagnosisShadowAuditExportFileFromRows,
} from "../src/features/emergency/providerDischargeRealWorldPilotQualification";
import { buildRealWorldEdTrafficRows } from "../src/features/emergency/providerDischargeRealWorldParityValidation";
import type { RealEncounterDiagnosisExportRow } from "../src/features/emergency/providerDischargeRealWorldParityValidation";

const outputPath = join(process.cwd(), "..", "..", "exports", "ed-diagnosis-shadow-audit.json");
const rows: RealEncounterDiagnosisExportRow[] = buildRealWorldEdTrafficRows(520).map((r) => ({
  diagnosisCode: r.diagnosisCode,
  diagnosisDescription: r.diagnosisLabel,
  encounterType: "ED" as const,
  patientAgeYears: r.patientAgeYears,
  patientSex: ((): RealEncounterDiagnosisExportRow["patientSex"] => {
    if (r.patientSex === "female" || r.patientSex === "male" || r.patientSex === "unknown") {
      return r.patientSex;
    }
    return undefined;
  })(),
  encounterDate: r.createdAt?.slice(0, 10) ?? "2026-03-01",
}));

const payload = buildEdDiagnosisShadowAuditExportFileFromRows(rows, {
  exportSource: "synthetic_tooling_fallback",
  databaseAvailable: false,
  environment: "local_no_database",
  note: "DATABASE_UNAVAILABLE_LOCALLY — run pnpm --filter @medora/api run export:ed-diagnosis-shadow when DB is available for real traffic qualification.",
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
console.log(JSON.stringify({ ok: true, outputPath, totalRows: payload.meta.totalRows, exportSource: payload.meta.exportSource }));
