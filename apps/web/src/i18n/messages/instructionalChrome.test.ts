import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import en from "./en";
import { erTriageMessagesEn } from "./erTriage.en";
import {
  EN_FORBIDDEN_FRENCH_UI_TOKENS,
  LANGUAGE_BOUNDARY_ALLOWLIST,
} from "./i18nLanguageBoundary.allowlist";
import {
  FORBIDDEN_INSTRUCTIONAL_UI_PATTERNS,
  INSTRUCTIONAL_CHROME_SOURCE_SCAN_PATHS,
  PHARMACY_EN_FORBIDDEN_FRENCH_UI,
  englishMessageContainsForbiddenInstructionalPattern,
  isInstructionalChromePathAllowlisted,
  isInstructionalChromePatternAllowlisted,
} from "./instructionalChrome.allowlist";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function collectStringLeaves(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (typeof obj === "string") return prefix ? [{ path: prefix, value: obj }] : [];
  if (obj === null || obj === undefined || typeof obj !== "object") return [];
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") out.push({ path: next, value: val });
    else out.push(...collectStringLeaves(val, next));
  }
  return out;
}

const enCatalogLeaves = [
  ...collectStringLeaves(en),
  ...collectStringLeaves({ erTriage: erTriageMessagesEn }, "erTriage"),
];

describe("instructionalChrome regression gates (19X.1)", () => {
  it("English catalogs avoid forbidden instructional / implementation-detail UI patterns", () => {
    for (const { path, value } of enCatalogLeaves) {
      if (!value.trim() || isInstructionalChromePathAllowlisted(path)) continue;
      for (const pattern of FORBIDDEN_INSTRUCTIONAL_UI_PATTERNS) {
        if (isInstructionalChromePatternAllowlisted(path, pattern)) continue;
        expect(
          englishMessageContainsForbiddenInstructionalPattern(value, pattern),
          `en.${path} contains forbidden instructional pattern "${pattern}": ${value.slice(0, 100)}`
        ).toBe(false);
      }
    }
  });

  it("English pharmacy UI strings avoid French leaks", () => {
    for (const { path, value } of enCatalogLeaves) {
      if (!path.startsWith("pharmacy")) continue;
      const lower = value.toLowerCase();
      for (const token of PHARMACY_EN_FORBIDDEN_FRENCH_UI) {
        expect(lower.includes(token.toLowerCase()), `en.${path} contains French pharmacy UI "${token}"`).toBe(false);
      }
      for (const token of EN_FORBIDDEN_FRENCH_UI_TOKENS) {
        expect(lower.includes(token.toLowerCase()), `en.${path} contains forbidden French token "${token}"`).toBe(false);
      }
    }
  });

  it("clinical surface sources do not render removed instructional chrome keys", () => {
    const workspace = readFileSync(join(webRoot, "src/components/encounters/ProviderDocumentationWorkspace.tsx"), "utf8");
    const triage = readFileSync(join(webRoot, "src/features/emergency/EmergencyTriagePanel.tsx"), "utf8");
    const disposition = readFileSync(join(webRoot, "src/features/emergency/EmergencyDispositionPanel.tsx"), "utf8");

    expect(workspace).not.toContain("chipsSafetyComment");
    expect(workspace).not.toContain("liveDocumentationPreview");
    expect(workspace).not.toContain("previewOnlyNotLegal");
    expect(workspace).not.toContain("documentationOverview");
    expect(workspace).not.toContain("signSafetyHelp");
    expect(workspace).not.toContain("signWarningsAdvisory");
    expect(workspace).not.toContain("completeNormalExamHelp");
    expect(workspace).not.toContain("activeTemplateStickerHelp");

    expect(triage).not.toContain("sublineSameAsEncounter");
    expect(triage).not.toContain("triageCompletenessTitle");
    expect(triage).not.toContain("v1StorageHint");
    expect(triage).not.toContain("screeningsHint");
    expect(triage).not.toContain("resumeHint");
    expect(triage).not.toContain("synthSubline");
    expect(triage).not.toContain("signatureSubline");
    expect(triage).not.toContain("safetyPromptsDisclaimer");

    expect(disposition).not.toContain("previewColumnHint");
    expect(disposition).not.toContain("emtalaBlockSubline");
  });

  it("pharmacy inventory surfaces use i18n and avoid hardcoded French UI literals", () => {
    for (const relPath of INSTRUCTIONAL_CHROME_SOURCE_SCAN_PATHS) {
      if (!relPath.includes("pharmacy")) continue;
      const source = readFileSync(join(webRoot, relPath), "utf8");
      for (const phrase of PHARMACY_EN_FORBIDDEN_FRENCH_UI) {
        expect(source, `${relPath} must not hardcode "${phrase}"`).not.toContain(phrase);
      }
      expect(source).toMatch(/useI18n\(\)|\bt\("/);
    }
  });

  it("preserves autosave/sign handlers in provider documentation workspace", () => {
    const workspace = readFileSync(join(webRoot, "src/components/encounters/ProviderDocumentationWorkspace.tsx"), "utf8");
    expect(workspace).toContain("shouldAutosaveProviderDocumentation");
    expect(workspace).toContain("providerDocumentationCanSubmitSignature");
    expect(workspace).toContain("runManualSave");
  });

  it("language boundary allowlist remains structured", () => {
    expect(Array.isArray(LANGUAGE_BOUNDARY_ALLOWLIST)).toBe(true);
  });
});
