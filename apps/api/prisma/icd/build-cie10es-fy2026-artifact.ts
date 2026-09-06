/**
 * Build a FY2026 CIE-10-ES licensed JSONL artifact from the Ministry workbook.
 * Does not write Prisma. Does not commit labels. Pediatric/sex markers are ignored.
 *
 *   pnpm --filter @medora/api run icd:build-cie10es-fy2026 -- \
 *     --es=/path/Diagnosticos_Tabla_Referencia_CIE10ES_2026.xlsx \
 *     --us=/path/icd10cm-order-2026.txt \
 *     --release=FY2026 \
 *     --out=/tmp/medora-p3f6-es/fy2026-es.jsonl \
 *     --missing-out=apps/api/prisma/icd/fy2026-es-missing-codes.json
 */
import { writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { mkdirSync } from "node:fs";
import {
  buildCie10esFy2026AllowSet,
  buildCie10esLicensedArtifactRecords,
  ICD10_CIE10ES_ARTIFACT_SHA256,
  ICD10_P3F3_ADVERSARIAL_CODES,
  inspectAdversarialCodes,
  type NationalSourceRow,
  type UsCatalogRow,
} from "@medora/shared";
import { parseIcd10CmReleaseFile } from "./parse-icd10-cm-release";
import { resolveIcd10CmReleaseManifest } from "./icd10-cm-release-manifest";
import { parseSpanishCie10EsXlsx, sha256File } from "./validate-icd10-national-sources";

export type BuildCie10esArgs = {
  es: string;
  us: string;
  release: string;
  out: string;
  missingOut: string;
  fy2027Us: string;
  expectedSha256: string;
  writeArtifact: boolean;
};

export function parseCie10esBuildArgs(argv: string[]): BuildCie10esArgs {
  let es = "";
  let us = "";
  let release = "";
  let out = "";
  let missingOut = "";
  let fy2027Us = "";
  let expectedSha256 = ICD10_CIE10ES_ARTIFACT_SHA256;
  let writeArtifact = true;
  for (const arg of argv) {
    if (arg === "--dry-run") writeArtifact = false;
    else if (arg.startsWith("--es=")) es = arg.slice("--es=".length).trim();
    else if (arg.startsWith("--us=")) us = arg.slice("--us=".length).trim();
    else if (arg.startsWith("--release=")) release = arg.slice("--release=".length).trim();
    else if (arg.startsWith("--out=")) out = arg.slice("--out=".length).trim();
    else if (arg.startsWith("--missing-out=")) missingOut = arg.slice("--missing-out=".length).trim();
    else if (arg.startsWith("--fy2027-us=")) fy2027Us = arg.slice("--fy2027-us=".length).trim();
    else if (arg.startsWith("--expected-sha256=")) expectedSha256 = arg.slice("--expected-sha256=".length).trim();
  }
  return { es, us, release, out, missingOut, fy2027Us, expectedSha256, writeArtifact };
}

function usRowsFromOrder(file: string): UsCatalogRow[] {
  const parsed = parseIcd10CmReleaseFile(file);
  return parsed.rows.map((row) => ({
    code: row.code,
    normalizedCode: row.normalizedCode,
    label: row.shortDescription,
    selectable: row.isSelectable && row.isBillable,
  }));
}

function printGate(gate: Record<string, string | number | boolean>): void {
  for (const [key, value] of Object.entries(gate)) {
    console.log(`${key}=${value === true ? "YES" : value === false ? "NO" : String(value)}`);
  }
}

function compareReleaseIntersection(usRows: readonly UsCatalogRow[], esFinales: readonly NationalSourceRow[]) {
  return buildCie10esFy2026AllowSet({
    usRows,
    esFinales,
    sourceSha256: ICD10_CIE10ES_ARTIFACT_SHA256,
    expectedSha256: ICD10_CIE10ES_ARTIFACT_SHA256,
    expectedRelease: "FY2026",
    expectedUsSelectable: usRows.filter((row) => row.selectable).length,
  });
}

export function runCie10esFy2026Build(args: BuildCie10esArgs): {
  gatePass: boolean;
  allowed: number;
  missing: number;
  fy2027?: {
    selectable: number;
    intersection: number;
    missing: number;
    sourceOnly: number;
    headerCollisions: number;
  };
} {
  const started = Date.now();
  if (!args.es || !args.us || !args.release) {
    throw new Error("Usage: --es=...xlsx --us=...order.txt --release=FY2026 [--out=...] [--missing-out=...] [--fy2027-us=...]");
  }
  if (args.release !== "FY2026") {
    throw new Error("CIE-10-ES 2026 may only be ingested against --release=FY2026. FY2027 is analysis-only.");
  }
  const manifest = resolveIcd10CmReleaseManifest(args.release);
  const sha256 = sha256File(args.es);
  const parseStarted = Date.now();
  const spanish = parseSpanishCie10EsXlsx(args.es);
  const parseMs = Date.now() - parseStarted;
  const usStarted = Date.now();
  const usRows = usRowsFromOrder(args.us);
  const usMs = Date.now() - usStarted;
  const validationStarted = Date.now();
  const allow = buildCie10esFy2026AllowSet({
    usRows,
    esFinales: spanish.finales,
    sourceSha256: sha256,
    expectedSha256: args.expectedSha256,
    expectedRelease: args.release,
    expectedUsSelectable: manifest.expectedBillableRows,
  });
  const validationMs = Date.now() - validationStarted;
  console.log(`SOURCE=${basename(args.es)}`);
  console.log(`SOURCE_SHA256=${sha256}`);
  console.log(`SOURCE_EDITION=CIE-10-ES Diagnósticos 6ª edición 2026`);
  console.log(`SOURCE_UNDERLYING_US_RELEASE=FY2025`);
  console.log(`PARSE_TIME_MS=${parseMs}`);
  console.log(`US_PARSE_TIME_MS=${usMs}`);
  console.log(`VALIDATION_TIME_MS=${validationMs}`);
  console.log(`FY2026_ES_FINAL_ROWS=${spanish.finales.filter((row) => row.terminal).length}`);
  console.log(`FY2026_ES_ALLOWED=${allow.allowed.length}`);
  console.log(`FY2026_ES_HEADER_EXCLUDED=${allow.headerExcluded.length}`);
  console.log(`FY2026_ES_SOURCE_ONLY_EXCLUDED=${allow.sourceOnlyExcluded.length}`);
  console.log(`FY2026_ES_INVALID=${allow.invalidCodes}`);
  console.log(`FY2026_ES_DUPLICATES=${allow.duplicates}`);
  console.log(`FY2026_ES_BLANK_LABELS=${allow.blankLabels}`);
  printGate(allow.gate);
  console.log(`ES_HEADER_CODES=${allow.headerExcluded.join(",")}`);
  console.log(`ES_SOURCE_ONLY_CODES=${allow.sourceOnlyExcluded.join(",")}`);

  const usByNorm = new Map(usRows.map((row) => [row.normalizedCode, row]));
  const esByNorm = new Map(spanish.finales.filter((row) => row.terminal).map((row) => [row.normalizedCode, row]));
  const matrix = inspectAdversarialCodes({
    queries: ICD10_P3F3_ADVERSARIAL_CODES,
    usByNormalized: usByNorm,
    sourceByNormalized: esByNorm,
  });
  for (const row of matrix) {
    console.log(
      `ADV ${row.query} class=${row.classification} usSelectable=${row.usSelectable} es=${row.sourceExists} notes=${row.notes.join("|")}`,
    );
  }

  if (args.missingOut) {
    mkdirSync(dirname(args.missingOut), { recursive: true });
    const familyCounts: Record<string, number> = {};
    for (const row of allow.missingUsSelectable) {
      familyCounts[row.family] = (familyCounts[row.family] ?? 0) + 1;
    }
    writeFileSync(
      args.missingOut,
      `${JSON.stringify(
        {
          release: "FY2026",
          reason: "FY2026_SELECTABLE_ABSENT_FROM_CIE10ES_2026_FINALES",
          officialNewerEsSourceFound: false,
          count: allow.missingUsSelectable.length,
          familyCounts,
          codes: allow.missingUsSelectable,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`FY2026_ES_MISSING_FILE=${basename(args.missingOut)}`);
    console.log(`FY2026_ES_MISSING=${allow.missingUsSelectable.length}`);
  }

  if (args.writeArtifact) {
    if (!args.out) throw new Error("Missing --out=/path/to/fy2026-es.jsonl");
    if (!allow.gate.PASS) {
      throw new Error("ADMISSION_GATE_FAILED: refusing to write Spanish terminology artifact");
    }
    mkdirSync(dirname(args.out), { recursive: true });
    const records = buildCie10esLicensedArtifactRecords(allow.allowed, args.release);
    writeFileSync(args.out, `${records.map((row) => JSON.stringify(row)).join("\n")}\n`);
    console.log(`ARTIFACT_OUT=${args.out}`);
    console.log(`ARTIFACT_ROWS=${records.length}`);
  } else {
    console.log("ARTIFACT_OUT=(dry-run, not written)");
  }

  let fy2027:
    | {
        selectable: number;
        intersection: number;
        missing: number;
        sourceOnly: number;
        headerCollisions: number;
      }
    | undefined;
  if (args.fy2027Us) {
    const fy2027Rows = usRowsFromOrder(args.fy2027Us);
    const compared = compareReleaseIntersection(fy2027Rows, spanish.finales);
    fy2027 = {
      selectable: fy2027Rows.filter((row) => row.selectable).length,
      intersection: compared.allowed.length,
      missing: compared.missingUsSelectable.length,
      sourceOnly: compared.sourceOnlyExcluded.length,
      headerCollisions: compared.headerExcluded.length,
    };
    console.log(`FY2027_SELECTABLE=${fy2027.selectable}`);
    console.log(`FY2027_ES_EXACT_INTERSECTION=${fy2027.intersection}`);
    console.log(`FY2027_ES_MISSING=${fy2027.missing}`);
    console.log(`FY2027_ES_SOURCE_ONLY=${fy2027.sourceOnly}`);
    console.log(`FY2027_ES_HEADER_COLLISIONS=${fy2027.headerCollisions}`);
    console.log("FY2027_ES_INGEST=NO");
  }

  console.log(`BUILD_ELAPSED_MS=${Date.now() - started}`);
  console.log(`OFFICIAL_NEWER_ES_SOURCE_FOUND=NO`);
  console.log(`ES_FULL_74719_SOURCE_AVAILABLE=NO`);
  return {
    gatePass: allow.gate.PASS,
    allowed: allow.allowed.length,
    missing: allow.missingUsSelectable.length,
    fy2027,
  };
}

function main() {
  const args = parseCie10esBuildArgs(process.argv.slice(2));
  const result = runCie10esFy2026Build(args);
  if (!result.gatePass) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

