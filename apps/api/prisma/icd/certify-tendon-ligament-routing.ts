/**
 * Routing certification for tendon/ligament selectable codes vs discharge-family prefixes.
 * Compares official scoped codes to Medora discharge family ICD prefixes (no silent generic steal).
 *
 *   pnpm --filter @medora/api exec ts-node --transpile-only prisma/icd/certify-tendon-ligament-routing.ts \
 *     --file=/path/to/zip --release=2026
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";
import {
  LIGAMENT_SCOPE_FAMILIES,
  TENDON_SCOPE_FAMILIES,
  selectScopedCodes,
} from "./icd10-tendon-ligament-scope";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function n(code: string): string {
  return code.toUpperCase().replace(/\./g, "");
}

/** Longest-prefix discharge family maps (mirrors apps/web discharge condition families). */
const TENDON_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_tendon_achilles", prefixes: ["S86.0"] },
  { family: "trauma_tendon_extensor_mechanism", prefixes: ["S76.1"] },
  { family: "trauma_tendon_shoulder", prefixes: ["S46.0", "S46.1", "S46.2", "S46.3", "M75.1"] },
  { family: "trauma_tendon_hand", prefixes: ["S66.1", "S66.2", "S66.3", "S66.5", "M66.2", "M66.3"] },
  { family: "trauma_tendon_generic", prefixes: ["S76.0", "S76.2", "S76.3", "S86.3", "S86.8", "S56", "S66", "S76", "S86", "S96", "M66"] },
];

const LIGAMENT_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_ligament_knee", prefixes: ["S83.41", "S83.42", "S83.51", "S83.52", "S83.4", "S83.5"] },
  { family: "trauma_ligament_ankle", prefixes: ["S93.41", "S93.42", "S93.43"] },
  { family: "trauma_ligament_hand", prefixes: ["S63.64", "S63.61", "S63.62", "S63.3"] },
  { family: "trauma_ligament_upper_extremity", prefixes: ["S63.51", "S53.4"] },
  { family: "trauma_ligament_generic", prefixes: ["S13.1", "S33.4", "S33.5", "S63.4", "S63.5", "S63.6", "S53.3", "S43.4", "S43.5", "S93.4", "S83.6"] },
];

/** Generic sprain prefixes that must not win over specific tendon/ligament families. */
const GENERIC_SPRAIN_PREFIXES = ["S93.4", "S63.5", "S83.9", "S43.4", "S53.3", "S39.01"];

function bestFamily(code: string, maps: Array<{ family: string; prefixes: string[] }>): string | null {
  const nc = n(code);
  let best: { family: string; len: number } | null = null;
  for (const entry of maps) {
    for (const p of entry.prefixes) {
      const pn = n(p);
      if (nc.startsWith(pn) && (!best || pn.length > best.len)) {
        best = { family: entry.family, len: pn.length };
      }
    }
  }
  return best?.family ?? null;
}

function bestPrefixLen(code: string, prefixes: string[]): number {
  const nc = n(code);
  let best = 0;
  for (const p of prefixes) {
    const pn = n(p);
    if (nc.startsWith(pn) && pn.length > best) best = pn.length;
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

  const tendonCodes = selectScopedCodes(validation.parse.rows, TENDON_SCOPE_FAMILIES, { billableOnly: true });
  const ligamentCodes = selectScopedCodes(validation.parse.rows, LIGAMENT_SCOPE_FAMILIES, {
    billableOnly: true,
  });

  const tendonFallbacks: string[] = [];
  const tendonGenericSteal: string[] = [];
  for (const row of tendonCodes) {
    const family = bestFamily(row.code, TENDON_DISCHARGE_PREFIXES);
    if (!family) tendonFallbacks.push(row.code);
    else if (family === "trauma_tendon_generic") {
      // generic tendon family is an allowed documented fallback
    }
    const tendonLen = bestPrefixLen(
      row.code,
      TENDON_DISCHARGE_PREFIXES.flatMap((e) => e.prefixes),
    );
    const sprainLen = bestPrefixLen(row.code, GENERIC_SPRAIN_PREFIXES);
    if (sprainLen > tendonLen) tendonGenericSteal.push(row.code);
  }

  const ligamentFallbacks: string[] = [];
  const ligamentGenericSteal: string[] = [];
  for (const row of ligamentCodes) {
    const family = bestFamily(row.code, LIGAMENT_DISCHARGE_PREFIXES);
    if (!family) ligamentFallbacks.push(row.code);
    const ligLen = bestPrefixLen(
      row.code,
      LIGAMENT_DISCHARGE_PREFIXES.flatMap((e) => e.prefixes),
    );
    const sprainLen = bestPrefixLen(row.code, GENERIC_SPRAIN_PREFIXES);
    if (sprainLen > ligLen) ligamentGenericSteal.push(row.code);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    tendonScoped: tendonCodes.length,
    ligamentScoped: ligamentCodes.length,
    tendonUnexplainedFallbacks: tendonFallbacks.length,
    ligamentUnexplainedFallbacks: ligamentFallbacks.length,
    tendonStolenByGenericSprain: tendonGenericSteal.length,
    ligamentStolenByGenericSprain: ligamentGenericSteal.length,
    tendonFallbackSample: tendonFallbacks.slice(0, 25),
    ligamentFallbackSample: ligamentFallbacks.slice(0, 25),
    pass:
      tendonFallbacks.length === 0 &&
      ligamentFallbacks.length === 0 &&
      tendonGenericSteal.length === 0 &&
      ligamentGenericSteal.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));

  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(join(summaryDir, "fy2026-routing-summary.json"), JSON.stringify(report, null, 2));

  process.exit(report.pass ? 0 : 2);
}

main();
