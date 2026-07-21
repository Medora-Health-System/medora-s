import { describe, expect, it } from "vitest";
import {
  isInpatientDepartmentalOrdersEnabledInBrowser,
  isInpatientDocumentationEnabledInBrowser,
  isInpatientMarEnabledInBrowser,
  isInpatientWorkspaceEnabledInBrowser,
  inpatientActiveWorkspacePath,
  INPATIENT_CENSUS_PATH,
} from "./inpatientWorkspacePaths";
import {
  INPATIENT_WORKSPACE_SECTIONS,
  parseInpatientWorkspaceSection,
} from "./inpatientWorkspaceSections";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

describe("D3E Inpatient clinical workspace UI contracts", () => {
  it("keeps all Inpatient browser flags OFF by default", () => {
    expect(isInpatientWorkspaceEnabledInBrowser()).toBe(false);
    expect(isInpatientDepartmentalOrdersEnabledInBrowser()).toBe(false);
    expect(isInpatientMarEnabledInBrowser()).toBe(false);
    expect(isInpatientDocumentationEnabledInBrowser()).toBe(false);
  });

  it("exposes census and active workspace paths", () => {
    expect(INPATIENT_CENSUS_PATH).toBe("/app/hospitalisation/inpatient");
    expect(inpatientActiveWorkspacePath("enc-1")).toBe(
      "/app/hospitalisation/inpatient/active/enc-1"
    );
  });

  it("includes required workspace tabs", () => {
    const ids = INPATIENT_WORKSPACE_SECTIONS.map((s) => s.id);
    for (const required of [
      "overview",
      "historyPhysical",
      "progressNotes",
      "nursing",
      "orders",
      "results",
      "medications",
      "consults",
      "carePlan",
      "dischargePlanning",
      "timeline",
      "summary",
    ]) {
      expect(ids).toContain(required);
    }
    expect(parseInpatientWorkspaceSection("hp")).toBe("historyPhysical");
    expect(parseInpatientWorkspaceSection("mar")).toBe("medications");
  });

  it("mirrors inpatientD3e keys between EN and FR", () => {
    expect(en.inpatientD3e.census.title.length).toBeGreaterThan(0);
    expect(fr.inpatientD3e.census.title.length).toBeGreaterThan(0);
    expect(en.inpatientD3e.nav.orders).toBeTruthy();
    expect(fr.inpatientD3e.nav.orders).toBeTruthy();
    expect(en.inpatientD3e.sharedOrderEngineHint.length).toBeGreaterThan(20);
    expect(fr.inpatientD3e.sharedOrderEngineHint.length).toBeGreaterThan(20);
  });
});
