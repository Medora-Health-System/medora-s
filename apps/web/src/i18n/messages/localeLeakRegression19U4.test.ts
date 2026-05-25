import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import {
  CATALOG_LEAK_KNOWN_DEFERRED_SURFACES,
  CATALOG_LEAK_SCAN_DEFERRED_FILES,
  CATALOG_LEAK_SCAN_DIRS,
  EN_FORBIDDEN_CATALOG_METADATA_TOKENS,
  EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS,
  EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES,
  LOCALE_REGRESSION_COMPONENT_CONTRACTS,
} from "./i18nLanguageBoundary.allowlist";
import {
  assertComponentLocaleContract,
  readWebSource,
  scanSourceForRawCatalogDisplayLeaks,
  walkWebSourceFiles,
} from "./localeLeakScan19U4";
import {
  englishMedicationDisplayContainsFrench,
  formatCatalogMedicationSubtitleForLocale,
  formatMedicationOptionForLocale,
} from "@/lib/localizedMedicationDisplay";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";
import { i18nMessage } from "@/lib/i18nMessagesLookup";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const repoRoot = join(webRoot, "../..");

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") {
    return prefix ? [{ path: prefix, value: obj }] : [];
  }
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return [];
  }
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectStringLeaves(val, next));
  }
  return out;
}

function isDeferredEnPath(path: string): boolean {
  if (EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS.has(path)) return true;
  return EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

function frenchCatalogItem(): CatalogSearchItem {
  return {
    id: "med-fr-gate",
    code: "MET500",
    type: "MEDICATION",
    displayNameEn: "Metformin",
    displayNameFr: "Metformine",
    secondaryText: "500 mg · comprimé",
    metadata: {
      strength: "500 mg",
      dosageForm: "comprimé",
      route: "orale",
      therapeuticClass: "Antidiabétique",
    },
  };
}

const tEn = (key: string) => i18nMessage("en", key);

/** Phase 19U.4 — CI regression gates for English/French UI contamination and catalog leaks. */
describe("locale leak regression gates (19U.4)", () => {
  it("English en.ts has no forbidden catalog metadata classification tokens outside allowlist", () => {
    for (const { path, value } of collectStringLeaves(en)) {
      if (isDeferredEnPath(path)) continue;
      const lower = value.toLowerCase();
      for (const token of EN_FORBIDDEN_CATALOG_METADATA_TOKENS) {
        expect(
          lower.includes(token.toLowerCase()),
          `en.${path} contains forbidden catalog metadata token "${token}": ${value.slice(0, 80)}`
        ).toBe(false);
      }
    }
  });

  it("component contracts — key medication surfaces wire locale normalization helpers", () => {
    const violations: string[] = [];
    for (const contract of LOCALE_REGRESSION_COMPONENT_CONTRACTS) {
      const source = readWebSource(webRoot, contract.relPath);
      violations.push(...assertComponentLocaleContract(source, contract));
    }
    expect(
      violations,
      `Component locale contract violations:\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("catalog metadata leak scan — no new raw JSX display in medication target dirs", () => {
    const violations: string[] = [];
    const knownDeferred = new Set<string>(
      CATALOG_LEAK_KNOWN_DEFERRED_SURFACES.map((x) => x.relPath)
    );
    for (const file of walkWebSourceFiles(webRoot, CATALOG_LEAK_SCAN_DIRS)) {
      const rel = relative(webRoot, file);
      if (CATALOG_LEAK_SCAN_DEFERRED_FILES.has(rel)) continue;
      if (knownDeferred.has(rel)) continue;
      const source = readFileSync(file, "utf8");
      violations.push(...scanSourceForRawCatalogDisplayLeaks(source, rel));
    }
    expect(
      violations,
      `Raw catalog metadata display leaks (fix or add controlled deferral):\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("known deferred catalog leak surfaces stay documented and controlled", () => {
    expect(CATALOG_LEAK_KNOWN_DEFERRED_SURFACES.length).toBeGreaterThan(0);
    for (const entry of CATALOG_LEAK_KNOWN_DEFERRED_SURFACES) {
      expect(entry.reason.length).toBeGreaterThan(10);
      expect(readWebSource(webRoot, entry.relPath).length).toBeGreaterThan(0);
    }
  });

  it("behavioral gate — English catalog subtitles never expose French metadata tokens", () => {
    const subtitle = formatCatalogMedicationSubtitleForLocale(frenchCatalogItem(), "en");
    expect(englishMedicationDisplayContainsFrench(subtitle)).toBe(false);
    expect(subtitle).toContain("tablet");
    expect(subtitle).toContain("oral");
  });

  it("behavioral gate — English allergy search options normalize French catalog metadata", () => {
    const { subtitle } = formatMedicationOptionForLocale(frenchCatalogItem(), "en", tEn);
    expect(englishMedicationDisplayContainsFrench(subtitle)).toBe(false);
    expect(subtitle.toLowerCase()).not.toContain("comprimé");
  });

  it("architecture doc references whole-EMR 19U.4 regression gates", () => {
    const doc = readFileSync(join(repoRoot, "docs/ui/language-separation-architecture.md"), "utf8");
    expect(doc).toContain("19U.4");
    expect(doc).toContain("whole-EMR");
    expect(doc).toContain("localeLeakRegression19U4.test.ts");
    expect(doc).toContain("LANGUAGE_BOUNDARY_ALLOWLIST");
  });
});

describe("MSPP/admin locale regression markers (19U.4)", () => {
  it("cleaned MSPP EN sections remain English chrome", () => {
    expect(en.adminMsppAccess.loading).toBe("Loading…");
    expect(en.msppSurveillance.panelTitle).toMatch(/Monitoring/i);
    expect(en.msppSurveillance.panelTitle).not.toMatch(/indicateurs simples/i);
  });

  it("19U.5 removed deferred MSPP EN section allowlist entries", () => {
    expect(EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES).toEqual([]);
  });

  it("medication admin pages use t() for field labels, not hardcoded French chrome", () => {
    const masterPage = readWebSource(webRoot, "app/app/admin/medication-master/page.tsx");
    expect(masterPage).toContain('t("medicationMasterExplorer.');
    expect(masterPage).not.toMatch(/>\s*Classe thérapeutique\s*</);
  });
});
