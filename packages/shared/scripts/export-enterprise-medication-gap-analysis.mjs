import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { runEnterpriseMedicationGapAnalysisReport } from "../dist/medication/enterpriseMedicationGapAnalysis.js";

const report = runEnterpriseMedicationGapAnalysisReport();
const outPath = new URL("../../../exports/enterprise-medication-gap-analysis.json", import.meta.url);
mkdirSync(dirname(outPath.pathname), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath.pathname}`);
