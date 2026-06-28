import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "../..");
const panelSource = readFileSync(
  join(webSrcRoot, "features/emergency/EmergencyNursingReassessmentPanel.tsx"),
  "utf8"
);
const hubSource = readFileSync(
  join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
  "utf8"
);
const navSource = readFileSync(
  join(webSrcRoot, "features/emergency/EmergencyErWorkspaceSectionNav.tsx"),
  "utf8"
);

describe("EDOC.1 clinical documentation hub", () => {
  it("NA section exposes Clinical Documentation entry", () => {
    expect(panelSource).toContain("clinical-documentation-entry");
    expect(panelSource).toContain("clinicalDocumentation.entryButton");
    expect(panelSource).toContain("ClinicalDocumentationHub");
  });

  it("Open nursing assessment chart link is no longer primary CTA", () => {
    expect(panelSource).not.toContain("emergencyNursingReassessment.openNursingTab");
    expect(panelSource).toContain("clinical-documentation-chart-reference");
  });

  it("hub renders categories and cards grid", () => {
    expect(hubSource).toContain('data-testid="clinical-documentation-hub"');
    expect(hubSource).toContain("clinical-documentation-category-all");
    expect(hubSource).toContain("clinical-documentation-category-${cat.id}");
    expect(hubSource).toContain("data-card-id={c.id}");
  });

  it("hub uses compact scrollable category chips for tablet layout", () => {
    expect(hubSource).toContain("overflowX: \"auto\"");
    expect(hubSource).toContain('data-testid="clinical-documentation-catalog-scroll"');
    expect(hubSource).toContain("flexWrap: \"nowrap\"");
  });

  it("dashboard nav unchanged (no new tile)", () => {
    expect(navSource).toContain("Nurse Assessment");
    expect(navSource).not.toContain("Clinical Documentation");
  });

  it("does not wire orders MAR billing in hub component", () => {
    expect(hubSource).not.toMatch(/procedureRevenueReview|medicationAdministration|billingEvent/i);
    expect(hubSource).not.toContain("ordersTab");
  });
});
