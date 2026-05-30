import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EDOC23B_FLOWSHEET_COMPLETION_CARD_IDS,
  EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS,
  calculateCiwaArTotal,
  calculatePhq9Total,
  deriveCiwaArSeverity,
  derivePhq9Severity,
  listClinicalDocumentationCardsByCategory,
  listClinicalDocumentationCardsForCareSetting,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation foundation completion (EDOC.23B)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const flowsheetForm = readFileSync(
    join(
      webSrcRoot,
      "features/clinical-documentation/ClinicalDocumentationFlowsheetCompletionForm.tsx"
    ),
    "utf8"
  );
  const scoreForm = readFileSync(
    join(
      webSrcRoot,
      "features/clinical-documentation/ClinicalDocumentationScoreScreenCompletionForm.tsx"
    ),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.23B flowsheet and score forms", () => {
    expect(hub).toContain("isEdoc23bFlowsheetCompletionFormCard");
    expect(hub).toContain("isEdoc23bScoreScreenCompletionFormCard");
    expect(hub).toContain("ClinicalDocumentationFlowsheetCompletionForm");
    expect(hub).toContain("ClinicalDocumentationScoreScreenCompletionForm");
  });

  it("flowsheet form renders CPR, MI thrombolytic, observation cards", () => {
    expect(flowsheetForm).toContain("clinical-documentation-flowsheet-completion-form");
    expect(flowsheetForm).toContain("flow-cpr-start-time");
    expect(flowsheetForm).toContain("flow-mi-thrombolytic-time");
    expect(flowsheetForm).toContain("flow-observation-time");
    expect(flowsheetForm).toContain("validateFoundationCatalogCompletionPayloadForCard");
    expect(flowsheetForm).toContain("CPR_EVENT_TYPE_OPTIONS");
    expect(flowsheetForm).toContain("flowsheet-provider-notification-banner");
    expect(flowsheetForm).toContain('data-compact-layout="true"');
  });

  it("score form auto-calculates totals and displays severity/risk", () => {
    expect(scoreForm).toContain("clinical-documentation-score-screen-completion-form");
    expect(scoreForm).toContain("score-ciwa-calculated");
    expect(scoreForm).toContain("score-phq9-calculated");
    expect(scoreForm).toContain("calculateCiwaArTotal");
    expect(scoreForm).toContain("deriveCiwaArSeverity");
    expect(scoreForm).toContain("calculatePhq9Total");
    expect(scoreForm).toContain("score-provider-notification-banner");
    expect(scoreForm).toContain("validateFoundationCatalogCompletionPayloadForCard");
  });

  it("score calculation support matches shared helpers", () => {
    const ciwaItems = {
      nauseaVomiting: 4,
      tremor: 4,
      paroxysmalSweats: 4,
      anxiety: 4,
      agitation: 0,
      tactileDisturbances: 0,
      auditoryDisturbances: 0,
      visualDisturbances: 0,
      headache: 0,
      orientationClouding: 0,
    };
    const ciwaTotal = calculateCiwaArTotal(ciwaItems);
    expect(ciwaTotal).toBe(16);
    expect(deriveCiwaArSeverity(ciwaTotal)).toBe("SEVERE");

    const phqItems = {
      littleInterest: 3,
      feelingDown: 3,
      sleepTrouble: 3,
      fatigue: 3,
      appetite: 3,
      feelingBad: 3,
      concentration: 2,
      psychomotor: 2,
      suicidalIdeation: 0,
    };
    expect(derivePhq9Severity(calculatePhq9Total(phqItems))).toBe("SEVERE");
  });

  it("hub routes upgraded cards through isEdoc23b form helpers", () => {
    expect(hub).toContain("isEdoc23bFlowsheetCompletionFormCard");
    expect(hub).toContain("isEdoc23bScoreScreenCompletionFormCard");
    expect(hub).toContain('card.implementationStatus === "AVAILABLE"');
    expect(hub).toContain('t("clinicalDocumentation.actionOpen")');
  });

  it("hidden superseded flowsheet cards not in FLOWSHEETS tab", () => {
    const flowsheets = listClinicalDocumentationCardsByCategory("FLOWSHEETS", "ED");
    expect(flowsheets.some((c) => c.id === "flow_thrombolytic_stroke")).toBe(false);
    expect(flowsheets.some((c) => c.id === "flow_restraint_monitoring")).toBe(false);
    expect(flowsheets.some((c) => c.id === "flow_cardiac_monitoring")).toBe(false);
  });

  it("upgraded flowsheet cards visible in FLOWSHEETS tab", () => {
    const flowsheets = listClinicalDocumentationCardsByCategory("FLOWSHEETS", "ED");
    for (const cardId of EDOC23B_FLOWSHEET_COMPLETION_CARD_IDS) {
      expect(flowsheets.some((c) => c.id === cardId)).toBe(true);
    }
  });

  it("upgraded score cards visible in SCORES_AND_SCREENS tab", () => {
    const scores = listClinicalDocumentationCardsByCategory("SCORES_AND_SCREENS", "ED");
    for (const cardId of EDOC23B_SCORE_SCREEN_COMPLETION_CARD_IDS) {
      expect(scores.some((c) => c.id === cardId)).toBe(true);
    }
  });

  it("CPR AVAILABLE in FLOWSHEETS tab but not All tab", () => {
    const allEd = listClinicalDocumentationCardsForCareSetting("ED");
    expect(allEd.some((c) => c.id === "flow_cpr_record")).toBe(false);
    const flowsheets = listClinicalDocumentationCardsByCategory("FLOWSHEETS", "ED");
    expect(flowsheets.some((c) => c.id === "flow_cpr_record")).toBe(true);
    const cpr = flowsheets.find((c) => c.id === "flow_cpr_record");
    expect(cpr?.implementationStatus).toBe("AVAILABLE");
  });

  it("bilingual EDOC.23B form keys mirrored", () => {
    expect(en).toContain("flowsheetCompletion:");
    expect(fr).toContain("flowsheetCompletion:");
    expect(en).toContain("scoreScreenCompletion:");
    expect(fr).toContain("scoreScreenCompletion:");
    expect(en).toContain("providerNotificationRequired:");
    expect(fr).toContain("providerNotificationRequired:");
    expect(en).toContain("severityBand:");
    expect(fr).toContain("severityBand:");
  });

  it("sample card IDs covered by form helpers", () => {
    expect(flowsheetForm).toContain("FLOW_CPR_RECORD_CARD_ID");
    expect(scoreForm).toContain("SCORE_CIWA_AR_CARD_ID");
    expect(scoreForm).toContain("SCORE_PHQ9_CARD_ID");
  });
});
