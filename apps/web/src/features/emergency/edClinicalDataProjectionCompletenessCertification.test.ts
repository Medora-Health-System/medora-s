import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClinicalDataRecentHighlights,
  buildClinicalDataSummaryProjection,
  resolveClinicalDocumentationStructuredDisplayLines,
  RESP_ASSESSMENT_CARD_ID,
  SCORE_CIWA_AR_CARD_ID,
  SCORE_COWS_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_HEART_CARD_ID,
} from "@medora/shared";
import type { ClinicalDataProjectionEntry } from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

const ISO = "2026-06-19T18:00:00.000Z";

function fiveFormEntries(): ClinicalDataProjectionEntry[] {
  return [
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
}

describe("edClinicalDataProjectionCompletenessCertification (MEDUI.ED.CLINICAL_DATA.5B)", () => {
  const entries = fiveFormEntries();
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const summary = readSrc("features/emergency/EmergencyClinicalDataSummary.tsx");
  const recentFeed = readSrc("features/emergency/EmergencyClinicalDataRecentFeed.tsx");
  const edSummaryPanel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("Clinical Summary UI wires projection for simultaneous multi-form display", () => {
    expect(summary).toContain("buildClinicalDataSummaryProjection");
    expect(panel).toContain("EmergencyClinicalDataSummary");
    expect(panel).toContain("externalEntries={entries}");
  });

  it("all five forms project together through shared summary builder", () => {
    const projection = buildClinicalDataSummaryProjection({ entries, locale: "en" });
    const cardIds = projection.sections.flatMap((s) => s.metrics.map((m) => m.cardId));
    expect(cardIds).toContain(SCORE_HEART_CARD_ID);
    expect(cardIds).toContain(SCORE_CIWA_AR_CARD_ID);
    expect(cardIds).toContain(SCORE_COWS_CARD_ID);
    expect(cardIds).toContain(SCORE_CSSRS_CARD_ID);
    expect(cardIds).toContain(RESP_ASSESSMENT_CARD_ID);
  });

  it("all five forms appear in recent highlights simultaneously", () => {
    const recent = buildClinicalDataRecentHighlights(entries, "en");
    expect(recent).toHaveLength(5);
    const ids = recent.map((r) => r.cardId);
    expect(ids).toContain(SCORE_HEART_CARD_ID);
    expect(ids).toContain(SCORE_CIWA_AR_CARD_ID);
    expect(ids).toContain(SCORE_COWS_CARD_ID);
    expect(ids).toContain(SCORE_CSSRS_CARD_ID);
    expect(ids).toContain(RESP_ASSESSMENT_CARD_ID);
  });

  it("6 — 16-card Recent Documentation cap is intentional in UI", () => {
    expect(recentFeed).toContain("feed.slice(0, 16)");
    const manyEntries = Array.from({ length: 20 }, (_, i) => ({
      ...entries[0]!,
      id: `entry-${i}`,
      createdAt: new Date(Date.UTC(2026, 5, 19, 12, i, 0)).toISOString(),
    }));
    expect(buildClinicalDataRecentHighlights(manyEntries, "en")).toHaveLength(20);
  });

  it("ED Summary panel uses structured display lines (not title-only)", () => {
    expect(edSummaryPanel).toContain("resolveClinicalDocumentationStructuredDisplayLines");
    for (const entry of entries) {
      const lines = resolveClinicalDocumentationStructuredDisplayLines(entry, "en");
      expect(lines.length).toBeGreaterThan(0);
    }
  });

  it("ED Summary structured values include score/risk for HEART and CIWA", () => {
    const heartLines = resolveClinicalDocumentationStructuredDisplayLines(entries[0]!, "en");
    const ciwaLines = resolveClinicalDocumentationStructuredDisplayLines(entries[1]!, "en");
    expect(heartLines.some((l) => /HEART|Score|Risk|Provider/i.test(`${l.key} ${l.value}`))).toBe(true);
    expect(ciwaLines.some((l) => /Severity|CIWA|Score|Provider/i.test(l.key))).toBe(true);
  });

  it("provider-owned and nursing-owned forms both present in same projection", () => {
    const metrics = buildClinicalDataSummaryProjection({ entries, locale: "en" }).sections.flatMap(
      (s) => s.metrics
    );
    expect(metrics.some((m) => m.cardId === SCORE_HEART_CARD_ID && m.authorRoleTitle === "Provider")).toBe(
      true
    );
    expect(metrics.some((m) => m.cardId === SCORE_CIWA_AR_CARD_ID && m.authorRoleTitle === "RN")).toBe(
      true
    );
  });
});

describe("edClinicalDataProjectionCompletenessCertification hub regression (5B + 5C)", () => {
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("Clinical Documentation Hub retains horizontal catalog scroll from 5C", () => {
    expect(hub).toContain('data-testid="clinical-documentation-catalog-scroll"');
    expect(hub).toContain('overflowX: "auto"');
    expect(hub).toContain('flexWrap: "nowrap"');
    expect(hub).toContain("handleCatalogHorizontalWheel");
  });

  it("Hub uses single catalog container for all role filters", () => {
    expect(hub).toContain("filterClinicalDocumentationCardsByRole");
    expect(hub).toContain("data-role-filter={selectedRoleFilter}");
    expect((hub.match(/clinical-documentation-catalog-scroll/g) ?? []).length).toBe(1);
  });
});
