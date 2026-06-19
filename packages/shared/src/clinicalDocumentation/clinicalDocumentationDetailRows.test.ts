import { describe, expect, it } from "vitest";
import {
  buildClinicalDocumentationDetailRows,
  formatClinicalDocumentationDetailInline,
} from "./clinicalDocumentationDetailRows.js";
import { SCORE_CIWA_AR_CARD_ID } from "./foundationCatalogCompletionPayloads.js";

const CIWA_PAYLOAD = {
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
  severity: "MILD" as const,
  providerNotified: "YES" as const,
};

describe("clinicalDocumentationDetailRows (MEDUI.ED.CLINICAL_DATA.3)", () => {
  it("CIWA detail rows include score, severity, provider notified, and component scores", () => {
    const rows = buildClinicalDocumentationDetailRows(
      {
        id: "e1",
        cardId: SCORE_CIWA_AR_CARD_ID,
        category: "SCORES_AND_SCREENS",
        cardTitleEn: "CIWA-Ar",
        cardTitleFr: "CIWA-Ar",
        authorDisplayName: "Elizabeth Posada",
        authorRoleTitle: "RN",
        createdAt: "2026-06-19T18:28:00.000Z",
        voidedAt: null,
        payloadJson: CIWA_PAYLOAD,
      },
      "en"
    );
    expect(rows.some((r) => /CIWA-Ar|Score/i.test(r.label) && r.value.includes("6"))).toBe(true);
    expect(rows.some((r) => /Severity/i.test(r.label) && /Mild/i.test(r.value))).toBe(true);
    expect(rows.some((r) => /Provider notified/i.test(r.label))).toBe(true);
    expect(rows.some((r) => r.label === "Nausea/vomiting" && r.value === "1")).toBe(true);
    expect(rows.some((r) => r.label === "Tremor" && r.value === "1")).toBe(true);
  });

  it("formatClinicalDocumentationDetailInline joins rows compactly", () => {
    const rows = buildClinicalDocumentationDetailRows(
      {
        id: "e1",
        cardId: SCORE_CIWA_AR_CARD_ID,
        category: "SCORES_AND_SCREENS",
        cardTitleEn: "CIWA-Ar",
        cardTitleFr: "CIWA-Ar",
        authorDisplayName: "Elizabeth Posada",
        authorRoleTitle: "RN",
        createdAt: "2026-06-19T18:28:00.000Z",
        voidedAt: null,
        payloadJson: CIWA_PAYLOAD,
      },
      "en"
    );
    const inline = formatClinicalDocumentationDetailInline(rows, 4);
    expect(inline).toContain("·");
    expect(inline.length).toBeGreaterThan(10);
  });
});
