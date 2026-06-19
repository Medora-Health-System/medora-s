import { describe, expect, it } from "vitest";
import {
  filterClinicalDocumentationCardsByRole,
  listClinicalDocumentationCardsForCareSetting,
  searchClinicalDocumentationCards,
} from "@medora/shared";

describe("edClinicalDataRoleFilter (MEDUI.ED.CLINICAL_DATA.5)", () => {
  const edCards = listClinicalDocumentationCardsForCareSetting("ED");

  it("13 — Provider role filter returns provider-owned cards", () => {
    const providerCards = filterClinicalDocumentationCardsByRole(edCards, "PROVIDER");
    expect(providerCards.length).toBeGreaterThan(0);
    expect(providerCards.every((card) => card.primaryRole === "PROVIDER")).toBe(true);
    expect(providerCards.some((card) => card.id === "score_heart")).toBe(true);
  });

  it("14 — Nursing role filter returns nursing-owned cards", () => {
    const nursingCards = filterClinicalDocumentationCardsByRole(edCards, "RN");
    expect(nursingCards.length).toBeGreaterThan(0);
    expect(nursingCards.every((card) => card.primaryRole === "RN")).toBe(true);
    expect(nursingCards.some((card) => card.id === "score_ciwa_ar")).toBe(true);
  });

  it("15 — Search term provider returns provider-owned cards", () => {
    const results = searchClinicalDocumentationCards("provider", "en", { careSetting: "ED" });
    expect(results.some((card) => card.primaryRole === "PROVIDER")).toBe(true);
    expect(results.some((card) => card.id === "score_heart")).toBe(true);
  });

  it("16 — Search term nursing returns nursing-owned cards", () => {
    const results = searchClinicalDocumentationCards("nursing", "en", { careSetting: "ED" });
    expect(results.some((card) => card.primaryRole === "RN")).toBe(true);
    expect(results.some((card) => card.id === "score_ciwa_ar")).toBe(true);
  });

  it("17 — Category filters still work with role filter", () => {
    const scoreCards = searchClinicalDocumentationCards("", "en", {
      careSetting: "ED",
      category: "SCORES_AND_SCREENS",
    });
    const providerScores = filterClinicalDocumentationCardsByRole(scoreCards, "PROVIDER");
    expect(providerScores.length).toBeGreaterThan(0);
    expect(providerScores.every((card) => card.primaryRole === "PROVIDER")).toBe(true);
    expect(providerScores.some((card) => card.id === "score_heart")).toBe(true);
  });

  it("18 — Multi-role filter returns shared forms", () => {
    const multi = filterClinicalDocumentationCardsByRole(edCards, "MULTI_ROLE");
    expect(multi.length).toBeGreaterThan(0);
    expect(multi.every((card) => card.primaryRole === "MULTI_ROLE")).toBe(true);
  });
});
