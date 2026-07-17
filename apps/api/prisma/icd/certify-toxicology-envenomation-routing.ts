/**
 * Routing certification for toxicology/envenomation ICD codes (Phase 16).
 *
 *   pnpm --filter @medora/api icd:routing:toxicology-envenomation -- \
 *     --file=/path/to/zip --release=2026
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectEnvenomationScopedCodes,
  selectToxicologyEnvenomationScopedCodes,
} from "./icd10-toxicology-envenomation-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

function getArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
const n = (code: string) => code.toUpperCase().replace(/\./g, "");
const starts = (code: string, prefix: string) => n(code).startsWith(n(prefix));

const TOX_DISCHARGE_PREFIXES: Array<{ family: string; prefixes: string[] }> = [
  { family: "tox_medication_poisoning", prefixes: ["T36", "T37", "T38", "T39", "T40", "T41", "T42", "T43", "T44", "T45", "T46", "T47", "T48", "T49", "T50"] },
  { family: "tox_nonmedicinal", prefixes: ["T51", "T52", "T53", "T54", "T55", "T56", "T57", "T58", "T59", "T60", "T61", "T62", "T64", "T65"] },
  { family: "tox_envenomation", prefixes: ["T63"] },
  { family: "tox_substance_use", prefixes: ["F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19"] },
  { family: "tox_serotonin", prefixes: ["G90.81"] },
  { family: "tox_nms", prefixes: ["G21.0"] },
  { family: "tox_methemoglobin", prefixes: ["D74.8", "D74.9"] },
];

function bestFamily(code: string): { family: string; length: number } | null {
  let best: { family: string; length: number } | null = null;
  for (const entry of TOX_DISCHARGE_PREFIXES) {
    for (const prefix of entry.prefixes) {
      const length = n(prefix).length;
      if (n(code).startsWith(n(prefix)) && (!best || length > best.length)) {
        best = { family: entry.family, length };
      }
    }
  }
  return best;
}

/** 7th character / trailing structure helpers for T36-T50 drug codes (after decimal removal). */
function drugIntentBucket(code: string): "poisoning" | "adverse_effect" | "underdosing" | "other" {
  const compact = n(code);
  // Pattern T##.###X#A where X is intent: 1-4 poisoning, 5 adverse, 6 underdosing.
  const match = compact.match(/^T(3[6-9]|4[0-9]|50).+(\d)([ADS])$/);
  if (!match) return "other";
  const intent = match[2];
  if (intent === "5") return "adverse_effect";
  if (intent === "6") return "underdosing";
  if (["1", "2", "3", "4"].includes(intent)) return "poisoning";
  return "other";
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
  const scoped = selectToxicologyEnvenomationScopedCodes(rows, { billableOnly: true });
  const envenomation = selectEnvenomationScopedCodes(rows, { billableOnly: true });

  const unexplainedRoutingFallbacks = scoped.filter((row) => !bestFamily(row.code)).map((row) => row.code);

  // Poisoning vs adverse-effect vs underdosing must not collapse into one bucket.
  const drugScoped = scoped.filter((row) => starts(row.code, "T36") || starts(row.code, "T4") || starts(row.code, "T50"));
  const poisoning = drugScoped.filter((row) => drugIntentBucket(row.code) === "poisoning");
  const adverse = drugScoped.filter((row) => drugIntentBucket(row.code) === "adverse_effect");
  const underdosing = drugScoped.filter((row) => drugIntentBucket(row.code) === "underdosing");
  const poisoningAdverseEffectCollision =
    poisoning.some((row) => drugIntentBucket(row.code) === "adverse_effect") ||
    adverse.some((row) => drugIntentBucket(row.code) === "poisoning")
      ? ["bucket_collapse"]
      : [];
  if (poisoning.length === 0 || adverse.length === 0 || underdosing.length === 0) {
    poisoningAdverseEffectCollision.push("missing_intent_bucket");
  }

  // Intentional self-harm poisoning (intent digit 2) must remain present.
  const intentionalSelfHarm = drugScoped.filter((row) => {
    const compact = n(row.code);
    return /T(3[6-9]|4[0-9]|50).+2[ADS]$/.test(compact);
  });
  const intentLoss = intentionalSelfHarm.length === 0 ? ["no_intentional_self_harm_poisoning_codes"] : [];

  // Intoxication vs withdrawal — F10.12* vs F10.23* must both exist and not share identical bucket labels wrongly.
  const alcoholIntox = scoped.filter((row) => /F10\.12|F1012/.test(n(row.code)) || starts(row.code, "F10.12"));
  const alcoholWithdrawal = scoped.filter((row) => starts(row.code, "F10.23"));
  const intoxicationWithdrawalCollision =
    alcoholIntox.length === 0 || alcoholWithdrawal.length === 0
      ? ["missing_intox_or_withdrawal"]
      : alcoholIntox.some((row) => starts(row.code, "F10.23")) ||
          alcoholWithdrawal.some((row) => starts(row.code, "F10.12"))
        ? ["cross_bucket"]
        : [];

  // Environmental heat/cold must not be in tox scope; T58 must be in tox scope.
  const environmentalToxicologyCollision = [
    ...scoped.filter((row) => starts(row.code, "T67") || starts(row.code, "T68")).map((row) => row.code),
    ...(scoped.some((row) => starts(row.code, "T58")) ? [] : ["T58_missing_from_tox_scope"]),
  ];

  // Envenomation T63 in scope; ordinary dog bite W54 not in envenomation bucket.
  const envenomationBiteCollision = [
    ...envenomation.filter((row) => starts(row.code, "W54")).map((row) => row.code),
    ...(envenomation.some((row) => starts(row.code, "T63")) ? [] : ["T63_missing"]),
  ];

  const psychiatricLinkageIntentFlagged = intentionalSelfHarm.length > 0 ? [] : ["intent_flag_missing"];

  const symptomStealing = scoped
    .filter((row) => starts(row.code, "R40") || starts(row.code, "R41") || starts(row.code, "R50"))
    .map((row) => row.code);

  const report = {
    unexplainedRoutingFallbacks,
    poisoningAdverseEffectCollision,
    intentLoss,
    intoxicationWithdrawalCollision,
    environmentalToxicologyCollision,
    envenomationBiteCollision,
    psychiatricLinkageIntentFlagged,
    symptomStealing,
    counts: {
      scoped: scoped.length,
      poisoning: poisoning.length,
      adverseEffect: adverse.length,
      underdosing: underdosing.length,
      intentionalSelfHarm: intentionalSelfHarm.length,
      alcoholIntox: alcoholIntox.length,
      alcoholWithdrawal: alcoholWithdrawal.length,
      envenomation: envenomation.length,
    },
    certification: {
      pass:
        unexplainedRoutingFallbacks.length === 0 &&
        poisoningAdverseEffectCollision.length === 0 &&
        intentLoss.length === 0 &&
        intoxicationWithdrawalCollision.length === 0 &&
        environmentalToxicologyCollision.length === 0 &&
        envenomationBiteCollision.length === 0 &&
        psychiatricLinkageIntentFlagged.length === 0 &&
        symptomStealing.length === 0,
    },
  };

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-toxicology-envenomation-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-toxicology-envenomation-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.certification.pass ? 0 : 2);
}

main();
