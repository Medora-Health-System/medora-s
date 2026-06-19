import { describe, expect, it } from "vitest";
import {
  buildClinicalDataRecentHighlights,
  buildClinicalDataSummaryProjection,
  buildClinicalDataSummarySections,
  type ClinicalDataProjectionEntry,
} from "./clinicalDataSummaryProjection.js";
import {
  IO_FLUID_INTAKE_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
} from "./intakeOutputDocumentationPayloads.js";
import { STROKE_NIHSS_CARD_ID } from "./strokeDocumentationPayloads.js";
import { GLASGOW_COMA_SCALE_CARD_ID } from "./strokeNeuroReassessmentDocumentationPayloads.js";
import {
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
} from "./foundationCatalogCompletionPayloads.js";
import {
  RESP_ASSESSMENT_CARD_ID,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
} from "./respiratoryDocumentationPayloads.js";
import {
  TELEMETRY_REASSESSMENT_CARD_ID,
  RHYTHM_STRIP_DOCUMENTATION_CARD_ID,
} from "./cardiacMonitoringDocumentationPayloads.js";

const NIHSS_PAYLOAD = {
  assessedAt: "2026-06-19T13:12:00.000Z",
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
  totalScore: 8,
};

const GCS_PAYLOAD = {
  assessedAt: "2026-06-19T13:05:00.000Z",
  eyeOpening: 4,
  verbalResponse: 5,
  motorResponse: 6,
  totalScore: 15,
  severityBand: "MILD",
  providerNotified: false,
};

const CIWA_PAYLOAD = {
  assessedAt: "2026-06-19T12:58:00.000Z",
  nausea: 1,
  tremor: 2,
  sweats: 1,
  anxiety: 2,
  agitation: 1,
  tactileDisturbances: 0,
  auditoryDisturbances: 0,
  visualDisturbances: 0,
  headache: 1,
  orientation: 0,
  totalScore: 8,
  severityBand: "MODERATE",
};

const COWS_PAYLOAD = {
  assessedAt: "2026-06-19T12:50:00.000Z",
  pulseRate: 1,
  sweating: 1,
  restlessness: 2,
  pupilSize: 1,
  boneJointAche: 1,
  runnyNose: 0,
  giUpset: 1,
  tremor: 2,
  yawning: 1,
  anxietyIrritability: 1,
  gooseflesh: 0,
  totalScore: 11,
  severityBand: "MODERATE",
};

const RESP_PAYLOAD = {
  assessmentTime: "2026-06-19T12:40:00.000Z",
  respiratoryRate: 18,
  spo2: 96,
  oxygenDevice: "ROOM_AIR" as const,
  workOfBreathing: "NORMAL" as const,
  breathSounds: "CLEAR" as const,
  breathSoundsLocation: "BILATERAL" as const,
  cough: "NONE" as const,
  sputumPresent: false,
  accessoryMuscleUse: false,
  retractions: false,
  cyanosis: false,
  patientPosition: "SEMI_FOWLER" as const,
  providerNotified: false,
};

const OXYGEN_PAYLOAD = {
  startedAt: "2026-06-19T12:35:00.000Z",
  oxygenDevice: "NASAL_CANNULA" as const,
  flowRate: 2,
  flowUnit: "LPM" as const,
  spo2Before: 90,
  spo2After: 95,
  reason: "HYPOXIA" as const,
  providerOrderVerified: true,
  patientTolerated: true,
  providerNotified: true,
};

const TELEMETRY_PAYLOAD = {
  assessmentTime: "2026-06-19T12:30:00.000Z",
  currentRhythm: "SINUS_RHYTHM" as const,
  heartRate: 78,
  bloodPressure: "120/80",
  symptomatic: "NO" as const,
  chestPain: "NO" as const,
  palpitations: "NO" as const,
  shortnessOfBreath: "NO" as const,
  changeFromPrevious: "NO" as const,
  providerNotified: "NO" as const,
};

const RHYTHM_STRIP_PAYLOAD = {
  assessmentTime: "2026-06-19T12:25:00.000Z",
  rhythm: "SINUS_RHYTHM" as const,
  rate: 80,
  stripReviewedByClinician: "YES" as const,
  interpretation: "NORMAL" as const,
  providerNotified: "NO" as const,
};

function entry(
  partial: Partial<ClinicalDataProjectionEntry> & Pick<ClinicalDataProjectionEntry, "id" | "cardId" | "createdAt" | "payloadJson">
): ClinicalDataProjectionEntry {
  return {
    category: "STROKE_DOCUMENTATION",
    cardTitleEn: partial.cardTitleEn ?? partial.cardId,
    cardTitleFr: partial.cardTitleFr ?? partial.cardId,
    authorDisplayName: partial.authorDisplayName ?? "Elizabeth Posada",
    authorRoleTitle: partial.authorRoleTitle ?? "RN",
    voidedAt: partial.voidedAt ?? null,
    witnessStatus: partial.witnessStatus ?? "NOT_REQUIRED",
    ...partial,
  };
}

