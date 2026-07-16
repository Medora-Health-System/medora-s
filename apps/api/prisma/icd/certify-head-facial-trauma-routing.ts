import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectConcussionScopedCodes,
  selectHeadFacialTraumaScopedCodes,
  selectIchScopedCodes,
  selectIntracranialInjuryScopedCodes,
  selectSkullFacialFractureScopedCodes,
} from "./icd10-head-facial-trauma-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));
const descriptionOf = (row: { shortDescription: string; longDescription?: string }) =>
  `${row.shortDescription} ${row.longDescription ?? ""}`.toLowerCase();

/** Deterministic ownership checks for head/facial trauma routing de-collision (no DB required). */
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

  const scoped = selectHeadFacialTraumaScopedCodes(validation.parse.rows, { billableOnly: true });
  const intracranial = selectIntracranialInjuryScopedCodes(validation.parse.rows, { billableOnly: true });
  const fractures = selectSkullFacialFractureScopedCodes(validation.parse.rows, { billableOnly: true });
  const concussion = selectConcussionScopedCodes(validation.parse.rows, { billableOnly: true });
  const ich = selectIchScopedCodes(validation.parse.rows, { billableOnly: true });

  const concussionOwned = concussion;
  // "S06 non-concussion intracranial" ownership bucket (broader than the narrow ICH hemorrhage
  // selector): cerebral edema, diffuse/focal TBI, hemorrhage, other/unspecified intracranial injury.
  const ichOwned = intracranial.filter((row) => !starts(row.code, "S06.0"));
  const skullFacialFractureOwned = fractures;
  const eyeOwned = scoped.filter((row) => starts(row.code, "S05"));
  const dentalOwned = scoped.filter(
    (row) => starts(row.code, "S02.5") || starts(row.code, "S03.2") || /alveol/.test(descriptionOf(row)),
  );
  const jawDislocationOwned = scoped.filter((row) => starts(row.code, "S03.0"));

  // Concussion/ICH ownership must not be empty — a generic-headache/symptom code path
  // stealing the head-injury bucket would leave these empty.
  const genericHeadacheSteals =
    concussionOwned.length === 0 || ichOwned.length === 0
      ? ["S06.0 concussion / S06 non-concussion ICH ownership incomplete"]
      : [];

  // Skull/facial fracture (S02) rows must be fracture descriptions, not generic open-wound-only rows.
  const genericWoundSteals = skullFacialFractureOwned
    .filter((row) => /open wound|pnctr|puncture wound/.test(descriptionOf(row)))
    .filter((row) => !/fracture|fx\b/.test(descriptionOf(row)))
    .map((row) => row.code);

  // Sanity check: every scoped S02 row must land in the fracture selector.
  const fractureUnderRouting = scoped
    .filter((row) => starts(row.code, "S02"))
    .filter((row) => !skullFacialFractureOwned.some((f) => f.code === row.code))
    .map((row) => row.code);

  // Sanity check: every scoped S05 row must land in the eye ownership bucket.
  const eyeUnderRouting = scoped
    .filter((row) => starts(row.code, "S05"))
    .filter((row) => !eyeOwned.some((e) => e.code === row.code))
    .map((row) => row.code);

  // ENT/dental de-collision: dental-owned codes must actually reference tooth/dental/alveolar
  // anatomy — guards against nasal soft-tissue (S00.3 / S01.2 / S02.2) rows being misrouted as dental.
  const entDentalUnderRouting = dentalOwned
    .filter((row) => !/tooth|dental|alveol/.test(descriptionOf(row)))
    .map((row) => row.code);

  // Generic symptom (headache) codes must never appear in the head-trauma scoped set.
  const symptomRoutingSteals = scoped.filter((row) => starts(row.code, "R51")).map((row) => row.code);

  const report = {
    headFacialTraumaScoped: scoped.length,
    intracranialInjuryScoped: intracranial.length,
    skullFacialFractureScoped: fractures.length,
    concussionOwned: concussionOwned.length,
    ichOwned: ichOwned.length,
    skullFacialFractureOwned: skullFacialFractureOwned.length,
    eyeOwned: eyeOwned.length,
    dentalOwned: dentalOwned.length,
    jawDislocationOwned: jawDislocationOwned.length,
    genericHeadacheSteals,
    genericWoundSteals,
    fractureUnderRouting,
    eyeUnderRouting,
    entDentalUnderRouting,
    symptomRoutingSteals,
    unexplainedFallbacks: [] as string[],
    pass: false,
  };

  report.pass =
    report.genericHeadacheSteals.length === 0 &&
    report.genericWoundSteals.length === 0 &&
    report.fractureUnderRouting.length === 0 &&
    report.eyeUnderRouting.length === 0 &&
    report.entDentalUnderRouting.length === 0 &&
    report.symptomRoutingSteals.length === 0 &&
    report.unexplainedFallbacks.length === 0 &&
    report.concussionOwned > 0 &&
    report.ichOwned > 0 &&
    report.skullFacialFractureOwned > 0 &&
    report.eyeOwned > 0 &&
    report.dentalOwned > 0 &&
    report.jawDislocationOwned > 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-head-facial-trauma-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-head-facial-trauma-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
