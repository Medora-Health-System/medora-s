import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLINICAL_DOCUMENTATION_CATEGORY_META,
} from "@medora/shared";
import { ED_CLINICAL_DATA_REQUIRED_CATEGORIES } from "./edClinicalDataWorkspaceGovernance";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataCatalogReuse (MEDUI.ED.CLINICAL_DATA.1)", () => {
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const nursing = readSrc("features/emergency/EmergencyNursingReassessmentPanel.tsx");
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("Clinical Data uses ClinicalDocumentationHub (same catalog source)", () => {
    expect(panel).toContain("ClinicalDocumentationHub");
    expect(nursing).toContain("ClinicalDocumentationHub");
    expect(panel).not.toContain("listClinicalDocumentationCardsForCareSetting");
  });

  it("does not define a second documentation catalog", () => {
    expect(panel).not.toMatch(/CLINICAL_DOCUMENTATION_CARDS/);
    expect(panel).not.toContain("newCatalog");
  });

  it("Nursing Assessment still opens hub in default edit mode", () => {
    expect(nursing).toContain("<ClinicalDocumentationHub");
    expect(nursing).not.toContain('accessMode="review"');
  });

  it("Clinical Data hub uses clinicalData workspace context", () => {
    expect(panel).toContain('workspaceContext="clinicalData"');
    expect(hub).toContain("workspaceContext");
  });

  it("hub exposes category filters from shared CLINICAL_DOCUMENTATION_CATEGORY_META", () => {
    expect(hub).toContain("CLINICAL_DOCUMENTATION_CATEGORY_META");
    expect(hub).toContain("clinical-documentation-categories");
  });

  it("hub exposes search filter", () => {
    expect(hub).toContain("clinical-documentation-search");
    expect(hub).toContain("searchClinicalDocumentationCards");
  });

  for (const category of ED_CLINICAL_DATA_REQUIRED_CATEGORIES) {
    it(`category ${category} is present in shared category meta for filters`, () => {
      expect(CLINICAL_DOCUMENTATION_CATEGORY_META.some((m) => m.id === category)).toBe(true);
      expect(hub).toMatch(/clinical-documentation-category-\$\{cat\.id\}/);
    });
  }
});
