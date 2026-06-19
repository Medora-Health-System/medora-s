import { describe, expect, it } from "vitest";
import {
  buildClinicalDataRecentHighlights,
  buildClinicalDataSummaryProjection,
  type ClinicalDataProjectionEntry,
} from "./clinicalDataSummaryProjection.js";
import { SCORE_HEART_CARD_ID } from "./foundationCatalogCompletionPayloads.js";
import { SCORE_CIWA_AR_CARD_ID } from "./foundationCatalogCompletionPayloads.js";

const HEART_PAYLOAD = {
  assessmentTime: "2026-06-19T19:26:00.000Z",
  history: 0,
  ecg: 0,
  age: 0,
  riskFactors: 0,
  troponin: 1,
  totalScore: 1,
  riskLevel: "LOW" as const,
  providerNotified: "NO" as const,
};

function entry(
  overrides: Partial<ClinicalDataProjectionEntry> & Pick<ClinicalDataProjectionEntry, "id" | "cardId">
): ClinicalDataProjectionEntry {
  return {
    category: "SCORES_AND_SCREENS",
    cardTitleEn: "HEART Score",
    cardTitleFr: "Score HEART",
    authorDisplayName: "Rajnil Shah",
    authorRoleTitle: "Provider",
    createdAt: "2026-06-19T19:26:00.000Z",
    voidedAt: null,
    payloadJson: HEART_PAYLOAD,
    ...overrides,
  };
}

describe("edClinicalDataAllSavedEntriesSummary (MEDUI.ED.CLINICAL_DATA.5)", () => {
  it("1 — HEART Score saved entry appears in Recent Documentation", () => {
    const heart = entry({ id: "heart-1", cardId: SCORE_HEART_CARD_ID });
    const recent = buildClinicalDataRecentHighlights([heart], "en");
    expect(recent.some((item) => item.cardId === SCORE_HEART_CARD_ID)).toBe(true);
  });

  it("2 — HEART Score saved entry appears in Clinical Summary cardiac section", () => {
    const heart = entry({ id: "heart-1", cardId: SCORE_HEART_CARD_ID });
    const projection = buildClinicalDataSummaryProjection({ entries: [heart], locale: "en" });
    const cardiac = projection.sections.find((section) => section.sectionId === "CARDIAC");
    expect(cardiac?.metrics.some((metric) => metric.cardId === SCORE_HEART_CARD_ID)).toBe(true);
  });

  it("4 — Provider-owned forms are not excluded from projection", () => {
    const heart = entry({
      id: "heart-1",
      cardId: SCORE_HEART_CARD_ID,
      authorRoleTitle: "Provider",
    });
    const projection = buildClinicalDataSummaryProjection({ entries: [heart], locale: "en" });
    expect(projection.sections.length).toBeGreaterThan(0);
  });

  it("5 — Unknown saved form appears in Other Clinical Documentation", () => {
    const unknown = entry({
      id: "unknown-1",
      cardId: "provider_face_to_face_eval",
      cardTitleEn: "Face-to-Face Evaluation",
      cardTitleFr: "Évaluation face à face",
      category: "PROVIDER_DOCUMENTATION",
      payloadJson: { summary: "Completed", providerNotified: "YES" },
    });
    const projection = buildClinicalDataSummaryProjection({ entries: [unknown], locale: "en" });
    const other = projection.sections.find(
      (section) => section.sectionId === "OTHER_CLINICAL_DOCUMENTATION"
    );
    expect(other?.metrics.some((metric) => metric.cardId === "provider_face_to_face_eval")).toBe(true);
  });

  it("7 — Nursing saved entries still project", () => {
    const ciwa = entry({
      id: "ciwa-1",
      cardId: SCORE_CIWA_AR_CARD_ID,
      cardTitleEn: "CIWA-Ar",
      cardTitleFr: "CIWA-Ar",
      authorRoleTitle: "RN",
      payloadJson: {
        assessmentTime: "2026-06-19T18:28:00.000Z",
        nauseaVomiting: 1,
        tremor: 1,
        paroxysmalSweats: 1,
        anxiety: 1,
        agitation: 1,
        tactileDisturbances: 1,
        auditoryDisturbances: 0,
        visualDisturbances: 0,
        headache: 0,
        orientationClouding: 0,
        totalScore: 6,
        severity: "MILD",
        providerNotified: "YES",
      },
    });
    const projection = buildClinicalDataSummaryProjection({ entries: [ciwa], locale: "en" });
    const withdrawal = projection.sections.find((section) => section.sectionId === "WITHDRAWAL_PSYCH");
    expect(withdrawal?.metrics.some((metric) => metric.cardId === SCORE_CIWA_AR_CARD_ID)).toBe(true);
  });

  it("9 — Summary shows author name/title/time", () => {
    const heart = entry({ id: "heart-1", cardId: SCORE_HEART_CARD_ID });
    const projection = buildClinicalDataSummaryProjection({ entries: [heart], locale: "en" });
    const metric = projection.sections
      .flatMap((section) => section.metrics)
      .find((m) => m.cardId === SCORE_HEART_CARD_ID);
    expect(metric?.authorDisplayName).toBe("Rajnil Shah");
    expect(metric?.authorRoleTitle).toBe("Provider");
    expect(metric?.documentedAt).toBeTruthy();
  });
});
