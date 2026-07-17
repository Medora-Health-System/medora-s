/**
 * Enterprise governance reconcile — hashes and counts for Phase 19 certifiers.
 *   pnpm --filter @medora/api clinical:governance:enterprise-reconcile --write-reports
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ENTERPRISE_SPECIALTY_PHASES } from "./enterprise-diagnostic-intelligence-registry";

const flag = (name: string) => process.argv.includes(`--${name}`);
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function main() {
  const release = arg("release") ?? "2026";
  const icdDir = resolve(__dirname);
  const certifierFiles = readdirSync(icdDir).filter(
    (f) => f.startsWith("certify-enterprise") || f.startsWith("certify-icd10-enterprise") || f === "enterprise-diagnostic-intelligence-registry.ts",
  );

  const fileHashes = certifierFiles.map((name) => ({
    name,
    sha256: sha256(readFileSync(join(icdDir, name), "utf8")),
  }));

  const summaryDir = join(icdDir, "certification-summaries", release);
  const summaryFiles = existsSync(summaryDir)
    ? readdirSync(summaryDir).filter((f) => f.includes("enterprise") || f.startsWith("fy2026-"))
    : [];

  const report = {
    generatedAt: new Date().toISOString(),
    specialtyPhaseCount: ENTERPRISE_SPECIALTY_PHASES.length,
    enterpriseCertifierFileCount: certifierFiles.length,
    certifierFileHashes: fileHashes,
    releaseSummaryFileCount: summaryFiles.length,
    releaseSummaryFiles: summaryFiles.sort(),
    governanceNotes: "Enterprise certifier scaffolding Phase 19 Commit 2; re-run certifiers after scope changes.",
    pass: certifierFiles.length >= 10,
  };

  const summary = JSON.stringify(report, null, 2);
  if (flag("write-reports")) {
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-enterprise-governance-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-enterprise-governance-summary.json"), summary);
  }
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
