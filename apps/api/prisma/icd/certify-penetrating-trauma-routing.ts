/**
 * Routing certification for penetrating trauma codes.
 *
 * pnpm --filter @medora/api icd:routing:penetrating-trauma -- --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectPenetratingTraumaScopedCodes } from "./icd10-penetrating-trauma-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");

/** Mirrors planned web penetrating-trauma discharge condition family prefixes. */
const PENETRATING_TRAUMA_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  // S05.4 is penetrating orbit injury; it is selected by the required S05
  // description scope alongside the specified penetrating-eyeball families.
  { family: "trauma_penetrating_eye", prefixes: ["S05.4", "S05.50", "S05.51", "S05.52", "S05.5", "S05.6"] },
  { family: "trauma_penetrating_chest", prefixes: ["S21.1", "S21.2", "S21.3", "S21.4", "S25", "S26", "S27"] },
  { family: "trauma_penetrating_abdomen", prefixes: ["S31.0", "S31.1", "S31.5", "S31.6", "S31.8", "S35", "S36", "S37"] },
  { family: "trauma_penetrating_neck", prefixes: ["S11.0", "S11.1", "S11.2", "S11.8", "S11.9", "S15"] },
  { family: "trauma_penetrating_head", prefixes: ["S01.0", "S01.1", "S01.2", "S01.3", "S01.4", "S01.5", "S01.8", "S01.9"] },
  // S65/S95 complete the vessel scope, using the same anatomic discharge families.
  { family: "trauma_penetrating_hand", prefixes: ["S61.0", "S61.1", "S61.2", "S61.3", "S61.4", "S61.5", "S65"] },
  { family: "trauma_penetrating_foot", prefixes: ["S91.0", "S91.1", "S91.2", "S91.3", "S95"] },
  { family: "trauma_penetrating_upper_extremity", prefixes: ["S41.0", "S41.1", "S51.0", "S51.8", "S45", "S55"] },
  { family: "trauma_penetrating_lower_extremity", prefixes: ["S71.0", "S71.1", "S81.0", "S81.8", "S75", "S85"] },
  {
    family: "trauma_penetrating_minor",
    prefixes: ["S11", "S21", "S31"],
  },
];
const GENERIC_WOUND_PREFIXES = ["S01", "S41", "S51", "S61", "S71", "S81", "S91", "T14"];
const GENERIC_FOREIGN_BODY_PREFIXES = ["T15", "T16", "T17", "T18", "T19"];
const GENERIC_SYMPTOM_PREFIXES = ["R07", "R10", "J06"];

function bestPrefixLen(code: string, prefixes: string[]): number {
  const normalized = n(code);
  return prefixes.reduce((best, prefix) => {
    const normalizedPrefix = n(prefix);
    return normalized.startsWith(normalizedPrefix) ? Math.max(best, normalizedPrefix.length) : best;
  }, 0);
}
function bestFamily(
  code: string,
  families = PENETRATING_TRAUMA_DISCHARGE_PREFIXES,
): { family: string; length: number } | null {
  const normalized = n(code);
  let best: { family: string; length: number } | null = null;
  for (const entry of families) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (normalized.startsWith(n(prefix)) && (!best || length > best.length)) {
        best = { family: entry.family, length };
      }
    }
  }
  return best;
}

function main() {
  const file = getArg("file");
  const release = getArg("release") ?? "2026";
  if (!file) {
    console.error("Missing --file");
    process.exit(1);
  }
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: hasFlag("allow-dev-sample"),
    skipChecksum: hasFlag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    console.error("Validation failed");
    process.exit(1);
  }

  const scopedCodes = selectPenetratingTraumaScopedCodes(validation.parse.rows, { billableOnly: true });
  const allPenetratingPrefixes = PENETRATING_TRAUMA_DISCHARGE_PREFIXES.flatMap((entry) => entry.prefixes);
  const fallbacks: string[] = [];
  const genericWoundSteals: string[] = [];
  const foreignBodySteals: string[] = [];
  const symptomSteals: string[] = [];

  for (const row of scopedCodes) {
    const penFamily = bestFamily(row.code);
    const woundLen = bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES);
    const penLen = bestPrefixLen(row.code, allPenetratingPrefixes);
    if (!penFamily) {
      fallbacks.push(row.code);
      continue;
    }
    // Scoped-code privilege: a penetrating family owns an equal-length wound prefix
    // (for example, S61 puncture wounds), preventing registry iteration-order steals.
    if (woundLen > penLen) genericWoundSteals.push(row.code);
    if (bestPrefixLen(row.code, GENERIC_FOREIGN_BODY_PREFIXES) > penLen) foreignBodySteals.push(row.code);
    if (bestPrefixLen(row.code, GENERIC_SYMPTOM_PREFIXES) > penLen) symptomSteals.push(row.code);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    penetratingTraumaScoped: scopedCodes.length,
    penetratingTraumaUnexplainedFallbacks: fallbacks.length,
    penetratingTraumaStolenByGenericWound: genericWoundSteals.length,
    penetratingTraumaStolenByForeignBody: foreignBodySteals.length,
    penetratingTraumaStolenBySymptoms: symptomSteals.length,
    approvedForeignBodySteals: [] as string[],
    fallbackSample: fallbacks.slice(0, 25),
    genericWoundStealSample: genericWoundSteals.slice(0, 25),
    foreignBodyStealSample: foreignBodySteals.slice(0, 25),
    symptomStealSample: symptomSteals.slice(0, 25),
    pass:
      fallbacks.length === 0 &&
      genericWoundSteals.length === 0 &&
      foreignBodySteals.length === 0 &&
      symptomSteals.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));

  const summary = JSON.stringify(report, null, 2);
  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(join(summaryDir, "fy2026-penetrating-trauma-routing-summary.json"), summary);
  const releaseSummaryDir = join(summaryDir, String(validation.manifest.releaseYear));
  mkdirSync(releaseSummaryDir, { recursive: true });
  writeFileSync(join(releaseSummaryDir, "fy2026-penetrating-trauma-routing-summary.json"), summary);
  process.exit(report.pass ? 0 : 2);
}

main();
