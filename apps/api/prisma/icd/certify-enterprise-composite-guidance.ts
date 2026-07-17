/**
 * Enterprise composite guidance certification.
 *   pnpm --filter @medora/api clinical:composite-guidance:enterprise-certify
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  assertCompositeModuleShape,
  compositeSectionsHaveDuplicateKeys,
} from "./enterprise-composite-guidance-checks";

const WEB_LIB = resolve(__dirname, "../../../web/src/lib");

const REQUIRED_INTEL_MODULES = [
  "softTissueInfectionClinicalIntelligence.ts",
  "toxicIngestionOverdoseClinicalIntelligence.ts",
  "deliriumCatatoniaCognitiveBehaviorChangeClinicalIntelligence.ts",
  "renalUrinaryEmergencyClinicalIntelligence.ts",
  "psychosisManiaBehavioralCrisisClinicalIntelligence.ts",
  "dermatologicEmergencyClinicalIntelligence.ts",
  "entThroatNeckAirwayClinicalIntelligence.ts",
  "heatEnvironmentalIllnessClinicalIntelligence.ts",
];

function main() {
  const failures: string[] = [];
  const missingModules = REQUIRED_INTEL_MODULES.filter((name) => !existsSync(join(WEB_LIB, name)));
  if (missingModules.length > 0) failures.push(`Missing composite intel modules: ${missingModules.join(", ")}`);

  const sampleComposite = {
    hpi: ["hpi.onset", "hpi.location"],
    ros: ["ros.fever", "ros.fever"],
    exam: ["exam.tender"],
  };
  if (!compositeSectionsHaveDuplicateKeys(sampleComposite)) {
    failures.push("Duplicate detection failed on known duplicate fixture");
  }
  if (compositeSectionsHaveDuplicateKeys({ hpi: ["a", "b"], exam: ["c"] })) {
    failures.push("False positive duplicate detection on unique keys");
  }

  const goldStandardFiles = readdirSync(WEB_LIB).filter((f) => f.includes("IntelGoldStandard"));
  const exportChecks = assertCompositeModuleShape(goldStandardFiles, [
    "providerDocumentationSoftTissueWoundInfectionIntelGoldStandard.ts",
    "providerDocumentationToxicologyIntelGoldStandard.ts",
    "providerDocumentationPsychiatricBehavioralIntelGoldStandard.ts",
  ]);
  if (exportChecks.length > 0) failures.push(`Missing gold standard modules: ${exportChecks.join(", ")}`);

  for (const mod of ["providerDocumentationComplaintIntelligence.ts"]) {
    const src = readFileSync(join(WEB_LIB, mod), "utf8");
    if (!src.includes("complaintIntelligenceHasDuplicateKeys")) {
      failures.push(`${mod} missing complaintIntelligenceHasDuplicateKeys guard`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    requiredModules: REQUIRED_INTEL_MODULES.length,
    missingModules,
    goldStandardModuleCount: goldStandardFiles.length,
    failures,
    pass: failures.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
