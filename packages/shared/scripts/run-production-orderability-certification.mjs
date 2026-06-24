#!/usr/bin/env node
/**
 * MEDUI.MEDICATION.PRODUCTION_ORDERABILITY_CERTIFICATION.1
 * Run: node packages/shared/scripts/run-production-orderability-certification.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProductionOrderabilityCertificationReport } from "../dist/medication/productionOrderabilityCertification.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");
const outDir = join(repoRoot, "exports");
mkdirSync(outDir, { recursive: true });

const report = buildProductionOrderabilityCertificationReport();
const outPath = join(outDir, "production-orderability-certification.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify({
  finalDecision: report.finalDecision,
  summary: report.summary,
  criticalBlockers: report.remediation.critical.length,
  highBlockers: report.remediation.high.length,
  mediumBlockers: report.remediation.medium.length,
  exportPath: outPath,
}, null, 2));
