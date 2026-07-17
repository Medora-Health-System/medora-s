/**
 * Enterprise record-separation certification — no auto-order APIs in clinical intelligence.
 *   pnpm --filter @medora/api clinical:record-separation:enterprise-certify
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const WEB_LIB = resolve(__dirname, "../../../web/src/lib");
const AUTO_ORDER_PATTERNS = [
  /createOrder\s*\(/,
  /postOrder\s*\(/,
  /autoOrder\s*:\s*true/,
  /submitOrder\s*\(/,
  /ordersService\.create/,
  /fetch\s*\(\s*['"]\/api\/orders/,
];

function main() {
  const failures: string[] = [];
  const violations: Array<{ file: string; pattern: string }> = [];

  const intelFiles = readdirSync(WEB_LIB).filter(
    (f) =>
      (f.endsWith("ClinicalIntelligence.ts") || f.includes("ComplaintIntelligence")) && !f.endsWith(".test.ts"),
  );

  for (const file of intelFiles) {
    const src = readFileSync(join(WEB_LIB, file), "utf8");
    for (const pattern of AUTO_ORDER_PATTERNS) {
      if (pattern.test(src)) violations.push({ file, pattern: pattern.source });
    }
  }

  if (violations.length > 0) {
    failures.push(`Auto-order API usage in clinical intelligence: ${violations.map((v) => v.file).join(", ")}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scannedModules: intelFiles.length,
    autoOrderViolations: violations,
    failures,
    pass: failures.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
