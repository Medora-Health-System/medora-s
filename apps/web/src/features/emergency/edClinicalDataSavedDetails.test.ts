import { describe, expect, it } from "vitest";
import { buildClinicalDocumentationDetailRows } from "@medora/shared";
import { SCORE_CIWA_AR_CARD_ID } from "@medora/shared";

describe("edClinicalDataSavedDetails (MEDUI.ED.CLINICAL_DATA.3)", () => {
  const ciwaEntry = {
    id: "ciwa-1",
    cardId: SCORE_CIWA_AR_CARD_ID,
    category: "SCORES_AND_SCREENS",
    cardTitleEn: "CIWA-Ar",
    cardTitleFr: "CIWA-Ar",
    authorDisplayName: "Elizabeth Posada",
    authorRoleTitle: "RN",
    createdAt: "2026-06-19T18:28:00.000Z",
    voidedAt: null,
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
  };

  it("12 — CIWA summary includes score", () => {
    const rows = buildClinicalDocumentationDetailRows(ciwaEntry, "en");
    expect(rows.some((r) => r.value.includes("6"))).toBe(true);
  });

  it("13 — CIWA summary includes severity", () => {
    const rows = buildClinicalDocumentationDetailRows(ciwaEntry, "en");
    expect(rows.some((r) => /Severity/i.test(r.label) && /Mild/i.test(r.value))).toBe(true);
  });

  it("14 — CIWA summary includes provider notified", () => {
    const rows = buildClinicalDocumentationDetailRows(ciwaEntry, "en");
    expect(rows.some((r) => /Provider notified/i.test(r.label))).toBe(true);
  });

  it("15 — CIWA detail rows include component scores", () => {
    const rows = buildClinicalDocumentationDetailRows(ciwaEntry, "en");
    expect(rows.some((r) => r.label === "Anxiety" && r.value === "1")).toBe(true);
    expect(rows.some((r) => r.label === "Orientation/clouding" && r.value === "0")).toBe(true);
  });

  it("25 — unknown payload fields handled safely", () => {
    const rows = buildClinicalDocumentationDetailRows(
      {
        ...ciwaEntry,
        cardId: "unknown_card_xyz",
        payloadJson: { note: "test" },
      },
      "en"
    );
    expect(Array.isArray(rows)).toBe(true);
  });
});
