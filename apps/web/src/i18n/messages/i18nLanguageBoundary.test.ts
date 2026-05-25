import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import fr from "./fr";
import enMessages from "./en";
import frMessages from "./fr";
import {
  EN_FORBIDDEN_FRENCH_UI_TOKENS,
  EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS,
  EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES,
  FR_FORBIDDEN_ENGLISH_UI_EXACT,
  FR_FORBIDDEN_ENGLISH_UI_TOKENS,
  FR_LEGACY_LABELS_FR_ONLY_PREFIXES,
  HARDCODED_FRENCH_UI_SCAN_TOKENS,
  LANGUAGE_BOUNDARY_ALLOWLIST,
} from "./i18nLanguageBoundary.allowlist";
import {
  frenchMessageValueContainsEnglishUiToken,
  isFrEnglishTokenAllowlisted,
  readWebSource,
  scanSourceForHardcodedFrenchTokens,
  walkWholeEmrSourceFiles,
} from "./wholeEmrLocaleScan19U4";
import { normalizeUserFacingError } from "@/lib/userFacingError";

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

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveMessageForTest(
  active: unknown,
  frRoot: unknown,
  key: string,
  language: "en" | "fr"
): string {
  const v = getByPath(active, key);
  if (typeof v === "string") return v;
  if (language === "en") return key;
  const frVal = getByPath(frRoot, key);
  if (typeof frVal === "string") return frVal;
  return key;
}

