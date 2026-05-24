import { readFileSync, readdirSync, statSync } from "node:fs";
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
  FR_LEGACY_LABELS_FR_ONLY_PREFIXES,
  HARDCODED_FRENCH_UI_DEFERRED_FILES,
  HARDCODED_FRENCH_UI_SCAN_TOKENS,
} from "./i18nLanguageBoundary.allowlist";
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

/** Mirrors I18nProvider resolveT — missing keys never cross-fallback languages. */
function resolveMessageForTest(
  active: unknown,
  frRoot: unknown,
  key: string,
  language: "en" | "fr"
): string {
  const v = getByPath(active, key);
  if (typeof v === "string") return v;
  if (language === "en") {
    return key;
  }
  const frVal = getByPath(frRoot, key);
  if (typeof frVal === "string") return frVal;
  return key;
}

function isDeferredEnPath(path: string): boolean {
  if (EN_MESSAGE_DIACRITIC_ALLOWLIST_PATHS.has(path)) return true;
  return EN_MESSAGE_FRENCH_TOKEN_DEFERRED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix)
  );
}

function isFrLegacyOnlyPath(path: string): boolean {
  return FR_LEGACY_LABELS_FR_ONLY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(webRoot, full);
    if (rel.includes("node_modules") || rel.includes("i18n/messages/")) continue;
    if (rel.endsWith(".test.ts") || rel.endsWith(".test.tsx") || rel.endsWith(".spec.ts")) continue;
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSourceFiles(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Phase 19U.1 — Language boundary regression guards (see docs/ui/language-separation-architecture.md). */
describe("i18n language boundary (19U.1)", () => {
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

  it("documents call sites that must pass explicit locale (inventory for 19U.5)", () => {
    const userFacingErrorSource = readFileSync(join(webRoot, "src/lib/userFacingError.ts"), "utf8");
    expect(userFacingErrorSource).toContain("locale: SupportedLanguage");
    expect(userFacingErrorSource).not.toMatch(/locale:\s*SupportedLanguage\s*=\s*"fr"/);
  });

  it("hardcoded French UI scan — fails on new literals; deferred files documented", () => {
    const scanRoots = [
      join(webRoot, "src/components"),
      join(webRoot, "src/features"),
      join(webRoot, "app"),
      join(webRoot, "src/lib"),
    ];
    const violations: string[] = [];
    for (const root of scanRoots) {
      for (const file of walkSourceFiles(root)) {
        const rel = relative(webRoot, file);
        if (HARDCODED_FRENCH_UI_DEFERRED_FILES.has(rel)) continue;
        const source = readFileSync(file, "utf8");
        for (const token of HARDCODED_FRENCH_UI_SCAN_TOKENS) {
          if (source.includes(token)) {
            violations.push(`${rel}: "${token}"`);
          }
        }
      }
    }
    expect(
      violations,
      `Hardcoded French UI found (fix or add to HARDCODED_FRENCH_UI_DEFERRED_FILES with TODO):\n${violations.join("\n")}`
    ).toEqual([]);
  });

  it("language separation architecture doc exists and states immutable clinical text rule", () => {
    const docPath = join(repoRoot, "docs/ui/language-separation-architecture.md");
    const doc = readFileSync(docPath, "utf8");
    expect(doc).toContain("must never be auto-translated");
    expect(doc).toContain("Signed and persisted chart text is immutable");
    expect(doc).toContain("No cross-language i18n fallback");
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
});
