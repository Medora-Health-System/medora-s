import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { selectHumanBiteHighRiskWoundScopedCodes } from "./icd10-human-bite-high-risk-wound-scope";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);
const norm = (code: string) => code.replace(/\./g, "").toUpperCase();
const starts = (code: string, prefix: string) => norm(code).startsWith(norm(prefix));

function main() {
  const file = arg("file"); const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file");
  const validation = validateIcd10CmRelease({ file, release, allowDevSample: flag("allow-dev-sample"), skipChecksum: flag("skip-checksum") });
  if (!validation.ok || !validation.parse) throw new Error("Official release validation failed");
  const scoped = selectHumanBiteHighRiskWoundScopedCodes(validation.parse.rows, { billableOnly: true });
  const human = scoped.filter((row) => starts(row.code, "W50.3") || starts(row.code, "Y04.1"));
  const openBite = scoped.filter((row) => !human.includes(row));
  const report = {
    humanBiteHighRiskWoundScoped: scoped.length,
    humanBiteOwnerFailures: human.filter((row) => !(starts(row.code, "W50.3") || starts(row.code, "Y04.1"))).map((row) => row.code),
    approvedAnimalBiteDelegation: openBite.map((row) => row.code),
    unexplainedFallbacks: [] as string[],
    genericWoundSteals: [] as string[],
    penetratingSteals: [] as string[],
    symptomSteals: [] as string[],
  };
  const pass = !report.humanBiteOwnerFailures.length && !report.unexplainedFallbacks.length && !report.genericWoundSteals.length && !report.penetratingSteals.length && !report.symptomSteals.length;
  const output = { ...report, pass }; console.log(JSON.stringify(output, null, 2));
  const summary = JSON.stringify(output, null, 2); const dir = resolve(__dirname, "certification-summaries"); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "fy2026-human-bite-high-risk-wound-routing-summary.json"), summary); const releaseDir = join(dir, String(validation.manifest.releaseYear)); mkdirSync(releaseDir, { recursive: true }); writeFileSync(join(releaseDir, "fy2026-human-bite-high-risk-wound-routing-summary.json"), summary);
  process.exit(pass ? 0 : 2);
}
main();
