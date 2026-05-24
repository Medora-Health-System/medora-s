/**
 * Phase 19U.4 — whole-EMR static scan helpers (test infrastructure only).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { LanguageBoundaryAllowlistEntry } from "./i18nLanguageBoundary.allowlist";

export type LocaleRegressionComponentContract = {
  relPath: string;
  description: string;
  mustImportAny: readonly string[];
  mustContain: readonly string[];
  mustNotContain: readonly string[];
};

/** Whole-EMR UI source roots (relative to apps/web/). */
export const WHOLE_EMR_SCAN_ROOTS = [
  "app",
  "src/components",
  "src/features",
  "src/lib",
  "src/constants",
  "src/hooks",
] as const;

/**
 * Paths excluded from hardcoded-French source scan (not user-facing UI chrome).
 * Relative to apps/web/.
 */
export const WHOLE_EMR_SCAN_EXCLUDED_REL_PATHS = [
  "src/i18n/messages/en.ts",
  "src/i18n/messages/fr.ts",
  "src/i18n/messages/erTriage.en.ts",
  "src/i18n/messages/erTriage.fr.ts",
  "src/lib/uiLabels.ts",
  "src/lib/localizedMedicationDisplay.ts",
  "src/constants/orderStatusLabels.ts",
  "src/i18n/messages/localeLeakScan19U4.ts",
  "src/i18n/messages/wholeEmrLocaleScan19U4.ts",
  "src/i18n/messages/i18nLanguageBoundary.allowlist.ts",
] as const;

/** Fixture / chart-example markers — scans skip lines containing these. */
export const CLINICAL_FREE_TEXT_FIXTURE_MARKERS = [
  "custom home med comprimé",
  "manualLabel:",
  "medicationsSummary",
  "FIXTURE",
  "fixture",
  "exampleChartNote",
  "sampleHpi",
  "mockPatient",
  "test-only",
] as const;

const NORMALIZATION_EXEMPT_MARKERS = [
  "normalizeMedicationDisplayForLocale",
  "formatCatalogMedicationSubtitleForLocale",
  "formatCatalogMedicationOrderDetailLine",
  "formatCatalogMedicationMetadataParts",
  "formatMedicationOptionForLocale",
  "getOrderItemDisplayLabelForLanguage",
  "catalogSearchItemFullDisplayLine",
  "catalogMedicationNameForLocale",
  "compactMedicationRoute",
] as const;

const STORAGE_OR_LOGIC_LINE =
  /(?:^|\s)(?:const|let|var)\s+\w+\s*=|_dosageForm\s*[:=]|_route\s*[:=]|therapeuticClass\s*:|dosageForm\s*\?:|route\s*\?:|metadata\?\.(?:dosageForm|route|therapeuticClass)\s*\?\?|catalogSearchHaystack|medicationSafetyHaystack|orderLineToMedicationSafetyCatalogInput|marOrderItemToSafetyCatalogInput|createOrderLineToAdvancedMedicationSafetyLine|orderItemLikeToAdvancedMedicationSafetyLine|getMedicationSafetyWarnings|printRx|type\s+\w+/;

const RAW_CATALOG_JSX_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /value=\{[^}]*(?:_dosageForm|metadata\?\.dosageForm)[^}]*\}/, label: "raw dosageForm input value" },
  {
    re: /\{[^}]*(?:metadata\?\.dosageForm|metadata\?\.route|metadata\?\.therapeuticClass)[^}]*\}/,
    label: "raw metadata field in JSX expression",
  },
  { re: /\{\[[^\]]*\bdosageForm\b[^\]]*\]/, label: "raw dosageForm array render" },
  {
    re: /\[[^\]]*(?:secondaryText|meta\?\.dosageForm|meta\?\.route)[^\]]*\]\.filter\(Boolean\)\.join/,
    label: "raw catalog metadata joined for display",
  },
];

function lineIsCommentOrBlank(line: string): boolean {
  const t = line.trim();
  return !t || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("*/");
}

function lineIsClinicalFixture(line: string): boolean {
  return CLINICAL_FREE_TEXT_FIXTURE_MARKERS.some((m) => line.includes(m));
}

