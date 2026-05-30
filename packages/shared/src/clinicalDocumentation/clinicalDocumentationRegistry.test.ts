import { describe, expect, it } from "vitest";
import {
  CLINICAL_DOCUMENTATION_CARDS,
  CLINICAL_DOCUMENTATION_CATEGORIES,
  CLINICAL_DOCUMENTATION_CATEGORY_META,
  getClinicalDocumentationCardById,
  listClinicalDocumentationCardsByCategory,
  listClinicalDocumentationCardsForCareSetting,
  searchClinicalDocumentationCards,
} from "./clinicalDocumentationRegistry.js";

describe("clinicalDocumentationRegistry (EDOC.1)", () => {
  it("exports all 15 categories with metadata (EDOC.14 adds NEUROLOGICAL_DOCUMENTATION)", () => {
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toHaveLength(15);
    expect(CLINICAL_DOCUMENTATION_CATEGORY_META).toHaveLength(15);
    for (const cat of CLINICAL_DOCUMENTATION_CATEGORIES) {
      expect(CLINICAL_DOCUMENTATION_CATEGORY_META.some((m) => m.id === cat)).toBe(true);
    }
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("RESTRAINT_DOCUMENTATION");
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("HIGH_ALERT_INFUSION_DOCUMENTATION");
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("BELONGINGS_VALUABLES_DOCUMENTATION");
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("PAIN_DOCUMENTATION");
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("NEUROLOGICAL_DOCUMENTATION");
  });

  it("contains key cards with EN/FR titles", () => {
    const cpr = getClinicalDocumentationCardById("flow_cpr_record");
    expect(cpr?.titleEn).toContain("CPR");
    expect(cpr?.titleFr).toMatch(/RCP/i);
    expect(getClinicalDocumentationCardById("flow_restraint_monitoring")).toBeTruthy();
    expect(getClinicalDocumentationCardById("score_nihss")).toBeTruthy();
    expect(getClinicalDocumentationCardById("io_intake_output")).toBeTruthy();
    expect(getClinicalDocumentationCardById("safety_restraint_initial")).toBeTruthy();
    expect(getClinicalDocumentationCardById("obs_po_challenge")).toBeTruthy();
    expect(getClinicalDocumentationCardById("obs_ambulation_trial")).toBeTruthy();
  });

  it("has unique card IDs", () => {
    const ids = CLINICAL_DOCUMENTATION_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("search finds NIHSS, I&O, CPR, respiratory therapy, blood products, telemetry", () => {
    expect(searchClinicalDocumentationCards("NIHSS").some((c) => c.id.includes("nihss"))).toBe(true);
    expect(searchClinicalDocumentationCards("I&O").some((c) => c.id === "io_intake_output")).toBe(true);
    expect(searchClinicalDocumentationCards("CPR").some((c) => c.id === "flow_cpr_record")).toBe(true);
    expect(
      searchClinicalDocumentationCards("Respiratory Therapy").some(
        (c) => c.id === "flow_respiratory_therapy"
      )
    ).toBe(true);
    expect(
      searchClinicalDocumentationCards("blood transfusion").some((c) => c.category === "BLOOD_PRODUCT_DOCUMENTATION")
    ).toBe(true);
    expect(searchClinicalDocumentationCards("telemetry").some((c) => c.id.includes("telemetry"))).toBe(true);
  });

  it("ED cards are reusable for observation/inpatient where applicable", () => {
    const po = getClinicalDocumentationCardById("obs_po_challenge");
    expect(po?.careSettings).toContain("ED");
    expect(po?.careSettings).toContain("OBSERVATION");
    const io = getClinicalDocumentationCardById("io_intake_output");
    expect(io?.careSettings).toContain("INPATIENT");
    const edCards = listClinicalDocumentationCardsForCareSetting("ED");
    expect(edCards.length).toBeGreaterThan(40);
  });

  it("category listing returns stroke and cardiac cards", () => {
    const stroke = listClinicalDocumentationCardsByCategory("STROKE_DOCUMENTATION");
    expect(stroke.some((c) => c.id === "stroke_swallow_screen")).toBe(true);
    expect(getClinicalDocumentationCardById("stroke_nihss")?.implementationStatus).toBe("AVAILABLE");
    const cardiac = listClinicalDocumentationCardsByCategory("CARDIAC_MONITORING_DOCUMENTATION");
    expect(cardiac.some((c) => c.id === "cardiac_ekg_12_lead")).toBe(true);
    expect(cardiac.some((c) => c.id === "cardiac_telemetry_initiation")).toBe(true);
  });
});
