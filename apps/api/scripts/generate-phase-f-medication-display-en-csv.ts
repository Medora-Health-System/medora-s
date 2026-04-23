/**
 * Writes prisma/data/english-catalog/all-haiti-medications-display-name-en.csv from Haiti medication seeds.
 * Logic mirrors seed-haiti-medication-catalog (INN / US synonyms; never displayNameFr).
 *
 *   pnpm --filter @medora/api exec ts-node --transpile-only scripts/generate-phase-f-medication-display-en-csv.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { HaitiMedicationSeed } from "../prisma/data/haiti-medications";
import { HAITI_MEDICATION_CATALOG } from "../prisma/data/haiti-medications";
import { deriveMedicationCode } from "../prisma/helpers/seed-haiti-medication-catalog";

const OUT = resolve(__dirname, "../prisma/data/english-catalog/all-haiti-medications-display-name-en.csv");

function resolveDisplayNameEn(row: HaitiMedicationSeed): string | undefined {
  const explicit = row.displayNameEn?.trim();
  if (explicit) return explicit;
  const g = row.genericName.trim();
  const mapped: Record<string, string> = {
    Paracetamol: "Acetaminophen",
    Salbutamol: "Albuterol",
    Adrenaline: "Epinephrine",
    "Ringer Lactate": "Lactated Ringer's",
    "Normal Saline": "Normal saline",
    "Regular Insulin": "Insulin (regular)",
    "NPH Insulin": "NPH insulin",
    "Insulin 70/30": "Insulin 70/30",
  };
  if (mapped[g]) return mapped[g];
  if (/^[A-Za-z0-9][A-Za-z0-9\s+\-/&,']*$/.test(g)) return g;
  return undefined;
}

function escCsv(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function main() {
  mkdirSync(resolve(__dirname, "../prisma/data/english-catalog"), { recursive: true });
  /** Last seed row wins for duplicate derived codes (matches DB upsert semantics). */
  const byCode = new Map<string, string>();
  for (const row of HAITI_MEDICATION_CATALOG) {
    const code = row.code ?? deriveMedicationCode(row);
    const display_name_en = resolveDisplayNameEn(row) ?? row.genericName.trim();
    byCode.set(code, display_name_en);
  }
  const lines = ["code,display_name_en", ...[...byCode.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([c, en]) => `${escCsv(c)},${escCsv(en)}`)];
  writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${byCode.size} unique codes to ${OUT}`);
}

main();
