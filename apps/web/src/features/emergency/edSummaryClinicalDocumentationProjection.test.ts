import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveClinicalDocumentationStructuredDisplayLines,
  SCORE_HEART_CARD_ID,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edSummaryClinicalDocumentationProjection (MEDUI.ED.CLINICAL_DATA.5)", () => {
  const panel = readSrc("features/emergency/EmergencyVisitSummaryPanel.tsx");

  it("3 — ED Summary uses structured display lines for clinical documentation", () => {
    expect(panel).toContain("resolveClinicalDocumentationStructuredDisplayLines");
    expect(panel).toContain("clinicalDocumentation.summarySectionTitle");
  });

  it("HEART Score structured lines include score details", () => {
    const lines = resolveClinicalDocumentationStructuredDisplayLines(
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
      },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((line) => /HEART|Score|Risk|Provider/i.test(`${line.key} ${line.value}`))).toBe(
      true
    );
  });

  it("6 — CIWA still projects with full details in structured lines", () => {
    const lines = resolveClinicalDocumentationStructuredDisplayLines(
      {
        id: "ciwa-1",
        cardId: "score_ciwa_ar",
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
      },
      "en"
    );
    expect(lines.some((line) => /Severity|Score|Provider notified/i.test(line.key))).toBe(true);
  });
});