describe("clinicalDataSummaryProjection (MEDUI.ED.CLINICAL_DATA.2)", () => {
  it("1 — NIHSS projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e1",
          cardId: STROKE_NIHSS_CARD_ID,
          createdAt: "2026-06-19T13:12:00.000Z",
          payloadJson: NIHSS_PAYLOAD,
          category: "STROKE_DOCUMENTATION",
          cardTitleEn: "NIHSS",
        }),
      ],
      locale: "en",
    });
    const neuro = projection.sections.find((s) => s.sectionId === "NEUROLOGY");
    expect(neuro?.metrics.some((m) => m.metricId === "nihss" && m.value === "8")).toBe(true);
  });

  it("2 — GCS projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e2",
          cardId: GLASGOW_COMA_SCALE_CARD_ID,
          createdAt: "2026-06-19T13:05:00.000Z",
          payloadJson: GCS_PAYLOAD,
          category: "STROKE_DOCUMENTATION",
          cardTitleEn: "Glasgow Coma Scale",
        }),
      ],
      locale: "en",
    });
    const neuro = projection.sections.find((s) => s.sectionId === "NEUROLOGY");
    expect(neuro?.metrics.some((m) => m.metricId === "gcs" && m.value === "15")).toBe(true);
  });

  it("3 — CIWA projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e3",
          cardId: SCORE_CIWA_AR_CARD_ID,
          createdAt: "2026-06-19T12:58:00.000Z",
          payloadJson: CIWA_PAYLOAD,
          category: "SCORES_AND_SCREENS",
          cardTitleEn: "CIWA-Ar",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "WITHDRAWAL_PSYCH");
    expect(section?.metrics.some((m) => m.metricId === "ciwa" && m.value === "8")).toBe(true);
  });

  it("4 — COWS projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e4",
          cardId: SCORE_COWS_CARD_ID,
          createdAt: "2026-06-19T12:50:00.000Z",
          payloadJson: COWS_PAYLOAD,
          category: "SCORES_AND_SCREENS",
          cardTitleEn: "COWS",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "WITHDRAWAL_PSYCH");
    expect(section?.metrics.some((m) => m.metricId === "cows" && m.value === "11")).toBe(true);
  });

  it("5 — respiratory assessment projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e5",
          cardId: RESP_ASSESSMENT_CARD_ID,
          createdAt: "2026-06-19T12:40:00.000Z",
          payloadJson: RESP_PAYLOAD,
          category: "RESPIRATORY_DOCUMENTATION",
          cardTitleEn: "Respiratory Assessment",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "RESPIRATORY");
    expect(section?.metrics.some((m) => m.metricId === "resp_assessment_rr" && m.value === "18")).toBe(true);
    expect(section?.metrics.some((m) => m.metricId === "resp_assessment_spo2" && m.value === "96%")).toBe(true);
  });

  it("6 — oxygen therapy projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e6",
          cardId: OXYGEN_THERAPY_INITIATION_CARD_ID,
          createdAt: "2026-06-19T12:35:00.000Z",
          payloadJson: OXYGEN_PAYLOAD,
          category: "RESPIRATORY_DOCUMENTATION",
          cardTitleEn: "Oxygen Therapy Initiation",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "RESPIRATORY");
    expect(section?.metrics.some((m) => m.metricId.startsWith("oxygen_init"))).toBe(true);
  });

  it("7 — telemetry projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e7",
          cardId: TELEMETRY_REASSESSMENT_CARD_ID,
          createdAt: "2026-06-19T12:30:00.000Z",
          payloadJson: TELEMETRY_PAYLOAD,
          category: "CARDIAC_MONITORING_DOCUMENTATION",
          cardTitleEn: "Telemetry Reassessment",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "CARDIAC");
    expect(section?.metrics.some((m) => m.metricId === "telemetry_rhythm")).toBe(true);
    expect(section?.metrics.some((m) => m.metricId === "telemetry_rate")).toBe(true);
  });

  it("8 — rhythm strip projected correctly", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "e8",
          cardId: RHYTHM_STRIP_DOCUMENTATION_CARD_ID,
          createdAt: "2026-06-19T12:25:00.000Z",
          payloadJson: RHYTHM_STRIP_PAYLOAD,
          category: "CARDIAC_MONITORING_DOCUMENTATION",
          cardTitleEn: "Rhythm Strip Documentation",
        }),
      ],
      locale: "en",
    });
    const section = projection.sections.find((s) => s.sectionId === "CARDIAC");
    expect(section?.metrics.some((m) => m.metricId === "rhythm_strip_rhythm")).toBe(true);
  });

  it("9 — intake totals calculated", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "i1",
          cardId: IO_FLUID_INTAKE_CARD_ID,
          createdAt: "2026-06-19T11:00:00.000Z",
          payloadJson: {
            recordedAt: "2026-06-19T11:00:00.000Z",
            amount: 500,
            unit: "ML",
            route: "IV",
            fluidType: "NS",
          },
          category: "INTAKE_OUTPUT",
        }),
      ],
      locale: "en",
      asOfIso: "2026-06-19T13:12:00.000Z",
    });
    expect(projection.intakeOutput.totalIntakeMl).toBe(500);
  });

  it("10 — output totals calculated", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "o1",
          cardId: IO_URINE_OUTPUT_CARD_ID,
          createdAt: "2026-06-19T11:30:00.000Z",
          payloadJson: {
            recordedAt: "2026-06-19T11:30:00.000Z",
            amount: 200,
            unit: "ML",
            method: "VOIDED",
          },
          category: "INTAKE_OUTPUT",
        }),
      ],
      locale: "en",
      asOfIso: "2026-06-19T13:12:00.000Z",
    });
    expect(projection.intakeOutput.totalOutputMl).toBe(200);
  });

  it("11 — net balance calculated", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "i2",
          cardId: IO_FLUID_INTAKE_CARD_ID,
          createdAt: "2026-06-19T11:00:00.000Z",
          payloadJson: {
            recordedAt: "2026-06-19T11:00:00.000Z",
            amount: 500,
            unit: "ML",
            route: "IV",
            fluidType: "NS",
          },
          category: "INTAKE_OUTPUT",
        }),
        entry({
          id: "o2",
          cardId: IO_URINE_OUTPUT_CARD_ID,
          createdAt: "2026-06-19T11:30:00.000Z",
          payloadJson: {
            recordedAt: "2026-06-19T11:30:00.000Z",
            amount: 200,
            unit: "ML",
            method: "VOIDED",
          },
          category: "INTAKE_OUTPUT",
        }),
      ],
      locale: "en",
      asOfIso: "2026-06-19T13:12:00.000Z",
    });
    expect(projection.intakeOutput.netBalanceMl).toBe(300);
  });

  it("12 — missing data handled", () => {
    const projection = buildClinicalDataSummaryProjection({ entries: [], locale: "en" });
    expect(projection.sections).toEqual([]);
    expect(projection.intakeOutput.insufficientData).toBe(true);
  });

  it("13 — recent feed sorted newest first", () => {
    const feed = buildClinicalDataRecentHighlights([
      entry({ id: "a", cardId: STROKE_NIHSS_CARD_ID, createdAt: "2026-06-19T10:00:00.000Z", payloadJson: NIHSS_PAYLOAD }),
      entry({ id: "b", cardId: SCORE_CIWA_AR_CARD_ID, createdAt: "2026-06-19T12:00:00.000Z", payloadJson: CIWA_PAYLOAD, category: "SCORES_AND_SCREENS" }),
    ]);
    expect(feed[0]?.id).toBe("b");
    expect(feed[1]?.id).toBe("a");
  });

  it("14 — author displayed in feed", () => {
    const feed = buildClinicalDataRecentHighlights([
      entry({
        id: "c",
        cardId: STROKE_NIHSS_CARD_ID,
        createdAt: "2026-06-19T12:00:00.000Z",
        payloadJson: NIHSS_PAYLOAD,
        authorDisplayName: "Elizabeth Posada",
      }),
    ]);
    expect(feed[0]?.authorDisplayName).toBe("Elizabeth Posada");
  });

  it("21 — projection is deterministic", () => {
    const entries = [
      entry({ id: "d1", cardId: STROKE_NIHSS_CARD_ID, createdAt: "2026-06-19T13:12:00.000Z", payloadJson: NIHSS_PAYLOAD }),
    ];
    const a = buildClinicalDataSummaryProjection({ entries, locale: "en", asOfIso: "2026-06-19T13:12:00.000Z" });
    const b = buildClinicalDataSummaryProjection({ entries, locale: "en", asOfIso: "2026-06-19T13:12:00.000Z" });
    expect(a).toEqual(b);
  });

  it("15 — date available on feed items", () => {
    const feed = buildClinicalDataRecentHighlights([
      entry({
        id: "d1",
        cardId: STROKE_NIHSS_CARD_ID,
        createdAt: "2026-06-19T13:12:00.000Z",
        payloadJson: NIHSS_PAYLOAD,
      }),
    ]);
    expect(feed[0]?.documentedAt).toBe("2026-06-19T13:12:00.000Z");
  });

  it("16 — time sort uses createdAt timestamps", () => {
    const feed = buildClinicalDataRecentHighlights([
      entry({ id: "a", cardId: SCORE_CIWA_AR_CARD_ID, createdAt: "2026-06-19T12:00:00.000Z", payloadJson: CIWA_PAYLOAD, category: "SCORES_AND_SCREENS" }),
      entry({ id: "b", cardId: STROKE_NIHSS_CARD_ID, createdAt: "2026-06-19T13:12:00.000Z", payloadJson: NIHSS_PAYLOAD }),
    ]);
    expect(Date.parse(feed[0]!.documentedAt)).toBeGreaterThan(Date.parse(feed[1]!.documentedAt));
  });

  it("voided entries excluded from projection sections", () => {
    const projection = buildClinicalDataSummaryProjection({
      entries: [
        entry({
          id: "void",
          cardId: STROKE_NIHSS_CARD_ID,
          createdAt: "2026-06-19T13:12:00.000Z",
          payloadJson: NIHSS_PAYLOAD,
          voidedAt: "2026-06-19T14:00:00.000Z",
        }),
      ],
      locale: "en",
    });
    expect(projection.sections).toEqual([]);
  });
});
