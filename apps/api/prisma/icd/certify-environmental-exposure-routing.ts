/**
 * Routing certification for environmental-exposure ICD codes (Phase 15).
 * Asserts every scoped code routes to a dedicated environmental-exposure
 * discharge family (no silent generic steal) and that cross-phase dual-lists
 * (frostbite w/ burn, lightning/electrocution w/ burn, barotrauma w/ blast)
 * remain intentional rather than regressed.
 *
 *   pnpm --filter @medora/api icd:routing:environmental-exposure -- \
 *     --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectAltitudeDivingScopedCodes,
  selectColdIllnessScopedCodes,
  selectElectricalLightningScopedCodes,
  selectEnvironmentalExposureScopedCodes,
  selectFrostbiteScopedCodes,
  selectHeatIllnessScopedCodes,
  selectRadiationScopedCodes,
  selectSubmersionScopedCodes,
} from "./icd10-environmental-exposure-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");
const starts = (code: string, prefix: string) => n(code).startsWith(n(prefix));

/** Dedicated environmental-exposure discharge families (mirrors apps/web discharge condition families). */
const ENV_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "env_heat_illness", prefixes: ["T67", "X30", "W92", "X32"] },
  { family: "env_cold_illness", prefixes: ["T68", "T69", "X31", "W93"] },
  { family: "env_frostbite_dual", prefixes: ["T33", "T34", "T35"] },
  { family: "env_submersion", prefixes: ["T75.1", "W65", "W67", "W69", "W73", "W74"] },
  { family: "env_lightning", prefixes: ["T75.0"] },
  { family: "env_electrocution", prefixes: ["T75.4"] },
  { family: "env_electrical_external", prefixes: ["W85", "W86"] },
  { family: "env_altitude", prefixes: ["T70.2"] },
  { family: "env_decompression", prefixes: ["T70.3"] },
  { family: "env_pressure_diving_other_dual", prefixes: ["T70.4", "T70.8", "T70.9"] },
  { family: "env_barotrauma_ent_blast_dual", prefixes: ["T70.0", "T70.1"] },
  { family: "env_radiation", prefixes: ["T66", "W88", "W89", "W90"] },
];

/** Generic fever/symptom codes that must never be miscoded as heat-illness ownership. */
const FEVER_SYMPTOM_PREFIXES = ["R50"];
/** Generic thermal burn range — must never steal frostbite ownership from the dual-list. */
const GENERIC_BURN_PREFIXES = ["T20", "T21", "T22", "T23", "T24", "T25", "T26", "T27", "T28", "T30", "T31", "T32"];
/** Generic S/T trauma catch-all that must never outrank a dedicated env family. */
const GENERIC_TRAUMA_PREFIXES = ["S", "T14"];
/** Toxicology-owned carbon monoxide code — must never appear inside env scope (Phase 16). */
const TOXICOLOGY_PREFIXES = ["T58"];
/** Blast/polytrauma explosion mechanism prefixes — radiation must never collide with these. */
const BLAST_EXPLOSION_PREFIXES = ["W35", "W36", "W37", "W38", "W39", "W40"];

