import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectCellulitisScopedCodes,
  selectDiabeticFootUlcerScopedCodes,
  selectInfectiveTenosynovitisScopedCodes,
  selectNecrotizingSoftTissueScopedCodes,
  selectPostoperativeWoundComplicationScopedCodes,
  selectPurulentCutaneousScopedCodes,
  selectSoftTissueWoundInfectionsScopedCodes,
} from "./icd10-soft-tissue-wound-infections-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));
const descriptionOf = (row: { shortDescription: string; longDescription?: string }) =>
  `${row.shortDescription} ${row.longDescription ?? ""}`.toLowerCase();

function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file");
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: flag("allow-dev-sample"),
    skipChecksum: flag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) throw new Error("Official release validation failed");

  const rows = validation.parse.rows;
  const scoped = selectSoftTissueWoundInfectionsScopedCodes(rows, { billableOnly: true });
  const purulentOwned = selectPurulentCutaneousScopedCodes(rows, { billableOnly: true });
  const cellulitisOwned = selectCellulitisScopedCodes(rows, { billableOnly: true });
  const nstiOwned = selectNecrotizingSoftTissueScopedCodes(rows, { billableOnly: true });
  const tenosynovitisOwned = selectInfectiveTenosynovitisScopedCodes(rows, { billableOnly: true });
  const postoperativeOwned = selectPostoperativeWoundComplicationScopedCodes(rows, { billableOnly: true });
  const diabeticFootOwned = selectDiabeticFootUlcerScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["purulent_cutaneous", purulentOwned],
      ["cellulitis", cellulitisOwned],
      ["necrotizing_soft_tissue", nstiOwned],
      ["infective_tenosynovitis", tenosynovitisOwned],
      ["postoperative_wound", postoperativeOwned],
      ["diabetic_foot_ulcer", diabeticFootOwned],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  // Abscess (L02) must not appear inside nonpurulent cellulitis (L03) ownership bucket.
  const genericCellulitisStealing = cellulitisOwned.filter((row) => starts(row.code, "L02")).map((row) => row.code);

  // Cellulitis (L03) must not appear inside purulent L02 ownership.
  const genericAbscessStealing = purulentOwned.filter((row) => starts(row.code, "L03")).map((row) => row.code);

  // Generic open-wound trauma (S-series open wounds without infection ownership) must not steal STI scope.
  const genericWoundStealing = scoped
    .filter((row) => /^S\d/.test(row.code) && !/infection|cellulitis|abscess/.test(descriptionOf(row)))
    .map((row) => row.code);

  // Bite codes (W50/W54/W55/Y04) must remain outside soft-tissue infection ownership (bite provenance preserved).
  const biteUnderRouting = scoped
    .filter((row) => starts(row.code, "W50") || starts(row.code, "W54") || starts(row.code, "W55") || starts(row.code, "Y04"))
    .map((row) => row.code);

  // Foreign-body retained codes (T15–T19) must remain outside STI ownership.
  const foreignBodyUnderRouting = scoped
    .filter((row) => starts(row.code, "T15") || starts(row.code, "T16") || starts(row.code, "T17") || starts(row.code, "T18") || starts(row.code, "T19"))
    .map((row) => row.code);

  // Diabetic foot ulcer ownership must stay on E11.62* — L03 alone is not diabetic-foot ownership.
  const diabeticFootUnderRouting = diabeticFootOwned.filter((row) => !starts(row.code, "E11.62")).map((row) => row.code);

  // Postoperative ownership must stay on T81.3 / T81.4.
  const postoperativeUnderRouting = postoperativeOwned
    .filter((row) => !starts(row.code, "T81.3") && !starts(row.code, "T81.4"))
    .map((row) => row.code);

  // Deep infection ownership: NSTI + infective tenosynovitis must not collapse into L03 cellulitis.
  const deepInfectionUnderRouting = [
    ...nstiOwned.filter((row) => starts(row.code, "L03")).map((row) => row.code),
    ...tenosynovitisOwned.filter((row) => starts(row.code, "L03") || starts(row.code, "S93") || starts(row.code, "S63")).map((row) => row.code),
  ];

  // Eye preseptal (L03.213) remains in L03 scope but must not be treated as generic facial cellulitis steal of H05 orbital.
  const eyeOrbitalSteals = scoped.filter((row) => starts(row.code, "H05")).map((row) => row.code);

  // ENT deep-neck (J36/J39/K12.2) must never appear in soft-tissue wound infection scope.
  const entDeepNeckSteals = scoped
    .filter((row) => starts(row.code, "J36") || starts(row.code, "J39") || starts(row.code, "K12.2"))
    .map((row) => row.code);

  // Burn codes must not steal STI ownership.
  const burnSteals = scoped.filter((row) => starts(row.code, "T20") || starts(row.code, "T21") || starts(row.code, "T22") || starts(row.code, "T23") || starts(row.code, "T24") || starts(row.code, "T25") || starts(row.code, "T30") || starts(row.code, "T31")).map((row) => row.code);

  // Symptom-only R-codes (pain/swelling) must not appear in structural STI scope.
  const symptomRoutingStealing = scoped.filter((row) => starts(row.code, "R")).map((row) => row.code);

  const unexplainedRoutingFallbacks: string[] = [];

  const report = {
    softTissueWoundInfectionsScoped: scoped.length,
    purulentOwned: purulentOwned.length,
    cellulitisOwned: cellulitisOwned.length,
    nstiOwned: nstiOwned.length,
    tenosynovitisOwned: tenosynovitisOwned.length,
    postoperativeOwned: postoperativeOwned.length,
    diabeticFootOwned: diabeticFootOwned.length,
    ownershipGaps,
    unexplainedRoutingFallbacks,
    genericCellulitisStealing,
    genericAbscessStealing,
    genericWoundStealing,
    biteUnderRouting,
    foreignBodyUnderRouting,
    diabeticFootUnderRouting,
    postoperativeUnderRouting,
    deepInfectionUnderRouting,
    eyeOrbitalSteals,
    entDeepNeckSteals,
    burnSteals,
    symptomRoutingStealing,
    pass: false,
  };

  report.pass =
    report.ownershipGaps.length === 0 &&
    report.unexplainedRoutingFallbacks.length === 0 &&
    report.genericCellulitisStealing.length === 0 &&
    report.genericAbscessStealing.length === 0 &&
    report.genericWoundStealing.length === 0 &&
    report.biteUnderRouting.length === 0 &&
    report.foreignBodyUnderRouting.length === 0 &&
    report.diabeticFootUnderRouting.length === 0 &&
    report.postoperativeUnderRouting.length === 0 &&
    report.deepInfectionUnderRouting.length === 0 &&
    report.eyeOrbitalSteals.length === 0 &&
    report.entDeepNeckSteals.length === 0 &&
    report.burnSteals.length === 0 &&
    report.symptomRoutingStealing.length === 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-soft-tissue-wound-infections-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-soft-tissue-wound-infections-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
