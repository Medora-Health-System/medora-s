/**
 * MEDUI.CP.1D — Care Plan suggestion projector unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  CARE_PLAN_SUGGESTION_SIGNAL_CARD_IDS,
  suggestEncounterCarePlans,
} from "./encounterCarePlanSuggestionsCp1d.js";
import { MORSE_FALL_RISK_ASSESSMENT_CARD_ID } from "./fallRiskSafetyDocumentationPayloads.js";
import { BRADEN_RISK_ASSESSMENT_CARD_ID } from "./skinWoundPressureInjuryDocumentationPayloads.js";
import { MOBILITY_AMBULATION_ASSESSMENT_CARD_ID } from "./fallRiskSafetyDocumentationPayloads.js";
import { STROKE_SWALLOW_SCREEN_CARD_ID } from "./strokeDocumentationPayloads.js";

describe("suggestEncounterCarePlans CP.1D", () => {
  it("1. qualifying Morse HIGH → fall_risk activate suggestion", () => {
    const suggestions = suggestEncounterCarePlans({
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "HIGH" },
          documentedAt: "2026-08-25T12:00:00.000Z",
        },
      ],
    });
    expect(suggestions).toEqual([
      {
        templateId: "fall_risk",
        kind: "SUGGEST_ACTIVATE",
        reasonKey: "fallRiskMorseAssessment",
        sourceKind: "FALL_RISK_ASSESSMENT",
      },
    ]);
  });

  it("2. no qualifying signal → no suggestion", () => {
    expect(suggestEncounterCarePlans({ clinicalDocs: [] })).toEqual([]);
    expect(
      suggestEncounterCarePlans({
        clinicalDocs: [
          {
            cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
            payload: { riskLevel: "LOW" },
          },
        ],
      })
    ).toEqual([]);
  });

  it("3. ambiguous / free-text-like payload → no suggestion", () => {
    expect(
      suggestEncounterCarePlans({
        clinicalDocs: [
          {
            cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
            payload: { note: "patient seems unsteady" },
          },
        ],
        nursingAssessment: { fallRiskLevel: "maybe" },
      })
    ).toEqual([]);
  });

  it("4. stale Morse HIGH then latest LOW → no current fall suggestion", () => {
    const suggestions = suggestEncounterCarePlans({
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "HIGH" },
          documentedAt: "2026-08-20T12:00:00.000Z",
        },
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "LOW" },
          documentedAt: "2026-08-25T12:00:00.000Z",
        },
      ],
    });
    expect(suggestions.filter((s) => s.templateId === "fall_risk")).toEqual([]);
  });

  it("5. active matching plan → duplicate activate suppressed; review suggested", () => {
    const suggestions = suggestEncounterCarePlans({
      activePlans: [{ templateId: "fall_risk", status: "ACTIVE" }],
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "MODERATE" },
          documentedAt: "2026-08-25T12:00:00.000Z",
        },
      ],
    });
    expect(suggestions).toEqual([
      {
        templateId: "fall_risk",
        kind: "SUGGEST_REVIEW",
        reasonKey: "activePlanReviewFallRisk",
        sourceKind: "FALL_RISK_ASSESSMENT",
      },
    ]);
  });

  it("6. unrelated active plan → suggestion still allowed", () => {
    const suggestions = suggestEncounterCarePlans({
      activePlans: [{ templateId: "acute_pain", status: "ACTIVE" }],
      clinicalDocs: [
        {
          cardId: BRADEN_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "HIGH" },
        },
      ],
    });
    expect(suggestions.some((s) => s.templateId === "pressure_injury_risk" && s.kind === "SUGGEST_ACTIVATE")).toBe(
      true
    );
  });

  it("7–8. source change reevaluates and does not require mutating active plans", () => {
    const withRisk = suggestEncounterCarePlans({
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "HIGH" },
          documentedAt: "2026-08-25T10:00:00.000Z",
        },
      ],
    });
    expect(withRisk).toHaveLength(1);
    const cleared = suggestEncounterCarePlans({
      activePlans: [{ templateId: "fall_risk", status: "ACTIVE" }],
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "LOW" },
          documentedAt: "2026-08-25T14:00:00.000Z",
        },
      ],
    });
    // No review/activate when source no longer qualifies — active plan untouched by projector.
    expect(cleared).toEqual([]);
  });

  it("9. suggestion output never includes plan mutation fields", () => {
    const suggestions = suggestEncounterCarePlans({
      nursingAssessment: { fallRiskLevel: "HIGH" },
    });
    expect(JSON.stringify(suggestions)).not.toMatch(/\b(orderId|marId|diagnosisId|autoActivate)\b/i);
    expect(suggestions[0]?.kind).toBe("SUGGEST_ACTIVATE");
  });

  it("mobility / aspiration / nursing fallback", () => {
    expect(
      suggestEncounterCarePlans({
        clinicalDocs: [
          {
            cardId: MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
            payload: { mobilityLevel: "TWO_PERSON_ASSIST", gaitStability: "STABLE" },
          },
        ],
      })[0]?.templateId
    ).toBe("impaired_mobility");

    expect(
      suggestEncounterCarePlans({
        clinicalDocs: [
          {
            cardId: STROKE_SWALLOW_SCREEN_CARD_ID,
            payload: { result: "FAILED" },
          },
        ],
      })[0]?.templateId
    ).toBe("aspiration_risk");

    expect(
      suggestEncounterCarePlans({
        nursingAssessment: { fallRiskLevel: "MODERATE" },
      })[0]?.reasonKey
    ).toBe("fallRiskNursingAssessment");
  });

  it("session dismissal suppresses suggestion", () => {
    expect(
      suggestEncounterCarePlans({
        nursingAssessment: { fallRiskLevel: "HIGH" },
        dismissedTemplateIds: ["fall_risk"],
      })
    ).toEqual([]);
  });

  it("voided docs are ignored", () => {
    expect(
      suggestEncounterCarePlans({
        clinicalDocs: [
          {
            cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
            payload: { riskLevel: "HIGH" },
            voidedAt: "2026-08-25T12:00:00.000Z",
          },
        ],
      })
    ).toEqual([]);
  });

  it("signal card batch is bounded (no fan-out catalog)", () => {
    expect(CARE_PLAN_SUGGESTION_SIGNAL_CARD_IDS).toHaveLength(4);
  });

  it("17–18. reason keys are clinician i18n tokens (no engineering ids)", () => {
    const suggestions = suggestEncounterCarePlans({
      clinicalDocs: [
        {
          cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
          payload: { riskLevel: "HIGH" },
        },
      ],
    });
    const blob = JSON.stringify(suggestions);
    expect(blob).not.toMatch(/D3E|D4B|CP\.1D|UUID|rule_|CARE_PLAN_RULE/i);
    expect(suggestions[0]?.reasonKey).toBe("fallRiskMorseAssessment");
  });
});
