/**
 * Routing certification for crush / amputation / foreign-body selectable codes.
 *
 *   pnpm --filter @medora/api icd:routing:crush-amp-fb -- --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";
import {
  selectAmputationScopedCodes,
  selectCrushScopedCodes,
  selectForeignBodyScopedCodes,
} from "./icd10-crush-amputation-foreign-body-scope";
import {
  FOREIGN_BODY_EYE_PENETRATING_ICD_PREFIXES,
  FOREIGN_BODY_FOOT_TOE_ICD_PREFIXES,
  FOREIGN_BODY_HAND_FINGER_ICD_PREFIXES,
  FOREIGN_BODY_SKIN_SOFT_TISSUE_OPEN_ICD_PREFIXES,
  FOREIGN_BODY_SKIN_SOFT_TISSUE_SUPERFICIAL_ICD_PREFIXES,
} from "./icd10-foreign-body-routing-prefixes";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function n(code: string): string {
  return code.toUpperCase().replace(/\./g, "");
}

/** Mirrors apps/web trauma crush / amp / FB discharge condition family prefixes. */
const CRUSH_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_crush_hand_finger", prefixes: ["S67.1", "S67.2", "S67"] },
  { family: "trauma_crush_upper_extremity", prefixes: ["S47", "S57"] },
  { family: "trauma_crush_lower_extremity", prefixes: ["S77", "S87"] },
  { family: "trauma_crush_foot_toe", prefixes: ["S97"] },
  {
    family: "trauma_crush_chest_abdomen_pelvis",
    prefixes: ["S28.0", "S38.00", "S38.01", "S38.02", "S38.03", "S38.1"],
  },
  { family: "trauma_crush_prolonged_compression", prefixes: ["T79.6"] },
  { family: "trauma_crush_generic", prefixes: ["S07", "S17"] },
];

const AMPUTATION_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "trauma_amputation_finger_thumb", prefixes: ["S68.1", "S68.0", "S68"] },
  { family: "trauma_amputation_hand_upper_extremity", prefixes: ["S48", "S58"] },
  { family: "trauma_amputation_toe", prefixes: ["S98.1", "S98.2"] },
  {
    family: "trauma_amputation_foot_lower_extremity",
    prefixes: ["S78", "S88", "S98.0", "S98.3", "S98.9"],
  },
  {
    family: "trauma_amputation_generic",
    prefixes: ["S08.1", "S08.8", "S28.1", "S28.2", "S38.2"],
  },
];

const FOREIGN_BODY_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  {
    family: "trauma_foreign_body_eye",
    prefixes: ["T15", ...FOREIGN_BODY_EYE_PENETRATING_ICD_PREFIXES],
  },
  { family: "trauma_foreign_body_ear_nose", prefixes: ["T16", "T17.0", "T17.1"] },
  { family: "trauma_foreign_body_aspirated", prefixes: ["T17"] },
  { family: "trauma_foreign_body_ingested", prefixes: ["T18"] },
  {
    family: "trauma_foreign_body_hand_finger",
    prefixes: [...FOREIGN_BODY_HAND_FINGER_ICD_PREFIXES],
  },
  {
    family: "trauma_foreign_body_foot_toe",
    prefixes: [...FOREIGN_BODY_FOOT_TOE_ICD_PREFIXES],
  },
  {
    family: "trauma_foreign_body_skin_soft_tissue",
    prefixes: [
      ...FOREIGN_BODY_SKIN_SOFT_TISSUE_OPEN_ICD_PREFIXES,
      ...FOREIGN_BODY_SKIN_SOFT_TISSUE_SUPERFICIAL_ICD_PREFIXES,
    ],
  },
  { family: "trauma_foreign_body_generic", prefixes: ["T19"] },
];

/** Generic wound/laceration prefixes that must not outrank specific crush/amp/FB families. */
const GENERIC_WOUND_PREFIXES = ["S01", "S41", "S51", "S61", "S71", "S81", "S91", "T14"];

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

  const crushCodes = selectCrushScopedCodes(validation.parse.rows, { billableOnly: true });
  const ampCodes = selectAmputationScopedCodes(validation.parse.rows, { billableOnly: true });
  const fbCodes = selectForeignBodyScopedCodes(validation.parse.rows, { billableOnly: true });

  const crushFallbacks: string[] = [];
  const crushGenericSteal: string[] = [];
  for (const row of crushCodes) {
    const family = bestFamily(row.code, CRUSH_DISCHARGE_PREFIXES);
    if (!family) crushFallbacks.push(row.code);
    const crushLen = bestPrefixLen(
      row.code,
      CRUSH_DISCHARGE_PREFIXES.flatMap((e) => e.prefixes),
    );
    const woundLen = bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES);
    if (woundLen > crushLen) crushGenericSteal.push(row.code);
  }

  const ampFallbacks: string[] = [];
  const ampGenericSteal: string[] = [];
  for (const row of ampCodes) {
    const family = bestFamily(row.code, AMPUTATION_DISCHARGE_PREFIXES);
    if (!family) ampFallbacks.push(row.code);
    const ampLen = bestPrefixLen(
      row.code,
      AMPUTATION_DISCHARGE_PREFIXES.flatMap((e) => e.prefixes),
    );
    const woundLen = bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES);
    if (woundLen > ampLen) ampGenericSteal.push(row.code);
  }

  const fbFallbacks: string[] = [];
  const fbGenericSteal: string[] = [];
  for (const row of fbCodes) {
    const family = bestFamily(row.code, FOREIGN_BODY_DISCHARGE_PREFIXES);
    if (!family) fbFallbacks.push(row.code);
    const fbLen = bestPrefixLen(
      row.code,
      FOREIGN_BODY_DISCHARGE_PREFIXES.flatMap((e) => e.prefixes),
    );
    const woundLen = bestPrefixLen(row.code, GENERIC_WOUND_PREFIXES);
    if (woundLen > fbLen) fbGenericSteal.push(row.code);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    releaseVersion: validation.manifest.releaseVersion,
    crushScoped: crushCodes.length,
    amputationScoped: ampCodes.length,
    foreignBodyScoped: fbCodes.length,
    crushUnexplainedFallbacks: crushFallbacks.length,
    amputationUnexplainedFallbacks: ampFallbacks.length,
    foreignBodyUnexplainedFallbacks: fbFallbacks.length,
    crushStolenByGenericWound: crushGenericSteal.length,
    amputationStolenByGenericWound: ampGenericSteal.length,
    foreignBodyStolenByGenericWound: fbGenericSteal.length,
    crushFallbackSample: crushFallbacks.slice(0, 25),
    amputationFallbackSample: ampFallbacks.slice(0, 25),
    foreignBodyFallbackSample: fbFallbacks.slice(0, 25),
    foreignBodyStealSample: fbGenericSteal.slice(0, 25),
    pass:
      crushFallbacks.length === 0 &&
      ampFallbacks.length === 0 &&
      fbFallbacks.length === 0 &&
      crushGenericSteal.length === 0 &&
      ampGenericSteal.length === 0 &&
      fbGenericSteal.length === 0,
  };

  console.log(JSON.stringify(report, null, 2));

  const summaryDir = resolve(__dirname, "certification-summaries");
  mkdirSync(summaryDir, { recursive: true });
  writeFileSync(
    join(summaryDir, "fy2026-crush-amputation-foreign-body-routing-summary.json"),
    JSON.stringify(report, null, 2),
  );

  process.exit(report.pass ? 0 : 2);
}

main();
