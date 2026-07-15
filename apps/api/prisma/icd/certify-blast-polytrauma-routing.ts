/**
 * Routing certification for blast injury / polytrauma codes.
 *
 * pnpm --filter @medora/api icd:routing:blast-polytrauma -- --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectBlastPolytraumaScopedCodes } from "./icd10-blast-polytrauma-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");

/** Mirrors Phase 7 blast/polytrauma family ownership. */
const BLAST_POLYTRAUMA_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_blast_ear", prefixes: ["S09.2", "T70.0", "H83.3"] },
  { family: "trauma_blast_lung", prefixes: ["T70.1", "T70.8", "T70.9"] },
  { family: "trauma_blast_collapse", prefixes: ["T71.21"] },
  { family: "trauma_polytrauma", prefixes: ["T07", "T79.4"] },
  // External cause codes remain mechanism context and route to the bounded minor template.
  { family: "trauma_blast_minor", prefixes: ["W35", "W36", "W37", "W38", "W39", "W40", "X75", "X96", "Y25", "Y35", "Y36", "Y37", "Y38", "V"] },
];
const GENERIC_TRAUMA_PREFIXES = ["S", "T14"];
const GENERIC_WOUND_PREFIXES = ["S01", "S41", "S51", "S61", "S71", "S81", "S91"];
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
  families = BLAST_POLYTRAUMA_DISCHARGE_PREFIXES,
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

  const scopedCodes = selectBlastPolytraumaScopedCodes(validation.parse.rows, { billableOnly: true });
  const allBlastPrefixes = BLAST_POLYTRAUMA_DISCHARGE_PREFIXES.flatMap((entry) => entry.prefixes);
  const fallbacks: string[] = [];
  const genericWoundSteals: string[] = [];
  const genericTraumaSteals: string[] = [];
  const symptomSteals: string[] = [];

  for (const row of scopedCodes) {
    const blastFamily = bestFamily(row.code);
    const woundLen = bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES);
    const blastLen = bestPrefixLen(row.code, allBlastPrefixes);
    if (!blastFamily) {
      fallbacks.push(row.code);
      continue;
    }
    if (bestPrefixLen(row.code, GENERIC_TRAUMA_PREFIXES) > blastLen) genericTraumaSteals.push(row.code);
    if (woundLen > blastLen) genericWoundSteals.push(row.code);
    if (bestPrefixLen(row.code, GENERIC_SYMPTOM_PREFIXES) > blastLen) symptomSteals.push(row.code);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    blastPolytraumaScoped: scopedCodes.length,
    blastPolytraumaUnexplainedFallbacks: fallbacks.length,
    blastPolytraumaStolenByGenericTrauma: genericTraumaSteals.length,
    blastPolytraumaStolenByGenericWound: genericWoundSteals.length,
    blastPolytraumaStolenBySymptoms: symptomSteals.length,
    fallbackSample: fallbacks.slice(0, 25),
    genericWoundStealSample: genericWoundSteals.slice(0, 25),
    genericTraumaStealSample: genericTraumaSteals.slice(0, 25),
    symptomStealSample: symptomSteals.slice(0, 25),
    pass:
      fallbacks.length === 0 &&
      genericWoundSteals.length === 0 &&
      genericTraumaSteals.length === 0 &&
      symptomSteals.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));

  const summary = JSON.stringify(report, null, 2);
  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(join(summaryDir, "fy2026-blast-polytrauma-routing-summary.json"), summary);
  const releaseSummaryDir = join(summaryDir, String(validation.manifest.releaseYear));
  mkdirSync(releaseSummaryDir, { recursive: true });
  writeFileSync(join(releaseSummaryDir, "fy2026-blast-polytrauma-routing-summary.json"), summary);
  process.exit(report.pass ? 0 : 2);
}

main();
