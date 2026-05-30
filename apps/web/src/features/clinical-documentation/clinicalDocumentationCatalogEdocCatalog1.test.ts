import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  countClinicalDocumentationCardsByCategory,
  listClinicalDocumentationCardsForCareSetting,
  searchClinicalDocumentationCards,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation catalog UI (EDOC.CATALOG.1)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );

  it("hub uses catalog visibility helpers for All tab and category counts", () => {
    expect(hub).toContain("listClinicalDocumentationCardsForCareSetting");
    expect(hub).toContain("countClinicalDocumentationCardsByCategory");
    expect(hub).toContain("searchClinicalDocumentationCards");
  });

  it("All tab hides superseded foundation cards", () => {
    const allEd = listClinicalDocumentationCardsForCareSetting("ED");
    expect(allEd.some((c) => c.id === "resp_oxygen_therapy")).toBe(false);
    expect(allEd.some((c) => c.id === "oxygen_therapy_initiation")).toBe(true);
    expect(allEd.some((c) => c.id === "flow_neuro_checks")).toBe(false);
    expect(allEd.some((c) => c.id === "neuro_checks")).toBe(true);
  });

  it("category tab count excludes hidden cards", () => {
    const deviceVisible = countClinicalDocumentationCardsByCategory(
      "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      "ED"
    );
    expect(deviceVisible).toBeGreaterThan(0);
    const allDevice = listClinicalDocumentationCardsForCareSetting("ED").filter(
      (c) => c.category === "DEVICE_LINE_TUBE_DRAIN_MONITORING"
    );
    expect(deviceVisible).toBeGreaterThanOrEqual(allDevice.length);
  });

  it("search oxygen excludes legacy Oxygen Therapy foundation card", () => {
    const results = searchClinicalDocumentationCards("oxygen", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === "resp_oxygen_therapy")).toBe(false);
    expect(results.some((c) => c.id === "oxygen_therapy_initiation")).toBe(true);
  });

  it("search neuro excludes legacy Neuro Checks duplicates", () => {
    const results = searchClinicalDocumentationCards("neuro checks", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === "flow_neuro_checks")).toBe(false);
    expect(results.some((c) => c.id === "stroke_neuro_checks")).toBe(false);
    expect(results.some((c) => c.id === "neuro_checks")).toBe(true);
  });

  it("search cardiac excludes legacy Continuous Cardiac Monitoring duplicate", () => {
    const results = searchClinicalDocumentationCards("continuous cardiac monitoring", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === "cardiac_continuous_monitoring")).toBe(false);
    expect(results.some((c) => c.id === "continuous_cardiac_monitoring")).toBe(true);
  });

  it("search foley excludes legacy Foley Monitoring foundation card", () => {
    const results = searchClinicalDocumentationCards("foley", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === "proc_foley_monitoring")).toBe(false);
    expect(results.some((c) => c.id === "foley_catheter_monitoring")).toBe(true);
  });

  it("available cards still have form routing in hub", () => {
    expect(hub).toContain("isEdoc12RespiratoryDocumentationFormCard");
    expect(hub).toContain("isEdoc15CardiacMonitoringDocumentationFormCard");
    expect(hub).toContain("isEdoc17DeviceMonitoringDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationEducationForm");
  });

  it("foundation CPR flowsheet remains category-visible but not in All tab", () => {
    const allEd = listClinicalDocumentationCardsForCareSetting("ED");
    expect(allEd.some((c) => c.id === "flow_cpr_record")).toBe(false);
  });
});
