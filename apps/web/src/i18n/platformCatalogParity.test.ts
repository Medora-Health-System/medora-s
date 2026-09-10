import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { en, es, fr, type MessageKey } from "./messages";
import { canonicalEs, canonicalFr, platformText, platformTextSources } from "./platformText";
import {
  parsePlatformUiLanguage,
  PLATFORM_UI_LANGUAGES,
  platformLanguageSelectOptions,
} from "./platformLocale";

const webRoot = join(__dirname, "../..");


function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

describe("Platform Admin trilingual catalog", () => {
  it("parses es and lists Español in the selector", () => {
    expect([...PLATFORM_UI_LANGUAGES]).toEqual(["en", "fr", "es"]);
    expect(parsePlatformUiLanguage("es")).toBe("es");
    expect(parsePlatformUiLanguage("es-MX")).toBe("es");
    expect(parsePlatformUiLanguage("de")).toBeNull();
    expect(platformLanguageSelectOptions().map((o) => o.value)).toEqual(["en", "fr", "es"]);
    expect(platformLanguageSelectOptions().some((o) => /español/i.test(o.label))).toBe(true);
  });

  it("has identical typed message keys in EN/FR/ES with no empty values", () => {
    const keys = Object.keys(en) as MessageKey[];
    expect(Object.keys(fr).sort()).toEqual(keys.slice().sort());
    expect(Object.keys(es).sort()).toEqual(keys.slice().sort());
    for (const key of keys) {
      expect(en[key].trim(), `EN empty ${key}`).not.toBe("");
      expect(fr[key].trim(), `FR empty ${key}`).not.toBe("");
      expect(es[key].trim(), `ES empty ${key}`).not.toBe("");
      expect(es[key], key).not.toMatch(/^UNLOCALIZED_ES::/);
      expect(es[key], key).not.toBe(key);
    }
  });

  it("has complete source-literal maps for FR and ES", () => {
    const enKeys = Object.keys(platformText.en).sort();
    expect(Object.keys(platformText.fr).sort()).toEqual(enKeys);
    expect(Object.keys(platformText.es).sort()).toEqual(enKeys);
    expect(platformTextSources.sort()).toEqual(enKeys);
    const allowedIdentical = new Set(["MFA", "NPI", "RxNorm", "ERA", "Global", "Actor", "Persona", "staff", "No"]);
    const englishFallbacks: string[] = [];
    const frenchFallbacks: string[] = [];
    for (const key of enKeys) {
      const esVal = platformText.es[key];
      const frVal = platformText.fr[key];
      expect(esVal.trim(), key).not.toBe("");
      if (esVal === key && !allowedIdentical.has(key) && !/^[A-Z][A-Z0-9_]+$/.test(key)) {
        englishFallbacks.push(key);
      }
      if (esVal === frVal && esVal !== key && /[œç]|l'|d'|\b(les|des|une|pour|avec)\b/.test(esVal)) {
        frenchFallbacks.push(key);
      }
    }
    expect(englishFallbacks, englishFallbacks.slice(0, 20).join("\n")).toEqual([]);
    expect(frenchFallbacks, frenchFallbacks.join("\n")).toEqual([]);
  });

  it("covers canonical badge/status codes in Spanish without French copies", () => {
    for (const key of Object.keys(canonicalFr)) {
      expect(canonicalEs[key], key).toBeTruthy();
      expect(canonicalEs[key], key).not.toMatch(/^UNLOCALIZED/);
      const frenchish = /[œç]|l'|d'|\b(les|des|une|pour|avec|faire)\b/;
      if (canonicalEs[key] === canonicalFr[key] && frenchish.test(canonicalFr[key])) {
        expect.fail(`Spanish canonical copied French for ${key}`);
      }
    }
  });

  it("does not leave hardcoded English page titles on /platform routes", () => {
    const pages = walk(join(webRoot, "app/platform")).filter((p) => p.endsWith("page.tsx"));
    expect(pages.length).toBeGreaterThanOrEqual(13);
    const leaks: string[] = [];
    for (const file of pages) {
      const src = readFileSync(file, "utf8");
      if (/title=\{?"(Platform Overview|System Operations|Billing \/ RCM|Catalog \/ Configuration|System Health|Backup Readiness|Go-Live Monitoring|Compliance)"/.test(src)) {
        leaks.push(file);
      }
    }
    expect(leaks, leaks.join("\n")).toEqual([]);
  });
});
