import { describe, expect, it } from "vitest";
import {
  assertVisibleAllCatalogHasNoDuplicateTitles,
  CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE,
  getClinicalDocumentationCatalogGovernance,
  isClinicalDocumentationCardCatalogHidden,
  isClinicalDocumentationCardVisibleInHub,
  listVisibleClinicalDocumentationCards,
  resolveClinicalDocumentationCard,
  searchVisibleClinicalDocumentationCards,
} from "./clinicalDocumentationCatalog.js";
import {
  CLINICAL_DOCUMENTATION_CARDS,
  CLINICAL_DOCUMENTATION_CATEGORIES,
  CLINICAL_DOCUMENTATION_CATEGORY_META,
  getClinicalDocumentationCardById,
  listClinicalDocumentationCardsByCategory,
  listClinicalDocumentationCardsForCareSetting,
  searchClinicalDocumentationCards,
} from "./clinicalDocumentationRegistry.js";
import { summarizeClinicalDocumentationPayload } from "./clinicalDocumentationEntry.js";
import { STROKE_NIHSS_CARD_ID } from "./strokeDocumentationPayloads.js";

describe("clinicalDocumentationCatalog (EDOC.CATALOG.1)", () => {
  it("registry has unique card IDs", () => {
    const ids = CLINICAL_DOCUMENTATION_CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("visible All catalog has no duplicate titles (EN and FR)", () => {
    expect(() => assertVisibleAllCatalogHasNoDuplicateTitles(CLINICAL_DOCUMENTATION_CARDS, "en")).not.toThrow();
    expect(() => assertVisibleAllCatalogHasNoDuplicateTitles(CLINICAL_DOCUMENTATION_CARDS, "fr")).not.toThrow();
  });

  it("deprecated/hidden cards have supersededBy when applicable", () => {
    for (const [cardId, gov] of Object.entries(CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE)) {
      if (gov.catalogStatus === "HIDDEN" || gov.catalogStatus === "DEPRECATED") {
        expect(gov.supersededBy, `${cardId} should declare supersededBy`).toBeTruthy();
        expect(getClinicalDocumentationCardById(gov.supersededBy!)).toBeTruthy();
      }
    }
  });

  it("hidden cards do not appear in visible catalog", () => {
    for (const card of CLINICAL_DOCUMENTATION_CARDS) {
      if (isClinicalDocumentationCardCatalogHidden(card)) {
        expect(
          listVisibleClinicalDocumentationCards(CLINICAL_DOCUMENTATION_CARDS, { category: "ALL" }).some(
            (c) => c.id === card.id
          )
        ).toBe(false);
      }
    }
  });

  it("superseded foundation cards are hidden from All", () => {
    const hiddenFoundation = [
      "flow_neuro_checks",
      "score_nihss",
      "resp_oxygen_therapy",
      "cardiac_continuous_monitoring",
      "proc_foley_monitoring",
      "flow_blood_product_administration",
      "safety_belongings_checklist",
      "score_fall_risk",
      "score_sirs",
    ];
    const allVisible = listClinicalDocumentationCardsForCareSetting("ED");
    for (const id of hiddenFoundation) {
      expect(allVisible.some((c) => c.id === id)).toBe(false);
    }
  });

  it("canonical structured cards remain AVAILABLE and visible in All", () => {
    const canonical = [
      "neuro_checks",
      "stroke_nihss",
      "oxygen_therapy_initiation",
      "continuous_cardiac_monitoring",
      "foley_catheter_monitoring",
      "blood_product_verification",
      "morse_fall_risk_assessment",
      "sepsis_screening",
    ];
    const allVisible = listClinicalDocumentationCardsForCareSetting("ED");
    for (const id of canonical) {
      const card = getClinicalDocumentationCardById(id);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(allVisible.some((c) => c.id === id)).toBe(true);
    }
  });

  it("legacy card IDs still resolve in registry", () => {
    const legacyIds = [
      "flow_neuro_checks",
      "score_nihss",
      "stroke_neuro_checks",
      "resp_oxygen_therapy",
      "safety_belongings_checklist",
    ];
    for (const id of legacyIds) {
      const card = getClinicalDocumentationCardById(id);
      expect(card).toBeTruthy();
      expect(resolveClinicalDocumentationCard(card!).supersededBy).toBeTruthy();
    }
  });

  it("category metadata parity holds (23 categories)", () => {
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toHaveLength(23);
    expect(CLINICAL_DOCUMENTATION_CATEGORY_META).toHaveLength(23);
    expect(CLINICAL_DOCUMENTATION_CATEGORIES).toContain("BEHAVIORAL_HEALTH_DOCUMENTATION");
    for (const cat of CLINICAL_DOCUMENTATION_CATEGORIES) {
      expect(CLINICAL_DOCUMENTATION_CATEGORY_META.some((m) => m.id === cat)).toBe(true);
      expect(
        listClinicalDocumentationCardsByCategory(cat, "ED").length +
          CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.category === cat && isClinicalDocumentationCardCatalogHidden(c)).length
      ).toBeGreaterThan(0);
    }
  });

  it("search excludes hidden/deprecated duplicates", () => {
    const oxygen = searchClinicalDocumentationCards("oxygen", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(oxygen.some((c) => c.id === "resp_oxygen_therapy")).toBe(false);
    expect(oxygen.some((c) => c.id === "oxygen_therapy_initiation")).toBe(true);

    const neuro = searchClinicalDocumentationCards("neuro checks", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(neuro.some((c) => c.id === "flow_neuro_checks")).toBe(false);
    expect(neuro.some((c) => c.id === "stroke_neuro_checks")).toBe(false);
    expect(neuro.some((c) => c.id === "neuro_checks")).toBe(true);

    const foley = searchClinicalDocumentationCards("foley", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(foley.some((c) => c.id === "proc_foley_monitoring")).toBe(false);
    expect(foley.some((c) => c.id === "foley_catheter_monitoring")).toBe(true);

    const cardiac = searchClinicalDocumentationCards("continuous cardiac", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(cardiac.some((c) => c.id === "cardiac_continuous_monitoring")).toBe(false);
    expect(cardiac.some((c) => c.id === "continuous_cardiac_monitoring")).toBe(true);
  });

  it("cards with categories[] appear in secondary category without duplicate registry entries", () => {
    const strokeNihss = getClinicalDocumentationCardById("stroke_nihss")!;
    expect(isClinicalDocumentationCardVisibleInHub(strokeNihss, { category: "SCORES_AND_SCREENS" })).toBe(
      true
    );
    expect(CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.id === "stroke_nihss")).toHaveLength(1);
  });

  it("legacy saved-entry card still summarizes (backward compatibility)", () => {
    const payload = {
      assessedAt: "2026-05-28T14:00:00.000Z",
      levelOfConsciousness: 0,
      locQuestions: 1,
      locCommands: 0,
      bestGaze: 0,
      visualFields: 0,
      facialPalsy: 1,
      motorArmLeft: 2,
      motorArmRight: 0,
      motorLegLeft: 1,
      motorLegRight: 0,
      limbAtaxia: 0,
      sensory: 0,
      bestLanguage: 0,
      dysarthria: 0,
      extinctionInattention: 0,
      totalScore: 5,
    };
    const lines = summarizeClinicalDocumentationPayload(STROKE_NIHSS_CARD_ID, payload, "en");
    expect(lines.length).toBeGreaterThan(0);
    expect(getClinicalDocumentationCardById(STROKE_NIHSS_CARD_ID)?.titleEn).toBe("NIHSS");
  });

  it("governance map entries reference valid superseding cards", () => {
    for (const gov of Object.values(CLINICAL_DOCUMENTATION_CATALOG_GOVERNANCE)) {
      if (gov.supersededBy) {
        expect(getClinicalDocumentationCardById(gov.supersededBy)).toBeDefined();
      }
    }
  });

  it("getClinicalDocumentationCatalogGovernance returns override for hidden cards", () => {
    expect(getClinicalDocumentationCatalogGovernance("score_nihss")?.supersededBy).toBe("stroke_nihss");
  });
});

describe("searchVisibleClinicalDocumentationCards (direct)", () => {
  it("blood search excludes legacy administration foundation card", () => {
    const results = searchVisibleClinicalDocumentationCards(
      CLINICAL_DOCUMENTATION_CARDS,
      "blood product administration",
      "en",
      { careSetting: "ED", category: "ALL" }
    );
    expect(results.some((c) => c.id === "flow_blood_product_administration")).toBe(false);
    expect(results.some((c) => c.id === "blood_product_verification")).toBe(true);
  });
});
