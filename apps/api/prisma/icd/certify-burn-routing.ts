/**
 * Routing certification for burn / frostbite / electrical / sunburn codes.
 *
 * pnpm --filter @medora/api icd:routing:burns -- --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectBurnScopedCodes } from "./icd10-burn-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");

/** Mirrors planned web burn discharge family prefixes. */
const BURN_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_burn_frostbite", prefixes: ["T33", "T34", "T35"] },
  { family: "trauma_burn_inhalation", prefixes: ["T27"] },
  { family: "trauma_burn_eye", prefixes: ["T26"] },
  { family: "trauma_burn_chemical", prefixes: ["T20.4", "T20.5", "T20.6", "T20.7", "T21.4", "T21.5", "T21.6", "T21.7", "T22.4", "T22.5", "T22.6", "T22.7", "T23.4", "T23.5", "T23.6", "T23.7", "T24.4", "T24.5", "T24.6", "T24.7", "T25.4", "T25.5", "T25.6", "T25.7", "T26.4", "T26.5", "T26.6", "T26.7", "T27.4", "T27.5", "T27.6", "T27.7", "T28.4", "T28.5", "T28.6", "T28.7", "T32"] },
  { family: "trauma_burn_electrical", prefixes: ["T75.0", "T75.4"] },
  { family: "trauma_burn_sunburn", prefixes: ["L55"] },
  { family: "trauma_burn_face", prefixes: ["T20.0", "T20.1", "T20.2", "T20.3"] },
  { family: "trauma_burn_hand", prefixes: ["T23.0", "T23.1", "T23.2", "T23.3"] },
  { family: "trauma_burn_foot", prefixes: ["T25.0", "T25.1", "T25.2", "T25.3"] },
  { family: "trauma_burn_full_thickness", prefixes: ["T21.3", "T22.3", "T24.3", "T28.3", "T30.3"] },
  { family: "trauma_burn_partial_thickness", prefixes: ["T21.2", "T22.2", "T24.2", "T30.2"] },
  { family: "trauma_burn_superficial", prefixes: ["T21.1", "T22.1", "T24.1", "T30.0", "T30.1"] },
  { family: "trauma_burn_generic", prefixes: ["T21", "T22", "T24", "T28", "T30", "T31"] },
];
const GENERIC_WOUND_PREFIXES = ["S01", "S41", "S51", "S61", "S71", "S81", "S91", "T14"];
const GENERIC_RESPIRATORY_PREFIXES = ["J00", "J06", "J20", "J40", "J44", "J45", "J96"];
const GENERIC_EXPOSURE_PREFIXES = ["T51", "T52", "T53", "T54", "T55", "T56", "T57", "T58", "T59", "T65"];

function bestPrefixLen(code: string, prefixes: string[]): number {
  const normalized = n(code);
  return prefixes.reduce((best, prefix) => (normalized.startsWith(n(prefix)) ? Math.max(best, n(prefix).length) : best), 0);
}
function bestFamily(code: string): string | null {
  const normalized = n(code);
  let best: { family: string; length: number } | null = null;
  for (const entry of BURN_DISCHARGE_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (normalized.startsWith(n(prefix)) && (!best || length > best.length)) best = { family: entry.family, length };
    }
  }
  return best?.family ?? null;
}

function main() {
  const file = getArg("file");
  const release = getArg("release") ?? "2026";
  if (!file) {
    console.error("Missing --file");
    process.exit(1);
  }
  const validation = validateIcd10CmRelease({ file, release, allowDevSample: hasFlag("allow-dev-sample"), skipChecksum: hasFlag("skip-checksum") });
  if (!validation.ok || !validation.parse) {
    console.error("Validation failed");
    process.exit(1);
  }
  const burnCodes = selectBurnScopedCodes(validation.parse.rows, { billableOnly: true });
  const fallbacks = burnCodes.filter((row) => !bestFamily(row.code)).map((row) => row.code);
  const burnPrefixList = BURN_DISCHARGE_PREFIXES.flatMap((entry) => entry.prefixes);
  const genericWoundSteals = burnCodes
    .filter((row) => bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES) > bestPrefixLen(row.code, burnPrefixList))
    .map((row) => row.code);
  const respiratorySteals = burnCodes
    .filter(
      (row) =>
        n(row.code).startsWith("T27") &&
        bestPrefixLen(row.code, GENERIC_RESPIRATORY_PREFIXES) >= bestPrefixLen(row.code, ["T27"])
    )
    .map((row) => row.code);
  const chemicalSteals = burnCodes
    .filter((row) => {
      const family = bestFamily(row.code);
      if (family !== "trauma_burn_chemical") return false;
      return bestPrefixLen(row.code, GENERIC_EXPOSURE_PREFIXES) > bestPrefixLen(row.code, burnPrefixList);
    })
    .map((row) => row.code);
  const frostbiteSteals = burnCodes
    .filter((row) => n(row.code).startsWith("T33") || n(row.code).startsWith("T34") || n(row.code).startsWith("T35"))
    .filter((row) => bestFamily(row.code) !== "trauma_burn_frostbite")
    .map((row) => row.code);
  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    burnScoped: burnCodes.length,
    burnUnexplainedFallbacks: fallbacks.length,
    burnStolenByGenericWound: genericWoundSteals.length,
    inhalationStolenByGenericRespiratory: respiratorySteals.length,
    chemicalStolenByGenericExposure: chemicalSteals.length,
    frostbiteStolenByGenericFamily: frostbiteSteals.length,
    burnFallbackSample: fallbacks.slice(0, 25),
    pass:
      fallbacks.length === 0 &&
      genericWoundSteals.length === 0 &&
      respiratorySteals.length === 0 &&
      chemicalSteals.length === 0 &&
      frostbiteSteals.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(join(summaryDir, "fy2026-burn-routing-summary.json"), JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
