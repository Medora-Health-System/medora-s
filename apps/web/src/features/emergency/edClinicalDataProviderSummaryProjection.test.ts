import { describe, expect, it } from "vitest";
import {
  buildClinicalDataSummaryProjection,
  type ClinicalDataProjectionEntry,
} from "@medora/shared";
import { SCORE_HEART_CARD_ID } from "@medora/shared";

const HEART_ENTRY: ClinicalDataProjectionEntry = {
  id: "heart-1",
  cardId: SCORE_HEART_CARD_ID,
  category: "SCORES_AND_SCREENS",
  cardTitleEn: "HEART Score",
  cardTitleFr: "Score HEART",
  authorDisplayName: "Rajnil Shah",
  authorRoleTitle: "Provider",
  createdAt: "2026-06-19T19:26:00.000Z",
  voidedAt: null,
  payloadJson: {
    assessmentTime: "2026-06-19T19:26:00.000Z",
    history: 0,
    ecg: 0,
    age: 0,
    riskFactors: 0,
    troponin: 1,
    totalScore: 1,
    riskLevel: "LOW",
    providerNotified: "NO",
  },
};

describe("edClinicalDataProviderSummaryProjection (MEDUI.ED.CLINICAL_DATA.5)", () => {
  it("HEART Score metric includes score and risk details", () => {
    const projection = buildClinicalDataSummaryProjection({ entries: [HEART_ENTRY], locale: "en" });
    const metric = projection.sections
      .flatMap((section) => section.metrics)
      .find((m) => m.cardId === SCORE_HEART_CARD_ID);
    expect(metric).toBeTruthy();
    expect(metric?.detailRows.some((row) => /score|heart/i.test(row.label))).toBe(true);
    expect(metric?.detailRows.some((row) => /risk|low/i.test(`${row.label} ${row.value}`))).toBe(true);
  });

  it("Provider-authored entry retains provider author metadata", () => {
    const projection = buildClinicalDataSummaryProjection({ entries: [HEART_ENTRY], locale: "en" });
    const metric = projection.sections.flatMap((section) => section.metrics)[0];
    expect(metric?.authorDisplayName).toBe("Rajnil Shah");
    expect(metric?.authorRoleTitle).toBe("Provider");
  });
});
