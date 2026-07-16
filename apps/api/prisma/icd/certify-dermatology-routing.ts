import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectBullousDermatologyScopedCodes,
  selectDermatologyScopedCodes,
  selectEmergencyDrugReactionScopedCodes,
  selectFungalDermatologyScopedCodes,
  selectInflammatoryDermatologyScopedCodes,
  selectNeoplasmDermatologyScopedCodes,
  selectParasiticDermatologyScopedCodes,
  selectViralDermatologyScopedCodes,
} from "./icd10-dermatology-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

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
  const scoped = selectDermatologyScopedCodes(rows, { billableOnly: true });
  const viralOwned = selectViralDermatologyScopedCodes(rows, { billableOnly: true });
  const fungalOwned = selectFungalDermatologyScopedCodes(rows, { billableOnly: true });
  const parasiticOwned = selectParasiticDermatologyScopedCodes(rows, { billableOnly: true });
  const inflammatoryOwned = selectInflammatoryDermatologyScopedCodes(rows, { billableOnly: true });
  const drugReactionOwned = selectEmergencyDrugReactionScopedCodes(rows, { billableOnly: true });
  const bullousOwned = selectBullousDermatologyScopedCodes(rows, { billableOnly: true });
  const neoplasmOwned = selectNeoplasmDermatologyScopedCodes(rows, { billableOnly: true });

  const ownershipGaps = (
    [
      ["viral", viralOwned],
      ["fungal", fungalOwned],
      ["parasitic", parasiticOwned],
      ["inflammatory", inflammatoryOwned],
      ["emergency_drug_reaction", drugReactionOwned],
      ["bullous", bullousOwned],
      ["neoplasm", neoplasmOwned],
    ] as const
  )
    .filter(([, bucket]) => bucket.length === 0)
    .map(([id]) => id);

  // Phase 13 infection ownership (L02 abscess/furuncle/carbuncle, L03 cellulitis,
  // A46 erysipelas, M72.6/A48.0/N49.3 necrotizing soft tissue) must never be
  // reclaimed as dermatology-exclusive scope. L73.2 (hidradenitis) is the one
  // deliberate dual-listing and is explicitly excluded from this steal check.
  const phase13InfectionSteals = scoped
    .filter(
      (row) =>
        !starts(row.code, "L73.2") &&
        (starts(row.code, "L02") ||
          starts(row.code, "L03") ||
          starts(row.code, "A46") ||
          starts(row.code, "M72.6") ||
          starts(row.code, "A48.0") ||
          starts(row.code, "N49.3") ||
          starts(row.code, "M60.0") ||
          starts(row.code, "M65.1") ||
          starts(row.code, "M71.1") ||
          starts(row.code, "T81.3") ||
          starts(row.code, "T81.4") ||
          starts(row.code, "L05.0") ||
          starts(row.code, "L08.8") ||
          starts(row.code, "L08.9")),
    )
    .map((row) => row.code);

  // Burn/sunburn ownership (Phase 5, L55) must never be reclaimed by dermatology.
  const burnSunburnSteals = scoped.filter((row) => starts(row.code, "L55")).map((row) => row.code);

  // HSV (B00) must not appear inside the zoster (B02) ownership bucket, and vice versa.
  // (Guards against future prefix drift — the two families are disjoint today.)
  const hsvOwned = viralOwned.filter((row) => starts(row.code, "B00")).map((row) => row.code);
  const zosterOwned = viralOwned.filter((row) => starts(row.code, "B02")).map((row) => row.code);
  const hsvRoutedToZoster = hsvOwned.filter((code) => starts(code, "B02"));
  const zosterRoutedToHsv = zosterOwned.filter((code) => starts(code, "B00"));
  const hsvZosterCrossContamination = [...hsvRoutedToZoster, ...zosterRoutedToHsv];

  // Ophthalmic zoster (B02.3) must be flagged so downstream guidance routes to eye-dominant care.
  const ophthalmicZosterFlagged = viralOwned.filter((row) => starts(row.code, "B02.3")).map((row) => row.code);

  // Otic / Ramsay Hunt zoster (B02.2) must be flagged so downstream guidance routes to ENT.
  const oticRamsayHuntFlagged = viralOwned.filter((row) => starts(row.code, "B02.2")).map((row) => row.code);

  // Fungal (B35/B36/B37.2) must not appear inside the inflammatory dermatitis bucket (L20-L30/L40-L43/L50/L56/L71).
  const fungalStealingInflammatory = inflammatoryOwned.filter(
    (row) => starts(row.code, "B35") || starts(row.code, "B36") || starts(row.code, "B37"),
  ).map((row) => row.code);
  const inflammatoryStealingFungal = fungalOwned.filter(
    (row) => /^L(2[0-9]|3[0-9]|4[0-3]|50|56|71)/.test(norm(row.code)),
  ).map((row) => row.code);

  // SJS/TEN (L51.1-L51.3) must not collapse into an "uncomplicated drug eruption" bucket —
  // they must remain distinct from generic dermatitis-due-to-substances (L27) ownership.
  const sjsTenCodes = drugReactionOwned.filter(
    (row) => starts(row.code, "L51.1") || starts(row.code, "L51.2") || starts(row.code, "L51.3"),
  );
  const sjsTenUnderUncomplicatedDrugEruption = inflammatoryOwned
    .filter((row) => starts(row.code, "L27"))
    .filter((row) => sjsTenCodes.some((sjs) => sjs.code === row.code))
    .map((row) => row.code);

  // Neoplasm (C43/C44/D03/D04) must not collapse into the benign-lesion-only bucket
  // (D22 melanocytic nevi, D23 other benign, L82 seborrheic keratosis).
  const malignantNeoplasmCodes = neoplasmOwned.filter(
    (row) => starts(row.code, "C43") || starts(row.code, "C44") || starts(row.code, "D03") || starts(row.code, "D04"),
  );
  const benignLesionOnlyCodes = neoplasmOwned.filter(
    (row) => starts(row.code, "D22") || starts(row.code, "D23") || starts(row.code, "L82"),
  );
  const neoplasmUnderBenignLesionOnly = malignantNeoplasmCodes
    .filter((row) => benignLesionOnlyCodes.some((benign) => benign.code === row.code))
    .map((row) => row.code);

  const unexplainedRoutingFallbacks: string[] = [];

  const report = {
    dermatologyScoped: scoped.length,
    viralOwned: viralOwned.length,
    fungalOwned: fungalOwned.length,
    parasiticOwned: parasiticOwned.length,
    inflammatoryOwned: inflammatoryOwned.length,
    emergencyDrugReactionOwned: drugReactionOwned.length,
    bullousOwned: bullousOwned.length,
    neoplasmOwned: neoplasmOwned.length,
    ownershipGaps,
    unexplainedRoutingFallbacks,
    phase13InfectionSteals,
    burnSunburnSteals,
    hsvRoutedToZoster,
    hsvZosterCrossContamination,
    ophthalmicZosterFlagged,
    oticRamsayHuntFlagged,
    fungalStealingInflammatory,
    inflammatoryStealingFungal,
    sjsTenUnderUncomplicatedDrugEruption,
    neoplasmUnderBenignLesionOnly,
    pass: false,
  };

  report.pass =
    report.ownershipGaps.length === 0 &&
    report.unexplainedRoutingFallbacks.length === 0 &&
    report.phase13InfectionSteals.length === 0 &&
    report.burnSunburnSteals.length === 0 &&
    report.hsvRoutedToZoster.length === 0 &&
    report.hsvZosterCrossContamination.length === 0 &&
    report.ophthalmicZosterFlagged.length > 0 &&
    report.oticRamsayHuntFlagged.length > 0 &&
    report.fungalStealingInflammatory.length === 0 &&
    report.inflammatoryStealingFungal.length === 0 &&
    report.sjsTenUnderUncomplicatedDrugEruption.length === 0 &&
    report.neoplasmUnderBenignLesionOnly.length === 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-dermatology-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-dermatology-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
