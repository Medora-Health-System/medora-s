import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectAcuteGlaucomaScopedCodes,
  selectCraoCrvoScopedCodes,
  selectEyeEmergenciesScopedCodes,
  selectPreseptalCellulitisScopedCodes,
  selectRetinalDetachmentScopedCodes,
} from "./icd10-eye-emergencies-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));
const descriptionOf = (row: { shortDescription: string; longDescription?: string }) =>
  `${row.shortDescription} ${row.longDescription ?? ""}`.toLowerCase();

/** Deterministic ownership checks for eye-emergency routing de-collision (no DB required). */
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
  const scoped = selectEyeEmergenciesScopedCodes(rows, { billableOnly: true });
  const craoCrvoOwned = selectCraoCrvoScopedCodes(rows, { billableOnly: true });
  const acuteGlaucomaOwned = selectAcuteGlaucomaScopedCodes(rows, { billableOnly: true });
  const preseptalOwned = selectPreseptalCellulitisScopedCodes(rows, { billableOnly: true });
  const retinalDetachmentOwned = selectRetinalDetachmentScopedCodes(rows, { billableOnly: true });

  const corneaUlcerOwned = scoped.filter((row) => starts(row.code, "H16.0"));
  const photokeratitisOwned = scoped.filter((row) => starts(row.code, "H16.13"));
  const uveitisOwned = scoped.filter((row) => starts(row.code, "H20"));
  const hyphemaOwned = scoped.filter((row) => starts(row.code, "H21.0"));
  const scleritisOwned = scoped.filter((row) => starts(row.code, "H15.0"));
  const vitreousHemorrhageOwned = scoped.filter((row) => starts(row.code, "H43.1"));
  const endophthalmitisOwned = scoped.filter((row) => starts(row.code, "H44.0"));
  const orbitalCellulitisOwned = scoped.filter((row) => starts(row.code, "H05.01"));
  const corneaOpenGlobeOwned = scoped.filter((row) => starts(row.code, "S05.2") || starts(row.code, "S05.3"));
  const corneaAbrasionOwned = scoped.filter((row) => starts(row.code, "S05.0"));
  const corneaForeignBodyOwned = scoped.filter((row) => starts(row.code, "T15"));
  const chemicalBurnOwned = scoped.filter((row) => starts(row.code, "T26"));

  // Ownership buckets must not be empty — a neighboring under-routed module stealing the
  // whole bucket would leave these empty.
  const ownershipGaps = ([
    ["crao_crvo", craoCrvoOwned],
    ["acute_glaucoma", acuteGlaucomaOwned],
    ["preseptal_cellulitis", preseptalOwned],
    ["retinal_detachment", retinalDetachmentOwned],
    ["corneal_ulcer", corneaUlcerOwned],
    ["photokeratitis", photokeratitisOwned],
    ["uveitis_iritis", uveitisOwned],
    ["hyphema", hyphemaOwned],
    ["scleritis", scleritisOwned],
    ["vitreous_hemorrhage", vitreousHemorrhageOwned],
    ["endophthalmitis", endophthalmitisOwned],
    ["orbital_cellulitis", orbitalCellulitisOwned],
    ["open_globe", corneaOpenGlobeOwned],
    ["corneal_abrasion", corneaAbrasionOwned],
    ["corneal_foreign_body", corneaForeignBodyOwned],
    ["chemical_eye_burn", chemicalBurnOwned],
  ] as const)
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  // Conjunctivitis (H10) is intentionally out of the eye-emergencies scope — routine
  // conjunctivitis must never be pulled into this vision-threatening/trauma domain.
  const conjunctivitisSteals = scoped.filter((row) => starts(row.code, "H10")).map((row) => row.code);

  // Every scoped T15 row must actually reference a foreign body of the eye.
  const foreignBodySteals = corneaForeignBodyOwned
    .filter((row) => !/foreign body/.test(descriptionOf(row)))
    .map((row) => row.code);

  // Every scoped T26 row must reference the eye/adnexa (eyelid, periocular, cornea,
  // conjunctival sac, eyeball), not generic skin burns from other body regions.
  const burnSteals = chemicalBurnOwned
    .filter((row) => !/\beye\b|eyelid|eyeball|cornea|conjunctiv|periocular|adnexa/.test(descriptionOf(row)))
    .map((row) => row.code);

  // Facial fractures (S02) must never appear in the eye-emergencies scope.
  const facialSteals = scoped.filter((row) => starts(row.code, "S02")).map((row) => row.code);

  // Generic headache/symptom codes (R51, G43 migraine) must never appear in scope —
  // acute angle-closure glaucoma headache is a differential, not an ICD-10 headache code.
  const headacheSteals = scoped.filter((row) => starts(row.code, "R51") || starts(row.code, "G43")).map((row) => row.code);

  // Subjective visual-disturbance symptom codes (H53, e.g. blurred vision without a
  // structural diagnosis) must never appear in the structural eye-emergencies scope.
  const visionSymptomSteals = scoped.filter((row) => starts(row.code, "H53")).map((row) => row.code);

  // Infection under-routing: preseptal ownership must be limited to L03.213 (periorbital
  // cellulitis) — L03.211 (face cellulitis) and L03.212 (face lymphangitis) are broader
  // facial-infection codes that must not be pulled into the preseptal/periorbital bucket.
  const infectionUnderRouting = preseptalOwned
    .filter((row) => !starts(row.code, "L03.213"))
    .map((row) => row.code)
    .concat(
      scoped
        .filter((row) => starts(row.code, "L03.211") || starts(row.code, "L03.212"))
        .filter((row) => preseptalOwned.some((p) => p.code === row.code))
        .map((row) => row.code),
    );

  const report = {
    eyeEmergenciesScoped: scoped.length,
    craoCrvoOwned: craoCrvoOwned.length,
    acuteGlaucomaOwned: acuteGlaucomaOwned.length,
    preseptalOwned: preseptalOwned.length,
    retinalDetachmentOwned: retinalDetachmentOwned.length,
    corneaUlcerOwned: corneaUlcerOwned.length,
    photokeratitisOwned: photokeratitisOwned.length,
    uveitisOwned: uveitisOwned.length,
    hyphemaOwned: hyphemaOwned.length,
    scleritisOwned: scleritisOwned.length,
    vitreousHemorrhageOwned: vitreousHemorrhageOwned.length,
    endophthalmitisOwned: endophthalmitisOwned.length,
    orbitalCellulitisOwned: orbitalCellulitisOwned.length,
    openGlobeOwned: corneaOpenGlobeOwned.length,
    corneaAbrasionOwned: corneaAbrasionOwned.length,
    corneaForeignBodyOwned: corneaForeignBodyOwned.length,
    chemicalBurnOwned: chemicalBurnOwned.length,
    ownershipGaps,
    conjunctivitisSteals,
    foreignBodySteals,
    burnSteals,
    facialSteals,
    headacheSteals,
    visionSymptomSteals,
    infectionUnderRouting,
    pass: false,
  };

  report.pass =
    report.ownershipGaps.length === 0 &&
    report.conjunctivitisSteals.length === 0 &&
    report.foreignBodySteals.length === 0 &&
    report.burnSteals.length === 0 &&
    report.facialSteals.length === 0 &&
    report.headacheSteals.length === 0 &&
    report.visionSymptomSteals.length === 0 &&
    report.infectionUnderRouting.length === 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-eye-emergencies-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-eye-emergencies-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
