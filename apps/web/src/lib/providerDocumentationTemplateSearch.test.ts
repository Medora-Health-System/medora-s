/**
 * Phase MEDUI.4 — provider documentation template search (filter + workspace guards).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import { PROVIDER_DOCUMENTATION_TEMPLATES } from "@/lib/providerDocumentationModel";
import {
  PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX,
  countProviderDocumentationTemplateSearchMatches,
  filterProviderDocumentationTemplates,
  normalizeProviderDocumentationSearchText,
  providerDocumentationTemplateSearchTerms,
} from "@/lib/providerDocumentationTemplateSearch";
import {
  providerDocumentationTemplateSearchBarContainerStyle,
  providerDocumentationTemplateSearchInputWrapStyle,
} from "@/lib/providerDocumentationWorkspaceLayout";

const webRoot = join(import.meta.dirname, "../..");
const WORKSPACE_SOURCE = readFileSync(
  join(webRoot, "src/components/encounters/ProviderDocumentationWorkspace.tsx"),
  "utf8"
);
const CATALOG_SOURCE = readFileSync(
  join(webRoot, "src/lib/providerDocumentationTemplateCatalog.ts"),
  "utf8"
);

function resolveMessage(key: string, messages: Record<string, unknown>): string {
  const parts = key.split(".");
  let node: unknown = messages;
  for (const part of parts) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof node === "string" ? node : key;
}

const resolveEn = (key: string) => resolveMessage(key, en as Record<string, unknown>);

function pickerSource(): string {
  const start = WORKSPACE_SOURCE.indexOf('data-testid="provider-documentation-template-picker"');
  const end = WORKSPACE_SOURCE.indexOf('data-testid="provider-documentation-workspace-layout"');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return WORKSPACE_SOURCE.slice(start, end);
}

describe("MEDUI.4 provider documentation template search", () => {
  describe("filter helper", () => {
    it("returns full catalog when query is empty", () => {
      const all = filterProviderDocumentationTemplates("", resolveEn);
      expect(all).toHaveLength(PROVIDER_DOCUMENTATION_TEMPLATES.length);
      expect(all.map((template) => template.id)).toEqual(PROVIDER_DOCUMENTATION_TEMPLATES.map((template) => template.id));
    });

    it("matches template label", () => {
      const matches = filterProviderDocumentationTemplates("chest pain", resolveEn);
      expect(matches.some((template) => template.id === "chest_pain")).toBe(true);
    });

    it("matches template id keywords", () => {
      const matches = filterProviderDocumentationTemplates("stroke", resolveEn);
      expect(matches.some((template) => template.id === "stroke_symptoms")).toBe(true);
    });

    it("matches help text", () => {
      const matches = filterProviderDocumentationTemplates("sudden onset", resolveEn);
      expect(matches.some((template) => template.id === "stroke_symptoms")).toBe(true);
    });

    it("is case-insensitive", () => {
      const lower = filterProviderDocumentationTemplates("chest", resolveEn).map((template) => template.id);
      const upper = filterProviderDocumentationTemplates("CHEST", resolveEn).map((template) => template.id);
      expect(upper).toEqual(lower);
    });

    it("supports partial words", () => {
      const matches = filterProviderDocumentationTemplates("abd", resolveEn);
      expect(matches.some((template) => template.id === "abdominal_pain")).toBe(true);
    });

    it("narrows results with two-word queries", () => {
      const pediatricFever = filterProviderDocumentationTemplates("pediatric fever", resolveEn);
      expect(pediatricFever.some((template) => template.id === "fever")).toBe(true);
      expect(pediatricFever.every((template) => template.majorGroup === "PEDIATRIC")).toBe(true);

      const traumaNeck = filterProviderDocumentationTemplates("trauma neck", resolveEn);
      expect(traumaNeck.some((template) => template.id === "neck_pain_trauma")).toBe(true);
    });

    it("reports zero matches for unrelated queries", () => {
      expect(countProviderDocumentationTemplateSearchMatches("zzzznotemplate", resolveEn)).toBe(0);
    });

    it("clear search restores all templates", () => {
      const narrowed = filterProviderDocumentationTemplates("chest", resolveEn);
      expect(narrowed.length).toBeLessThan(PROVIDER_DOCUMENTATION_TEMPLATES.length);
      expect(filterProviderDocumentationTemplates("", resolveEn)).toHaveLength(PROVIDER_DOCUMENTATION_TEMPLATES.length);
    });

    it("ignores punctuation in queries", () => {
      const plain = filterProviderDocumentationTemplates("chest pain", resolveEn).map((template) => template.id);
      const punctuated = filterProviderDocumentationTemplates("chest, pain!", resolveEn).map((template) => template.id);
      expect(punctuated).toEqual(plain);
    });

    it("normalizes accented characters for matching", () => {
      expect(normalizeProviderDocumentationSearchText("Douleur Thoracique")).toBe("douleur thoracique");
      expect(providerDocumentationTemplateSearchTerms("  Chest   Pain  ")).toEqual(["chest", "pain"]);
    });
  });

  describe("workspace integration", () => {
    it("renders search input in provider template selector", () => {
      const picker = pickerSource();
      expect(picker).toContain('data-testid="provider-template-search"');
      expect(picker).toContain("providerDocumentationWorkspace.templateSearchPlaceholder");
      expect(WORKSPACE_SOURCE).toContain("filterProviderDocumentationTemplates");
    });

    it("keeps search bar centered with max-width guard", () => {
      const picker = pickerSource();
      expect(picker).toContain("providerDocumentationTemplateSearchBarContainerStyle");
      expect(picker).toContain("PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX");
      expect(PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX).toBeGreaterThanOrEqual(420);
      expect(PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX).toBeLessThanOrEqual(560);
      const container = providerDocumentationTemplateSearchBarContainerStyle();
      expect(container.justifyContent).toBe("center");
      const wrap = providerDocumentationTemplateSearchInputWrapStyle(PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX);
      expect(wrap.maxWidth).toBe(PROVIDER_DOCUMENTATION_TEMPLATE_SEARCH_MAX_WIDTH_PX);
    });

    it("preserves grouped columns when query is empty", () => {
      const picker = pickerSource();
      expect(picker).toContain("PROVIDER_DOCUMENTATION_MAJOR_GROUP_KEYS.map");
      expect(picker).toContain("filteredTemplates ?? PROVIDER_DOCUMENTATION_TEMPLATES.filter");
      expect(picker).toContain('data-testid="provider-template-picker-columns"');
    });

    it("renders empty result state and hint", () => {
      const picker = pickerSource();
      expect(picker).toContain('data-testid="provider-template-search-meta"');
      expect(picker).toContain("providerDocumentationWorkspace.templateSearchNoResults");
      expect(picker).toContain('data-testid="provider-template-search-empty-hint"');
      expect(picker).toContain("providerDocumentationWorkspace.templateSearchNoResultsHint");
    });

    it("provides clear button and Escape handling", () => {
      const picker = pickerSource();
      expect(picker).toContain('data-testid="provider-template-search-clear"');
      expect(picker).toContain('event.key === "Escape"');
      expect(picker).toContain("setTemplateSearchQuery(\"\")");
    });

    it("does not auto-insert on Enter", () => {
      const picker = pickerSource();
      expect(picker).toMatch(/event\.key === "Enter"[\s\S]{0,120}event\.preventDefault\(\)/);
      expect(picker).not.toMatch(/event\.key === "Enter"[\s\S]{0,200}applyTemplate\(/);
    });

    it("preserves template click-to-insert behavior", () => {
      expect(WORKSPACE_SOURCE).toContain("onClick={() => applyTemplate(template.id)}");
      expect(WORKSPACE_SOURCE).toContain("applyProviderDocumentationTemplate");
      expect(WORKSPACE_SOURCE).toContain("setShowTemplates(false)");
    });

    it("does not widen desktop or tablet board layout", () => {
      const picker = pickerSource();
      expect(picker).not.toMatch(/maxWidth:\s*"100vw"/);
      expect(picker).not.toMatch(/width:\s*1200/);
      expect(WORKSPACE_SOURCE).toContain('flex: isStackedLayout ? "1 1 100%" : "1 1 280px"');
    });

    it("includes French search labels", () => {
      const frWorkspace = fr.providerDocumentationWorkspace as Record<string, string>;
      expect(frWorkspace.templateSearchPlaceholder).toContain("Rechercher des modèles");
      expect(frWorkspace.templateSearchMatchCount).toContain("{count}");
      expect(frWorkspace.templateSearchNoResults).toBe("Aucun modèle correspondant");
    });

    it("leaves template catalog content unchanged", () => {
      expect(CATALOG_SOURCE).not.toContain("providerDocumentationTemplateSearch");
      expect(CATALOG_SOURCE).not.toContain("templateSearchQuery");
      expect(PROVIDER_DOCUMENTATION_TEMPLATES.length).toBeGreaterThan(40);
    });
  });
});
