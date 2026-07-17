/**
 * Enterprise clinical discharge family certification.
 *   pnpm --filter @medora/api clinical:discharge:enterprise-certify --write-reports
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ENTERPRISE_DISCHARGE_ROUTING_PREFIXES } from "./enterprise-discharge-routing-map";

const flag = (name: string) => process.argv.includes(`--${name}`);
const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();

const WEB_FILES = [
  resolve(__dirname, "../../../web/src/features/emergency/providerDischargeConditionFamilyResolver.ts"),
  resolve(__dirname, "../../../web/src/features/emergency/providerDischargeTemplateRegistry.ts"),
  resolve(__dirname, "../../../web/src/features/emergency/providerDischargeEnterpriseCertification.ts"),
];

function main() {
  const release = arg("release") ?? "2026";
  const failures: string[] = [];
  const families = ENTERPRISE_DISCHARGE_ROUTING_PREFIXES.map((e) => e.family);
  const uniqueFamilies = new Set(families);
  if (uniqueFamilies.size !== families.length) {
    const dupes = families.filter((f, i) => families.indexOf(f) !== i);
    failures.push(`Duplicate discharge family IDs in enterprise map: ${[...new Set(dupes)].join(", ")}`);
  }

  for (const path of WEB_FILES) {
    if (!existsSync(path)) failures.push(`Missing discharge module: ${path}`);
  }

  if (uniqueFamilies.size < 30) failures.push(`Expected >= 30 unique discharge families, got ${uniqueFamilies.size}`);

  const report = {
    generatedAt: new Date().toISOString(),
    uniqueDischargeFamilyCount: uniqueFamilies.size,
    prefixEntryCount: ENTERPRISE_DISCHARGE_ROUTING_PREFIXES.length,
    webModulesPresent: WEB_FILES.length - failures.filter((f) => f.startsWith("Missing")).length,
    failures,
    pass: failures.length === 0,
  };

  const summary = JSON.stringify(report, null, 2);
  if (flag("write-reports")) {
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-enterprise-discharge-summary.json"), summary);
  }
  console.log(summary);
  process.exit(report.pass ? 0 : 2);
}

main();