export function isWholeEmrScanExcludedRelPath(relPath: string): boolean {
  if (WHOLE_EMR_SCAN_EXCLUDED_REL_PATHS.includes(relPath as (typeof WHOLE_EMR_SCAN_EXCLUDED_REL_PATHS)[number])) {
    return true;
  }
  if (relPath.includes("i18n/messages/") && !relPath.endsWith(".tsx")) return true;
  if (relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx") || relPath.endsWith(".spec.ts")) return true;
  if (relPath.includes("/docs/") || relPath.includes("/fixtures/")) return true;
  return false;
}

export function isHardcodedFrenchAllowlisted(
  relPath: string,
  token: string,
  allowlist: readonly LanguageBoundaryAllowlistEntry[]
): boolean {
  return allowlist.some(
    (entry) =>
      entry.scope === "hardcodedFrenchSource" &&
      entry.path === relPath &&
      (entry.token === token || entry.token === "*")
  );
}

export function scanSourceLineForHardcodedFrenchToken(line: string, token: string): boolean {
  if (lineIsCommentOrBlank(line)) return false;
  if (lineIsClinicalFixture(line)) return false;
  return line.includes(token);
}

export function scanSourceForHardcodedFrenchTokens(
  source: string,
  relPath: string,
  tokens: readonly string[],
  allowlist: readonly LanguageBoundaryAllowlistEntry[]
): string[] {
  if (
    allowlist.some(
      (entry) =>
        entry.scope === "hardcodedFrenchSource" && entry.path === relPath && entry.token === "*"
    )
  ) {
    return [];
  }
  const violations: string[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const token of tokens) {
      if (!scanSourceLineForHardcodedFrenchToken(line, token)) continue;
      if (isHardcodedFrenchAllowlisted(relPath, token, allowlist)) continue;
      violations.push(`${relPath}:${i + 1}: "${token}" — ${line.trim().slice(0, 100)}`);
    }
  }
  return violations;
}

export function walkWholeEmrSourceFiles(webRoot: string): string[] {
  const acc: string[] = [];
  for (const dir of WHOLE_EMR_SCAN_ROOTS) {
    walkDir(join(webRoot, dir), webRoot, acc);
  }
  return acc;
}

function walkDir(full: string, webRoot: string, acc: string[]): void {
  if (!statSync(full).isDirectory()) return;
  for (const name of readdirSync(full)) {
    const path = join(full, name);
    const rel = relative(webRoot, path);
    if (rel.includes("node_modules")) continue;
    if (isWholeEmrScanExcludedRelPath(rel)) continue;
    const st = statSync(path);
    if (st.isDirectory()) {
      walkDir(path, webRoot, acc);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      acc.push(path);
    }
  }
}

function lineHasNormalizationExemption(line: string): boolean {
  return NORMALIZATION_EXEMPT_MARKERS.some((m) => line.includes(m));
}

function lineIsStorageOrLogic(line: string): boolean {
  return STORAGE_OR_LOGIC_LINE.test(line);
}

export function scanSourceForRawCatalogDisplayLeaks(source: string, relPath: string): string[] {
  const violations: string[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (lineIsCommentOrBlank(line)) continue;
    if (lineIsClinicalFixture(line)) continue;
    if (lineHasNormalizationExemption(line)) continue;
    if (lineIsStorageOrLogic(line)) continue;
    for (const { re, label } of RAW_CATALOG_JSX_PATTERNS) {
      if (re.test(line)) {
        violations.push(`${relPath}:${i + 1} ${label}: ${line.trim().slice(0, 120)}`);
      }
    }
  }
  return violations;
}

export function walkWebSourceFiles(webRoot: string, dirs: readonly string[]): string[] {
  const acc: string[] = [];
  for (const dir of dirs) {
    walkDir(join(webRoot, dir), webRoot, acc);
  }
  return acc;
}

export function assertComponentLocaleContract(
  source: string,
  contract: LocaleRegressionComponentContract
): string[] {
  const violations: string[] = [];
  for (const imp of contract.mustImportAny) {
    if (!source.includes(imp)) {
      violations.push(`${contract.relPath}: missing required import/helper "${imp}" (${contract.description})`);
    }
  }
  for (const needle of contract.mustContain) {
    if (!source.includes(needle)) {
      violations.push(`${contract.relPath}: missing required pattern "${needle}" (${contract.description})`);
    }
  }
  for (const forbidden of contract.mustNotContain) {
    if (source.includes(forbidden)) {
      violations.push(
        `${contract.relPath}: forbidden raw display pattern "${forbidden}" (${contract.description})`
      );
    }
  }
  return violations;
}

export function readWebSource(webRoot: string, relPath: string): string {
  return readFileSync(join(webRoot, relPath), "utf8");
}

/** Word-boundary match for FR catalog English chrome detection. */
export function frenchMessageValueContainsEnglishUiToken(value: string, token: string): boolean {
  if (token.includes(" ")) {
    return value.includes(token);
  }
  const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(value);
}

export function isFrEnglishTokenAllowlisted(
  messagePath: string,
  token: string,
  allowlist: readonly LanguageBoundaryAllowlistEntry[]
): boolean {
  return allowlist.some(
    (entry) =>
      entry.scope === "frMessage" &&
      (entry.path === messagePath || messagePath.startsWith(`${entry.path}.`)) &&
      (entry.token === token || entry.token === "*")
  );
}