function isDeferredEnPath(path: string): boolean {
  if (EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS.has(path)) return true;
  return EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`)
  );
}

function isFrLegacyOnlyPath(path: string): boolean {
  return FR_LEGACY_LABELS_FR_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/** Phase 19U.1 / 19U.4 — whole-EMR language boundary regression guards. */
describe("i18n language boundary (19U.1 / 19U.4 whole-EMR)", () => {
  it("EN and FR message trees have matching string leaf keys (with documented FR legacy exceptions)", () => {
    const enPaths = collectStringLeaves(en).map((x) => x.path).sort();
    const frPaths = collectStringLeaves(fr).map((x) => x.path).sort();
    const enSet = new Set(enPaths);
    const frSet = new Set(frPaths);

    const onlyEn = enPaths.filter((p) => !frSet.has(p));
    const onlyFr = frPaths.filter((p) => !enSet.has(p) && !isFrLegacyOnlyPath(p));

    expect(onlyEn, `Keys in en.ts missing from fr.ts: ${onlyEn.slice(0, 15).join(", ")}`).toEqual([]);
    expect(
      onlyFr,
      `Keys in fr.ts missing from en.ts (excluding labels.fr legacy): ${onlyFr.slice(0, 15).join(", ")}`
    ).toEqual([]);
  });

  it("English messages do not contain forbidden French UI tokens outside allowlist", () => {
    for (const { path, value } of collectStringLeaves(en)) {
      if (isDeferredEnPath(path)) continue;
      const lower = value.toLowerCase();
      for (const token of EN_FORBIDDEN_FRENCH_UI_TOKENS) {
        expect(
          lower.includes(token.toLowerCase()),
          `en.${path} contains forbidden French token "${token}": ${value.slice(0, 80)}`
        ).toBe(false);
      }
    }
  });

  it("French messages do not contain forbidden English UI tokens outside allowlist", () => {
    for (const { path, value } of collectStringLeaves(fr)) {
      if (isFrLegacyOnlyPath(path)) continue;
      for (const token of FR_FORBIDDEN_ENGLISH_UI_TOKENS) {
        if (isFrEnglishTokenAllowlisted(path, token, LANGUAGE_BOUNDARY_ALLOWLIST)) continue;
        expect(
          frenchMessageValueContainsEnglishUiToken(value, token),
          `fr.${path} contains forbidden English UI token "${token}": ${value.slice(0, 80)}`
        ).toBe(false);
      }
      for (const exact of FR_FORBIDDEN_ENGLISH_UI_EXACT) {
        if (isFrEnglishTokenAllowlisted(path, exact, LANGUAGE_BOUNDARY_ALLOWLIST)) continue;
        expect(
          value.trim() === exact,
          `fr.${path} equals forbidden English UI word "${exact}"`
        ).toBe(false);
      }
    }
  });

  it("English messages avoid French diacritics outside allowlist and deferred sections", () => {
    const diacritics = /[àâäéèêëïîôùûçœÀÂÄÉÈÊËÏÎÔÙÛÇŒ]/;
    for (const { path, value } of collectStringLeaves(en)) {
      if (isDeferredEnPath(path)) continue;
      expect(value, `en.${path}`).not.toMatch(diacritics);
    }
  });

  it("missing EN key does not fallback to French", () => {
    const missingKey = "common.thisKeyDoesNotExistInEitherCatalog19U1";
    expect(getByPath(enMessages, missingKey)).toBeUndefined();
    expect(getByPath(frMessages, missingKey)).toBeUndefined();
    expect(resolveMessageForTest(enMessages, frMessages, missingKey, "en")).toBe(missingKey);
  });

  it("missing FR key does not fallback to English", () => {
    const missingKey = "common.thisKeyDoesNotExistInEitherCatalog19U1Fr";
    expect(resolveMessageForTest(frMessages, frMessages, missingKey, "fr")).toBe(missingKey);
    const enVal = getByPath(enMessages, "common.save");
    expect(typeof enVal).toBe("string");
    expect(resolveMessageForTest(frMessages, frMessages, missingKey, "fr")).not.toBe(enVal);
  });

  it("normalizeUserFacingError maps English API errors when locale is en (no French default parameter)", () => {
    expect(normalizeUserFacingError("Encounter not found", "en")).toBe("Encounter not found.");
    expect(normalizeUserFacingError("Encounter not found", "fr")).toBe("Consultation introuvable.");
    expect(normalizeUserFacingError("Encounter not found", "en")).not.toMatch(/introuvable/i);
  });

  it("whole-EMR hardcoded French UI scan — fails on new literals outside structured allowlist", () => {
    const violations: string[] = [];
    for (const file of walkWholeEmrSourceFiles(webRoot)) {
      const rel = relative(webRoot, file);
      const source = readFileSync(file, "utf8");
      violations.push(
        ...scanSourceForHardcodedFrenchTokens(
          source,
          rel,
          HARDCODED_FRENCH_UI_SCAN_TOKENS,
          LANGUAGE_BOUNDARY_ALLOWLIST
        )
      );
    }
    expect(
      violations,
      `Hardcoded French UI found (fix or add LANGUAGE_BOUNDARY_ALLOWLIST entry with reason + cleanupPhase):\n${violations.slice(0, 30).join("\n")}`
    ).toEqual([]);
  });

  it("LANGUAGE_BOUNDARY_ALLOWLIST entries require path, token, reason, and cleanupPhase", () => {
    for (const entry of LANGUAGE_BOUNDARY_ALLOWLIST) {
      expect(entry.path.trim().length, JSON.stringify(entry)).toBeGreaterThan(0);
      expect(entry.token.trim().length, JSON.stringify(entry)).toBeGreaterThan(0);
      expect(entry.reason.trim().length, JSON.stringify(entry)).toBeGreaterThan(10);
      expect(["19U.5", "19U.6", "permanent"]).toContain(entry.cleanupPhase);
    }
  });

  it("language separation architecture doc states whole-EMR scope and immutable clinical text rule", () => {
    const docPath = join(repoRoot, "docs/ui/language-separation-architecture.md");
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("must never be auto-translated");
    expect(doc).toContain("Signed and persisted chart text is immutable");
    expect(doc).toContain("No cross-language i18n fallback");
    expect(doc).toContain("whole-EMR");
    expect(doc).toContain("LANGUAGE_BOUNDARY_ALLOWLIST");
  });

  it("whole-EMR scan does not flag clinical free-text fixture markers in tests or samples", () => {
    const sample = `
      // custom home med comprimé orale — saved chart example, not UI chrome
      const manualLabel = "Patient said comprimé orale daily";
    `;
    const violations = scanSourceForHardcodedFrenchTokens(
      sample,
      "src/lib/example.fixture.ts",
      HARDCODED_FRENCH_UI_SCAN_TOKENS,
      LANGUAGE_BOUNDARY_ALLOWLIST
    );
    expect(violations).toEqual([]);
  });
});

describe("19U.1 cleaned EN MSPP sections", () => {
  it("adminMsppAccess uses English chrome", () => {
    expect(en.adminMsppAccess.loading).toBe("Loading…");
    expect(en.adminMsppAccess.save).toBe("Save");
    expect(en.adminMsppAccess.cancel).toBe("Cancel");
    expect(en.adminMsppAccess.title).toMatch(/MSPP/i);
    expect(en.adminMsppAccess.title).not.toMatch(/Accès/i);
  });

  it("msppSurveillance uses English chrome", () => {
    expect(en.msppSurveillance.loading).toBe("Loading…");
    expect(en.msppSurveillance.panelTitle).toMatch(/Monitoring/i);
    expect(en.msppSurveillance.panelTitle).not.toMatch(/indicateurs simples/i);
  });

  it("19U.5 MSPP deferred EN sections are translated", () => {
    expect(en.msppValidationAnalyticsPage.kpiPendingDept).toBe("Pending (department)");
    expect(en.msppAuditPage.loadError).toBe("Could not load history.");
    expect(en.msppRapportPrint.printHeaderTitle).toMatch(/MSPP report/i);
    expect(EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES).toEqual([]);
  });
});
