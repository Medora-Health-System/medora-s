#!/usr/bin/env node
/**
 * Generates enterprise formulary expansion wave audit exports (audit-only).
 * Usage: node packages/shared/scripts/generate-enterprise-formulary-expansion-wave-audit.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "../../..");

const {
  formatEnterpriseFormularyExpansionWaveAuditMarkdown,
  resetEnterpriseFormularyExpansionWaveAuditCaches,
  runEnterpriseFormularyExpansionWaveAudit,
} = await import("../dist/medication/enterpriseFormularyExpansionWaveAudit.js");
const { prewarmProviderOrderableCatalogCodesRegistry } = await import(
  "../dist/medication/providerOrderableCatalogCodesRegistry.js"
);

resetEnterpriseFormularyExpansionWaveAuditCaches();
prewarmProviderOrderableCatalogCodesRegistry();

const audit = runEnterpriseFormularyExpansionWaveAudit();
const exportsDir = join(repoRoot, "exports");
mkdirSync(exportsDir, { recursive: true });

writeFileSync(
  join(exportsDir, "enterprise-formulary-expansion-wave-audit.json"),
  JSON.stringify(audit, null, 2),
  "utf8"
);

writeFileSync(
  join(exportsDir, "enterprise-formulary-expansion-wave-summary.md"),
  formatEnterpriseFormularyExpansionWaveAuditMarkdown(audit),
  "utf8"
);

console.log("Wrote exports/enterprise-formulary-expansion-wave-audit.json");
console.log("Wrote exports/enterprise-formulary-expansion-wave-summary.md");
console.log(`FinalDecision: ${audit.finalDecision}`);
