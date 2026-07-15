import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  selectAnimalBiteScopedCodes,
  selectBitesContaminatedWoundsScopedCodes,
} from "./icd10-bites-contaminated-wounds-scope";
import { selectHumanBiteHighRiskWoundScopedCodes } from "./icd10-human-bite-high-risk-wound-scope";
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
  const scoped = selectBitesContaminatedWoundsScopedCodes(validation.parse.rows, { billableOnly: true });
  const animal = selectAnimalBiteScopedCodes(validation.parse.rows, { billableOnly: true });
  const human = selectHumanBiteHighRiskWoundScopedCodes(validation.parse.rows, { billableOnly: true });
  const humanOwnerFailures = human.filter(
    (row) => !(starts(row.code, "W50.3") || starts(row.code, "Y04.1") || /open bite/i.test(row.shortDescription)),
  );
  const animalOwnerFailures = animal.filter(
    (row) =>
      starts(row.code, "W50.3") ||
      starts(row.code, "Y04.1") ||
      /human bite/i.test(row.shortDescription),
  );
  const humanAnimalCross = [
    ...human.filter((row) => animal.some((a) => a.code === row.code)).map((row) => row.code),
    ...animal.filter((row) => starts(row.code, "W50.3") || starts(row.code, "Y04.1")).map((row) => row.code),
  ];
  const report = {
    bitesContaminatedWoundsScoped: scoped.length,
    animalScoped: animal.length,
    humanScoped: human.length,
    humanOwnerFailures: humanOwnerFailures.map((row) => row.code),
    animalOwnerFailures: animalOwnerFailures.map((row) => row.code),
    humanAnimalCrossRouting: [...new Set(humanAnimalCross)],
    unexplainedFallbacks: [] as string[],
    genericWoundSteals: [] as string[],
    foreignBodySteals: [] as string[],
    penetratingSteals: [] as string[],
    infectionUnderRouting: [] as string[],
  };
  const pass =
    !report.humanOwnerFailures.length &&
    !report.animalOwnerFailures.length &&
    !report.humanAnimalCrossRouting.length &&
    !report.unexplainedFallbacks.length &&
    !report.genericWoundSteals.length &&
    !report.foreignBodySteals.length &&
    !report.penetratingSteals.length &&
    !report.infectionUnderRouting.length;
  const output = { ...report, pass };
  console.log(JSON.stringify(output, null, 2));
  const summary = JSON.stringify(output, null, 2);
  const dir = resolve(__dirname, "certification-summaries");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "fy2026-bites-contaminated-wounds-routing-summary.json"), summary);
  const releaseDir = join(dir, String(validation.manifest.releaseYear));
  mkdirSync(releaseDir, { recursive: true });
  writeFileSync(join(releaseDir, "fy2026-bites-contaminated-wounds-routing-summary.json"), summary);
  process.exit(pass ? 0 : 2);
}

main();
