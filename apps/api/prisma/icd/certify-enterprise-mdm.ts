/**
 * Enterprise MDM generator governance scan.
 *   pnpm --filter @medora/api clinical:mdm:enterprise-certify
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB_LIB = resolve(__dirname, "../../../web/src/lib");
const FORBIDDEN_PRODUCTION_PATTERNS = [
  /generateMdmFromAi\s*\(/,
  /openai\.chat\.completions/,
  /anthropic\.messages/,
  /autoGenerateMdm\s*\(/,
  /llmGenerate/i,
];

function main() {
  const failures: string[] = [];
  const flagged: Array<{ file: string; pattern: string }> = [];

  const intelFiles = readdirSync(WEB_LIB).filter(
    (f) => f.endsWith("ClinicalIntelligence.ts") && !f.endsWith(".test.ts"),
  );

  for (const file of intelFiles) {
    const src = readFileSync(join(WEB_LIB, file), "utf8");
    if (file.endsWith(".test.ts")) continue;
    for (const pattern of FORBIDDEN_PRODUCTION_PATTERNS) {
      if (pattern.test(src)) flagged.push({ file, pattern: pattern.source });
    }
  }

  if (flagged.length > 0) {
    failures.push(
      `Unsupported MDM generators in production intel modules: ${flagged.map((f) => `${f.file}:${f.pattern}`).join("; ")}`,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scannedClinicalIntelligenceModules: intelFiles.length,
    unsupportedGeneratorHits: flagged.length,
    flagged,
    failures,
    pass: failures.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
