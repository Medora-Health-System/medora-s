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
  it("keeps all Inpatient browser flags OFF when public env vars are unset", () => {
    const keys = [
      "NEXT_PUBLIC_INPATIENT_WORKSPACE_ENABLED",
      "NEXT_PUBLIC_INPATIENT_DEPARTMENTAL_ORDERS_ENABLED",
      "NEXT_PUBLIC_INPATIENT_MAR_ENABLED",
      "NEXT_PUBLIC_INPATIENT_DOCUMENTATION_ENABLED",
    ] as const;
    const prior = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    try {
      for (const k of keys) delete process.env[k];
      expect(isInpatientWorkspaceEnabledInBrowser()).toBe(false);
      expect(isInpatientDepartmentalOrdersEnabledInBrowser()).toBe(false);
      expect(isInpatientMarEnabledInBrowser()).toBe(false);
      expect(isInpatientDocumentationEnabledInBrowser()).toBe(false);
    } finally {
      for (const k of keys) {
        if (prior[k] === undefined) delete process.env[k];
        else process.env[k] = prior[k];
      }
    }
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
      "problemsPlan",
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