function bestPrefixLen(code: string, prefixes: string[]): number {
  return prefixes.reduce((best, prefix) => {
    const pn = n(prefix);
    return n(code).startsWith(pn) ? Math.max(best, pn.length) : best;
  }, 0);
}
function bestFamily(code: string): { family: string; length: number } | null {
  let best: { family: string; length: number } | null = null;
  for (const entry of ENV_DISCHARGE_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (n(code).startsWith(n(prefix)) && (!best || length > best.length)) {
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
    for (const e of validation.errors) console.error(`- ${e}`);
    process.exit(1);
  }

  const rows = validation.parse.rows;
  const scoped = selectEnvironmentalExposureScopedCodes(rows, { billableOnly: true });
  const heatOwned = selectHeatIllnessScopedCodes(rows, { billableOnly: true });
  const coldOwned = selectColdIllnessScopedCodes(rows, { billableOnly: true });
  const frostbiteOwned = selectFrostbiteScopedCodes(rows, { billableOnly: true });
  const submersionOwned = selectSubmersionScopedCodes(rows, { billableOnly: true });
  const electricalLightningOwned = selectElectricalLightningScopedCodes(rows, { billableOnly: true });
  const altitudeDivingOwned = selectAltitudeDivingScopedCodes(rows, { billableOnly: true });
  const radiationOwned = selectRadiationScopedCodes(rows, { billableOnly: true });

  // 1. Every scoped code must land in a dedicated environmental-exposure family.
  const allEnvPrefixes = ENV_DISCHARGE_PREFIXES.flatMap((entry) => entry.prefixes);
  const unexplainedRoutingFallbacks = scoped.filter((row) => !bestFamily(row.code)).map((row) => row.code);

  // 2. Fever (R50) must never appear inside heat-illness ownership.
  const feverHeatCrossRouting = heatOwned
    .filter((row) => FEVER_SYMPTOM_PREFIXES.some((p) => starts(row.code, p)))
    .map((row) => row.code);

  // 3. Frostbite dual-list must remain intact, and generic thermal burn (T20-T32) must never
  //    claim frostbite ownership.
  const frostbiteDualListIntact = frostbiteOwned.length > 0;
  const burnFrostbiteStealing = frostbiteOwned
    .filter((row) => GENERIC_BURN_PREFIXES.some((p) => starts(row.code, p)))
    .map((row) => row.code);

  // 4. Electrical/lightning mechanism must not fall back to the generic S/T trauma catch-all.
  const traumaMechanismLoss = electricalLightningOwned
    .filter((row) => bestPrefixLen(row.code, GENERIC_TRAUMA_PREFIXES) > bestPrefixLen(row.code, allEnvPrefixes))
    .map((row) => row.code);

  // 5. Submersion (T75.1 + drowning external causes) must keep its dedicated family and never
  //    fall back to the generic trauma catch-all.
  const submersionProvenanceLoss = submersionOwned
    .filter((row) => !bestFamily(row.code) || bestFamily(row.code)?.family !== "env_submersion")
    .map((row) => row.code);

  // 6. Altitude (T70.2) and decompression (T70.3) must be present — a busy ED must never lose
  //    high-altitude/dive-related coding to under-routing.
  const altitudeUnderRouting = altitudeDivingOwned.some((row) => starts(row.code, "T70.2")) ? [] : ["T70.2"];
  const divingUnderRouting = altitudeDivingOwned.some((row) => starts(row.code, "T70.3")) ? [] : ["T70.3"];

  // 7. Radiation must never collide with blast/explosion external-cause mechanism codes.
  const radiationExposureInjuryCollision = radiationOwned
    .filter((row) => BLAST_EXPLOSION_PREFIXES.some((p) => starts(row.code, p)))
    .map((row) => row.code);

  // 8. Toxicology (T58 carbon monoxide) must never appear in environmental-exposure scope —
  //    left for a future toxicology-scoped certifier (Phase 16).
  const toxicologyOwnershipCollision = scoped
    .filter((row) => TOXICOLOGY_PREFIXES.some((p) => starts(row.code, p)))
    .map((row) => row.code);

  // 9. ENT/blast barotrauma dual-list must be explicitly flagged (positive assertion, not a
  //    steal): T70.0/T70.1 remain ENT/blast-owned context, included here for coverage only.
  const entBarotraumaFlagged = altitudeDivingOwned
    .filter((row) => starts(row.code, "T70.0") || starts(row.code, "T70.1"))
    .map((row) => row.code);

  // 10. Blast dual-list carve for T70.8/T70.9 must also be explicitly flagged.
  const blastPressureDualListFlagged = altitudeDivingOwned
    .filter((row) => starts(row.code, "T70.8") || starts(row.code, "T70.9"))
    .map((row) => row.code);

  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    environmentalExposureScoped: scoped.length,
    buckets: {
      heatIllness: heatOwned.length,
      coldIllness: coldOwned.length,
      frostbite: frostbiteOwned.length,
      submersion: submersionOwned.length,
      electricalLightning: electricalLightningOwned.length,
      altitudeDiving: altitudeDivingOwned.length,
      radiation: radiationOwned.length,
    },
    unexplainedRoutingFallbacks,
    feverHeatCrossRouting,
    frostbiteDualListIntact,
    burnFrostbiteStealing,
    traumaMechanismLoss,
    submersionProvenanceLoss,
    altitudeUnderRouting,
    divingUnderRouting,
    radiationExposureInjuryCollision,
    toxicologyOwnershipCollision,
    entBarotraumaFlagged,
    blastPressureDualListFlagged,
    pass: false,
  };

  report.pass =
    report.unexplainedRoutingFallbacks.length === 0 &&
    report.feverHeatCrossRouting.length === 0 &&
    report.frostbiteDualListIntact &&
    report.burnFrostbiteStealing.length === 0 &&
    report.traumaMechanismLoss.length === 0 &&
    report.submersionProvenanceLoss.length === 0 &&
    report.altitudeUnderRouting.length === 0 &&
    report.divingUnderRouting.length === 0 &&
    report.radiationExposureInjuryCollision.length === 0 &&
    report.toxicologyOwnershipCollision.length === 0 &&
    report.entBarotraumaFlagged.length > 0 &&
    report.blastPressureDualListFlagged.length > 0;

  const summary = JSON.stringify(report, null, 2);
  console.log(summary);

  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(join(summaryDir, "fy2026-environmental-exposure-routing-summary.json"), summary);
  const releaseSummaryDir = join(summaryDir, String(validation.manifest.releaseYear));
  mkdirSync(releaseSummaryDir, { recursive: true });
  writeFileSync(join(releaseSummaryDir, "fy2026-environmental-exposure-routing-summary.json"), summary);

  process.exit(report.pass ? 0 : 2);
}

main();
