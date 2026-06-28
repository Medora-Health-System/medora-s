/**
 * Regenerates packages/shared/src/medication/haitiMedicationFormularyCatalog.ts
 * from apps/api/prisma/data/haiti-medications.ts (+ IVPB runtime supplement).
 *
 * Run: pnpm --filter @medora/shared build && node --experimental-strip-types packages/shared/scripts/generate-haiti-formulary-catalog-shared.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiDataDir = join(__dirname, "../../../apps/api/prisma/data");
const apiHelpersDir = join(__dirname, "../../../apps/api/prisma/helpers");
const outPath = join(__dirname, "../src/medication/haitiMedicationFormularyCatalog.ts");

async function loadCatalog() {
  const medsPath = pathToFileURL(join(apiDataDir, "haiti-medications.ts")).href;
  const supPath = pathToFileURL(join(apiDataDir, "haiti-ivpb-runtime-metadata-remediation.ts")).href;
  const helperPath = pathToFileURL(join(apiHelpersDir, "seed-haiti-medication-catalog.ts")).href;
  const { HAITI_MEDICATION_CATALOG } = await import(medsPath);
  const { HAITI_IVPB_RUNTIME_METADATA_REMEDIATION_SEEDS } = await import(supPath);
  const { deriveMedicationCode } = await import(helperPath);
  return {
    rows: [...HAITI_MEDICATION_CATALOG, ...HAITI_IVPB_RUNTIME_METADATA_REMEDIATION_SEEDS],
    deriveMedicationCode,
  };
}

function toFormularyRow(row, deriveMedicationCode) {
  const code = row.code ?? deriveMedicationCode(row);
  const obj = {
    code,
    genericName: row.genericName,
    displayNameFr: row.displayNameFr,
    strength: row.strength,
    dosageForm: row.dosageForm,
    route: row.route,
    therapeuticClass: row.therapeuticClass,
    isEssential: row.isEssential ?? false,
    isActive: row.isActive !== false,
    isControlled: row.isControlled ?? false,
    requiresWitness: row.requiresWitness ?? false,
    requiresDoubleSign: row.requiresDoubleSign ?? false,
    commonAliases: row.commonAliases ?? [],
  };
  if (row.displayNameEn?.trim()) obj.displayNameEn = row.displayNameEn.trim();
  if (row.controlledSchedule != null) obj.controlledSchedule = row.controlledSchedule;
  if (row.administrationType?.trim()) obj.administrationType = row.administrationType.trim();
  if (row.billingClass?.trim()) obj.billingClass = row.billingClass.trim();
  return obj;
}

async function main() {
  const { rows, deriveMedicationCode } = await loadCatalog();
  const byCode = new Map();
  for (const row of rows) {
    const code = row.code ?? deriveMedicationCode(row);
    if (byCode.has(code)) {
      console.warn(`[haiti-catalog-gen] duplicate code skipped: ${code}`);
      continue;
    }
    byCode.set(code, toFormularyRow(row, deriveMedicationCode));
  }
  const sorted = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
  const count = sorted.length;

  const lines = sorted.map((row) => {
    const json = JSON.stringify(row);
    return `  ${json} as HaitiMedicationFormularyRow,`;
  });

  const content = `/**
 * Haiti Phase 1 formulary source (${count} unique catalog codes).
 * Generated from apps/api/prisma/data/haiti-medications.ts — do not edit by hand.
 * Regenerate: node --experimental-strip-types packages/shared/scripts/generate-haiti-formulary-catalog-shared.mjs
 */
import type { HaitiMedicationFormularyRow } from "./haitiCanonicalMedicationLinkageTypes.js";

export const HAITI_MEDICATION_FORMULARY_EXPECTED_COUNT = ${count} as const;

export const HAITI_MEDICATION_FORMULARY_CATALOG: HaitiMedicationFormularyRow[] = [
${lines.join("\n")}
];
`;

  writeFileSync(outPath, content, "utf8");
  console.log(`[haiti-catalog-gen] wrote ${count} rows → ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
