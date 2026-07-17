/**
 * Enterprise i18n key parity for Phase 18 psych + sample specialty namespaces.
 *   pnpm --filter @medora/api clinical:i18n:enterprise-certify
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const I18N_DIR = resolve(__dirname, "../../../web/src/i18n/messages");

const PARITY_PAIRS: Array<{ label: string; en: string; fr: string }> = [
  {
    label: "Phase 18 psychiatric behavioral",
    en: "providerDocumentationPsychiatricBehavioralComplaintIntel.en.ts",
    fr: "providerDocumentationPsychiatricBehavioralComplaintIntel.fr.ts",
  },
  {
    label: "Phase 16 toxicology",
    en: "providerDocumentationToxicologyComplaintIntel.en.ts",
    fr: "providerDocumentationToxicologyComplaintIntel.fr.ts",
  },
  {
    label: "Phase 14 dermatology",
    en: "providerDocumentationDermatologyComplaintIntel.en.ts",
    fr: "providerDocumentationDermatologyComplaintIntel.fr.ts",
  },
  {
    label: "Phase 17 OB/GYN urology",
    en: "providerDocumentationObGynUrologyComplaintIntel.en.ts",
    fr: "providerDocumentationObGynUrologyComplaintIntel.fr.ts",
  },
];

function extractLeafKeys(content: string): Set<string> {
  const keys = new Set<string>();
  for (const match of content.matchAll(/^\s+([A-Za-z0-9_]+):\s/mg)) {
    keys.add(match[1]!);
  }
  return keys;
}

function main() {
  const failures: string[] = [];
  const pairReports: Array<{ label: string; enCount: number; frCount: number; missingInFr: string[]; missingInEn: string[] }> = [];

  for (const pair of PARITY_PAIRS) {
    const enPath = resolve(I18N_DIR, pair.en);
    const frPath = resolve(I18N_DIR, pair.fr);
    if (!existsSync(enPath) || !existsSync(frPath)) {
      failures.push(`${pair.label}: missing message file(s)`);
      continue;
    }
    const enKeys = extractLeafKeys(readFileSync(enPath, "utf8"));
    const frKeys = extractLeafKeys(readFileSync(frPath, "utf8"));
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k)).slice(0, 20);
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k)).slice(0, 20);
    if (missingInFr.length > 0 || missingInEn.length > 0) {
      failures.push(`${pair.label}: key parity mismatch (fr missing ${missingInFr.length}, en missing ${missingInEn.length})`);
    }
    pairReports.push({
      label: pair.label,
      enCount: enKeys.size,
      frCount: frKeys.size,
      missingInFr,
      missingInEn,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    pairs: pairReports,
    failures,
    pass: failures.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 2);
}

main();
