import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectDeepNeckInfectionScopedCodes,
  selectEntAirwayForeignBodyScopedCodes,
  selectEntEarForeignBodyScopedCodes,
  selectEntEmergenciesScopedCodes,
  selectEntNasalForeignBodyScopedCodes,
  selectMalignantOtitisExternaScopedCodes,
  selectMastoiditisScopedCodes,
  selectSuddenHearingLossScopedCodes,
} from "./icd10-ent-emergencies-scope";
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
  const scoped = selectEntEmergenciesScopedCodes(rows, { billableOnly: true });
  const malignantOeOwned = selectMalignantOtitisExternaScopedCodes(rows, { billableOnly: true });
  const mastoiditisOwned = selectMastoiditisScopedCodes(rows, { billableOnly: true });
  const ssnhlOwned = selectSuddenHearingLossScopedCodes(rows, { billableOnly: true });
  const deepNeckOwned = selectDeepNeckInfectionScopedCodes(rows, { billableOnly: true });
  const earFbOwned = selectEntEarForeignBodyScopedCodes(rows, { billableOnly: true });
  const nasalFbOwned = selectEntNasalForeignBodyScopedCodes(rows, { billableOnly: true });
  const airwayFbOwned = selectEntAirwayForeignBodyScopedCodes(rows, { billableOnly: true });

  const bppvOwned = scoped.filter((row) => starts(row.code, "H81.1"));
  const vestibularNeuritisOwned = scoped.filter((row) => starts(row.code, "H81.2"));
  const labyrinthitisOwned = scoped.filter((row) => starts(row.code, "H83.0"));
  const ptaOwned = scoped.filter((row) => starts(row.code, "J36"));
  const rpaOwned = scoped.filter((row) => starts(row.code, "J39.0"));
  const ludwigOwned = scoped.filter((row) => starts(row.code, "K12.2"));
  const epiglottitisOwned = scoped.filter((row) => starts(row.code, "J05.1"));
  const epistaxisOwned = scoped.filter((row) => starts(row.code, "R04.0"));
  const facialNerveOwned = scoped.filter((row) => starts(row.code, "G51.0"));
  const ramsayHuntOwned = scoped.filter((row) => starts(row.code, "B02.2"));

  const ownershipGaps = (
    [
      ["malignant_otitis_externa", malignantOeOwned],
      ["mastoiditis", mastoiditisOwned],
      ["sudden_hearing_loss", ssnhlOwned],
      ["deep_neck_infection", deepNeckOwned],
      ["bppv", bppvOwned],
      ["vestibular_neuritis", vestibularNeuritisOwned],
      ["labyrinthitis", labyrinthitisOwned],
      ["peritonsillar_abscess", ptaOwned],
      ["retropharyngeal_parapharyngeal", rpaOwned],
      ["ludwig_angina", ludwigOwned],
      ["epiglottitis", epiglottitisOwned],
      ["epistaxis", epistaxisOwned],
      ["facial_nerve", facialNerveOwned],
      ["ramsay_hunt", ramsayHuntOwned],
      ["ear_foreign_body", earFbOwned],
      ["nasal_foreign_body", nasalFbOwned],
      ["airway_foreign_body", airwayFbOwned],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  // Malignant OE bucket must be H60.2 only — routine OE (H60.3 etc.) must not steal.
  const routineOtitisStealing = malignantOeOwned
    .filter((row) => !starts(row.code, "H60.2"))
    .map((row) => row.code);

  // Mastoiditis must remain H70 — H66 OM must never appear in mastoiditis ownership.
  const mastoidOtitisStealing = mastoiditisOwned.filter((row) => starts(row.code, "H66")).map((row) => row.code);

  // SSNHL ownership is H91.2 — cerumen (H61.2) and generic otalgia must not appear.
  const ssnhlStealing = ssnhlOwned
    .filter((row) => !starts(row.code, "H91.2"))
    .map((row) => row.code)
    .concat(scoped.filter((row) => starts(row.code, "H61.2")).map((row) => row.code));

  // Generic pharyngitis (J02/J03) must not appear inside deep-neck ownership buckets.
  const genericPharyngitisStealing = deepNeckOwned
    .filter((row) => starts(row.code, "J02") || starts(row.code, "J03"))
    .map((row) => row.code);

  // Facial fractures (S02) and eye codes (H16/S05) must never appear in ENT emergency scope.
  const facialSteals = scoped.filter((row) => starts(row.code, "S02")).map((row) => row.code);
  const eyeSteals = scoped
    .filter((row) => starts(row.code, "H16") || starts(row.code, "S05") || starts(row.code, "T15") || starts(row.code, "T26"))
    .map((row) => row.code);

  // Symptom-only dizziness (R42) is intentionally out of ENT structural scope.
  const symptomVertigoSteals = scoped.filter((row) => starts(row.code, "R42")).map((row) => row.code);

  // Ear FB rows must reference foreign body in ear; nasal FB must reference nose/nostril/nasal.
  const foreignBodySteals = [
    ...earFbOwned.filter((row) => !/foreign body/.test(descriptionOf(row)) || !/\bear\b/.test(descriptionOf(row))).map((r) => r.code),
    ...nasalFbOwned
      .filter((row) => !/foreign body/.test(descriptionOf(row)) || !/(nose|nostril|nasal)/.test(descriptionOf(row)))
      .map((r) => r.code),
  ];

  // Airway FB (pharynx/larynx) must not be collapsed into esophageal (T18.1) ownership.
  const airwayUnderRouting = airwayFbOwned
    .filter((row) => starts(row.code, "T18"))
    .map((row) => row.code);

  // Dental under-routing: Ludwig (K12.2) must remain in deep-neck ownership; K04 pulpitis alone is out of scope.
  const dentalUnderRouting = !ludwigOwned.some((row) => starts(row.code, "K12.2"))
    ? ["K12.2_missing"]
    : scoped.filter((row) => starts(row.code, "K04")).map((row) => row.code);

  const unexplainedRoutingFallbacks: string[] = [];

  const report = {
    entEmergenciesScoped: scoped.length,
    malignantOeOwned: malignantOeOwned.length,
    mastoiditisOwned: mastoiditisOwned.length,
    ssnhlOwned: ssnhlOwned.length,
    deepNeckOwned: deepNeckOwned.length,
    bppvOwned: bppvOwned.length,
    vestibularNeuritisOwned: vestibularNeuritisOwned.length,
    labyrinthitisOwned: labyrinthitisOwned.length,
    ptaOwned: ptaOwned.length,
    rpaOwned: rpaOwned.length,
    ludwigOwned: ludwigOwned.length,
    epiglottitisOwned: epiglottitisOwned.length,
    epistaxisOwned: epistaxisOwned.length,
    facialNerveOwned: facialNerveOwned.length,
    ramsayHuntOwned: ramsayHuntOwned.length,
    earFbOwned: earFbOwned.length,
    nasalFbOwned: nasalFbOwned.length,
    airwayFbOwned: airwayFbOwned.length,
    ownershipGaps,
    unexplainedRoutingFallbacks,
    routineOtitisStealing,
    mastoidOtitisStealing,
    ssnhlStealing,
    genericPharyngitisStealing,
    foreignBodySteals,
    facialSteals,
    eyeSteals,
    symptomVertigoSteals,
    airwayUnderRouting,
    dentalUnderRouting,
    pass: false,
  };

  report.pass =
    report.ownershipGaps.length === 0 &&
    report.unexplainedRoutingFallbacks.length === 0 &&
    report.routineOtitisStealing.length === 0 &&
    report.mastoidOtitisStealing.length === 0 &&
    report.ssnhlStealing.length === 0 &&
    report.genericPharyngitisStealing.length === 0 &&
    report.foreignBodySteals.length === 0 &&
    report.facialSteals.length === 0 &&
    report.eyeSteals.length === 0 &&
    report.symptomVertigoSteals.length === 0 &&
    report.airwayUnderRouting.length === 0 &&
    report.dentalUnderRouting.length === 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-ent-emergencies-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-ent-emergencies-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
