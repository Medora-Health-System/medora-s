import { describe, expect, it } from "vitest";
import {
  buildClinicalDataRecentHighlights,
  buildClinicalDataSummaryProjection,
  type ClinicalDataProjectionEntry,
} from "./clinicalDataSummaryProjection.js";
import { resolveClinicalDocumentationStructuredDisplayLines } from "./clinicalDocumentationDetailRows.js";
import {
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_HEART_CARD_ID,
} from "./foundationCatalogCompletionPayloads.js";
import { RESP_ASSESSMENT_CARD_ID } from "./respiratoryDocumentationPayloads.js";

const ISO = "2026-06-19T18:00:00.000Z";

const FIVE_FORM_ENTRIES: ClinicalDataProjectionEntry[] = [
  {
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
      assessmentTime: ISO,
      history: 0,
      ecg: 0,
      age: 0,
      riskFactors: 0,
      troponin: 1,
      totalScore: 1,
      riskLevel: "LOW",
      providerNotified: "NO",
    },
  },
  {
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
      assessmentTime: ISO,
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
  },
  {
    id: "cows-1",
    cardId: SCORE_COWS_CARD_ID,
    category: "SCORES_AND_SCREENS",
    cardTitleEn: "COWS",
    cardTitleFr: "COWS",
    authorDisplayName: "RN User",
    authorRoleTitle: "RN",
    createdAt: "2026-06-19T18:20:00.000Z",
    voidedAt: null,
    payloadJson: {
      assessmentTime: ISO,
      restingPulse: 1,
      sweating: 1,
      restlessness: 1,
      pupilSize: 1,
      boneJointAches: 1,
      runnyNoseTearing: 0,
      giUpset: 0,
      tremor: 1,
      yawning: 0,
      anxietyIrritability: 1,
      goosefleshSkin: 0,
      totalScore: 7,
      severity: "MILD",
      providerNotified: "YES",
    },
  },
  {
    id: "cssrs-1",
    cardId: SCORE_CSSRS_CARD_ID,
    category: "SCORES_AND_SCREENS",
    cardTitleEn: "C-SSRS Screen",
    cardTitleFr: "Dépistage C-SSRS",
    authorDisplayName: "RN User",
    authorRoleTitle: "RN",
    createdAt: "2026-06-19T18:10:00.000Z",
    voidedAt: null,
    payloadJson: {
      assessmentTime: ISO,
      wishToBeDead: "NO",
      suicidalThoughts: "NO",
      methodThoughts: "NO",
      intentWithoutPlan: "NO",
      intentWithPlan: "NO",
      suicidalBehavior: "NO",
      riskLevel: "LOW",
      providerNotified: "YES",
      safetyPrecautionsInitiated: "NO",
    },
  },
  {
    id: "resp-1",
    cardId: RESP_ASSESSMENT_CARD_ID,
    category: "RESPIRATORY_DOCUMENTATION",
    cardTitleEn: "Respiratory Assessment",
    cardTitleFr: "Évaluation respiratoire",
    authorDisplayName: "RN User",
    authorRoleTitle: "RN",
    createdAt: "2026-06-19T18:00:00.000Z",
    voidedAt: null,
    payloadJson: {
      assessmentTime: ISO,
      respiratoryRate: 18,
      spo2: 96,
      oxygenDevice: "ROOM_AIR",
      workOfBreathing: "NORMAL",
      breathSounds: "CLEAR",
      breathSoundsLocation: "BILATERAL",
      cough: "NONE",
      sputumPresent: false,
      accessoryMuscleUse: false,
      retractions: false,
      cyanosis: false,
      patientPosition: "SEMI_FOWLER",
      providerNotified: false,
    },
  },
];

const FIVE_CARD_IDS = [
  SCORE_HEART_CARD_ID,
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  RESP_ASSESSMENT_CARD_ID,
] as const;

describe("clinicalDataProjectionCompletenessCertification (MEDUI.ED.CLINICAL_DATA.5B)", () => {
  it("1 — all five forms appear together in Clinical Summary projection", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: FIVE_FORM_ENTRIES,
      locale: "en",
    });
    const summaryCardIds = projection.sections.flatMap((section) =>
      section.metrics.map((metric) => metric.cardId)
    );
    for (const cardId of FIVE_CARD_IDS) {
      expect(summaryCardIds).toContain(cardId);
    }
    expect(projection.sections.some((s) => s.sectionId === "CARDIAC")).toBe(true);
    expect(projection.sections.some((s) => s.sectionId === "WITHDRAWAL_PSYCH")).toBe(true);
    expect(projection.sections.some((s) => s.sectionId === "RESPIRATORY")).toBe(true);
  });

  it("2 — all five forms appear together in Recent Clinical Documentation projection", () => {
    const recent = buildClinicalDataRecentHighlights(FIVE_FORM_ENTRIES, "en");
    expect(recent).toHaveLength(5);
    for (const cardId of FIVE_CARD_IDS) {
      expect(recent.some((item) => item.cardId === cardId)).toBe(true);
    }
  });

  it("3 — ED Summary structured display lines exist for all five forms", () => {
    for (const entry of FIVE_FORM_ENTRIES) {
      const lines = resolveClinicalDocumentationStructuredDisplayLines(entry, "en");
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it("4 — provider-owned HEART Score is not excluded from summary", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: FIVE_FORM_ENTRIES,
      locale: "en",
    });
    const heart = projection.sections
      .flatMap((s) => s.metrics)
      .find((m) => m.cardId === SCORE_HEART_CARD_ID);
    expect(heart?.authorRoleTitle).toBe("Provider");
    expect(heart?.detailRows.length).toBeGreaterThan(0);
  });

  it("5 — nursing-owned CIWA, COWS, and Respiratory Assessment are not excluded", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: FIVE_FORM_ENTRIES,
      locale: "en",
    });
    const metrics = projection.sections.flatMap((s) => s.metrics);
    expect(metrics.some((m) => m.cardId === SCORE_CIWA_AR_CARD_ID && m.authorRoleTitle === "RN")).toBe(
      true
    );
    expect(metrics.some((m) => m.cardId === SCORE_COWS_CARD_ID)).toBe(true);
    expect(metrics.some((m) => m.cardId === RESP_ASSESSMENT_CARD_ID)).toBe(true);
  });

  it("C-SSRS Suicide Screen projects in Withdrawal / Psych with structured details", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: FIVE_FORM_ENTRIES,
      locale: "en",
    });
    const cssrs = projection.sections
      .flatMap((s) => s.metrics)
      .find((m) => m.cardId === SCORE_CSSRS_CARD_ID);
    expect(cssrs).toBeTruthy();
    expect(cssrs?.detailRows.some((row) => /risk|Risk/i.test(row.label))).toBe(true);
  });

  it("recent highlights include detail rows for all five (not title-only)", () => {
    const recent = buildClinicalDataRecentHighlights(FIVE_FORM_ENTRIES, "en");
    for (const item of recent) {
      expect(item.detailRows.length).toBeGreaterThan(0);
    }
  });
});
