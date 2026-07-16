import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectSpineBackScopedCodes,
  selectSpineEmergencyScopedCodes,
  selectVertebralFractureScopedCodes,
} from "./icd10-spine-back-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

/** Deterministic ownership checks for spine/back routing de-collision (no DB required). */
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

  const scoped = selectSpineBackScopedCodes(validation.parse.rows, { billableOnly: true });
  const emergencies = selectSpineEmergencyScopedCodes(validation.parse.rows, { billableOnly: true });
  const fractures = selectVertebralFractureScopedCodes(validation.parse.rows, { billableOnly: true });

  const radiculopathyOwned = scoped.filter(
    (row) => starts(row.code, "M54.1") || starts(row.code, "M54.3") || starts(row.code, "M54.4"),
  );
  const caudaOwned = scoped.filter((row) => starts(row.code, "G83.4"));
  const cordOwned = emergencies.filter(
    (row) => starts(row.code, "S14") || starts(row.code, "S24") || starts(row.code, "S34"),
  );
  const infectionOwned = emergencies.filter(
    (row) => starts(row.code, "M46") || starts(row.code, "G06.1") || starts(row.code, "G06.2"),
  );

  // Fail if emergency/infection/cord codes somehow appear outside emergency selector.
  const cordEmergencyUnderRouting = scoped
    .filter((row) => starts(row.code, "S14") || starts(row.code, "S24") || starts(row.code, "S34") || starts(row.code, "G83.4"))
    .filter((row) => !emergencies.some((e) => e.code === row.code) && !caudaOwned.some((c) => c.code === row.code))
    .map((row) => row.code);

  const infectionUnderRouting = scoped
    .filter((row) => starts(row.code, "M46") || starts(row.code, "G06.1") || starts(row.code, "G06.2"))
    .filter((row) => !infectionOwned.some((c) => c.code === row.code))
    .map((row) => row.code);

  const fractureUnderRouting = scoped
    .filter((row) => {
      const c = norm(row.code);
      return (
        c.startsWith("S12") ||
        c.startsWith("S220") ||
        c.startsWith("S221") ||
        c.startsWith("S320") ||
        c.startsWith("S321") ||
        c.startsWith("S322")
      );
    })
    .filter((row) => !fractures.some((f) => f.code === row.code))
    .map((row) => row.code);

  const symptomRoutingSteals = scoped.filter((row) => /^R10|^K|^N20|^N23/.test(row.code)).map((row) => row.code);

  // Sprain/strain descriptions must not own cord/infection emergencies.
  const genericSprainSteals = scoped
    .filter((row) => /sprain|strain/i.test(row.shortDescription))
    .filter(
      (row) =>
        starts(row.code, "G83.4") ||
        starts(row.code, "S14") ||
        starts(row.code, "S24") ||
        starts(row.code, "S34") ||
        starts(row.code, "M46") ||
        starts(row.code, "G06"),
    )
    .map((row) => row.code);

  // Generic back-pain steal = radiculopathy/sciatica/cauda missing from specific ownership buckets.
  const genericBackPainSteals =
    radiculopathyOwned.length === 0 || caudaOwned.length === 0
      ? ["M54.1*/M54.3/M54.4/G83.4 ownership incomplete"]
      : [];

  const report = {
    spineBackScoped: scoped.length,
    radiculopathyOwned: radiculopathyOwned.length,
    caudaOwned: caudaOwned.length,
    cordOwned: cordOwned.length,
    infectionOwned: infectionOwned.length,
    vertebralFractureOwned: fractures.length,
    genericBackPainSteals,
    genericSprainSteals,
    fractureUnderRouting,
    cordEmergencyUnderRouting,
    infectionUnderRouting,
    symptomRoutingSteals,
    unexplainedFallbacks: [] as string[],
    pass: false,
  };

  report.pass =
    report.genericBackPainSteals.length === 0 &&
    report.genericSprainSteals.length === 0 &&
    report.fractureUnderRouting.length === 0 &&
    report.cordEmergencyUnderRouting.length === 0 &&
    report.infectionUnderRouting.length === 0 &&
    report.symptomRoutingSteals.length === 0 &&
    report.unexplainedFallbacks.length === 0 &&
    report.radiculopathyOwned > 0 &&
    report.caudaOwned > 0 &&
    report.cordOwned > 0 &&
    report.infectionOwned > 0 &&
    report.vertebralFractureOwned > 0;

  const summary = JSON.stringify(report, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(join(dir, release), { recursive: true });
  writeFileSync(join(dir, "fy2026-spine-back-routing-summary.json"), summary);
  writeFileSync(join(dir, release, "fy2026-spine-back-routing-summary.json"), summary);
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
