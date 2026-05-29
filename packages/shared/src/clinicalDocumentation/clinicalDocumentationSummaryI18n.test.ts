import { describe, expect, it } from "vitest";
import { formatNihssItemSummary } from "./clinicalDocumentationFieldOptions.js";
import {
  IO_PO_INTAKE_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
  summarizeIntakeOutputDocumentationPayload,
} from "./intakeOutputDocumentationPayloads.js";
import {
  OBS_PO_CHALLENGE_CARD_ID,
  summarizeObservationDocumentationPayload,
} from "./observationDocumentationPayloads.js";
import {
  mapClinicalDocumentationEntryForLegalChart,
  selectClinicalDocumentationPayloadSummary,
  summarizeClinicalDocumentationPayload,
  summarizeClinicalDocumentationPayloadBilingual,
} from "./clinicalDocumentationEntry.js";
import {
  STROKE_NIHSS_CARD_ID,
  summarizeStrokeDocumentationPayload,
} from "./strokeDocumentationPayloads.js";

const NIHSS_VALID = {
  assessedAt: "2026-05-28T14:00:00.000Z",
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
  totalScore: 5,
};

const PO_VALID = {
  startTime: "2026-05-28T14:00:00.000Z",
  substance: "Water",
  amount: "8 oz",
  tolerated: "YES",
  nausea: false,
  vomiting: false,
  abdominalPain: false,
  result: "PASSED",
};

describe("EDOC.I18N.1 clinical documentation summary localization", () => {
  it("NIHSS summary EN contains English labels and option meanings", () => {
    const en = summarizeStrokeDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID, "en");
    expect(en.some((l) => l.key === "NIHSS total score" && l.value === "5")).toBe(true);
    expect(en.some((l) => l.key === "NIHSS severity band")).toBe(true);
    expect(en.some((l) => l.key === "Assessed at")).toBe(true);
    expect(en.some((l) => l.key === "NIHSS LOC" && l.value.includes("Alert; keenly responsive"))).toBe(
      true
    );
    expect(en.some((l) => l.key === "NIHSS motor arm R" && l.value.includes("No drift"))).toBe(true);
    expect(en.some((l) => l.key === "Score NIHSS total")).toBe(false);
    expect(en.some((l) => l.key === "Bande de sévérité NIHSS")).toBe(false);
    expect(en.some((l) => l.value.includes("Pas de dérive"))).toBe(false);
  });

  it("NIHSS summary FR still contains French labels and option meanings", () => {
    const fr = summarizeStrokeDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID, "fr");
    expect(fr.some((l) => l.key === "Score NIHSS total" && l.value === "5")).toBe(true);
    expect(fr.some((l) => l.key === "Bande de sévérité NIHSS")).toBe(true);
    expect(fr.some((l) => l.key === "NIHSS conscience" && l.value.includes("Alerte"))).toBe(true);
    expect(fr.some((l) => l.value.includes("Pas de dérive"))).toBe(true);
  });

  it("observation summaries support EN and FR", () => {
    const en = summarizeObservationDocumentationPayload(OBS_PO_CHALLENGE_CARD_ID, PO_VALID, "en");
    const fr = summarizeObservationDocumentationPayload(OBS_PO_CHALLENGE_CARD_ID, PO_VALID, "fr");
    expect(en.some((l) => l.key === "Result" && l.value === "Passed")).toBe(true);
    expect(fr.some((l) => l.key === "Résultat" && l.value === "Réussi")).toBe(true);
    expect(en.some((l) => l.key === "Résultat")).toBe(false);
  });

  it("I&O summaries support EN and FR", () => {
    const en = summarizeIntakeOutputDocumentationPayload(
      IO_PO_INTAKE_CARD_ID,
      {
        recordedAt: "2026-05-28T14:00:00.000Z",
        amount: 240,
        unit: "ML",
        substance: "water",
        tolerated: "YES",
        nausea: false,
        vomiting: false,
      },
      "en"
    );
    const fr = summarizeIntakeOutputDocumentationPayload(
      IO_PO_INTAKE_CARD_ID,
      {
        recordedAt: "2026-05-28T14:00:00.000Z",
        amount: 240,
        unit: "ML",
        substance: "eau",
        tolerated: "YES",
        nausea: false,
        vomiting: false,
      },
      "fr"
    );
    expect(en.some((l) => l.key === "Tolerated" && l.value === "Yes")).toBe(true);
    expect(fr.some((l) => l.key === "Tolérance" && l.value === "Oui")).toBe(true);

    const urineEn = summarizeIntakeOutputDocumentationPayload(
      IO_URINE_OUTPUT_CARD_ID,
      { recordedAt: "2026-05-28T15:00:00.000Z", amount: 400, unit: "ML", method: "FOLEY" },
      "en"
    );
    const urineFr = summarizeIntakeOutputDocumentationPayload(
      IO_URINE_OUTPUT_CARD_ID,
      { recordedAt: "2026-05-28T15:00:00.000Z", amount: 400, unit: "ML", method: "FOLEY" },
      "fr"
    );
    expect(urineEn.some((l) => l.key === "Method" && l.value === "Foley")).toBe(true);
    expect(urineFr.some((l) => l.key === "Méthode" && l.value === "Sonde urinaire")).toBe(true);
  });

  it("formatNihssItemSummary defaults to English, not French", () => {
    const summary = formatNihssItemSummary("motorArmLeft", 0);
    expect(summary).toContain("No drift");
    expect(summary).not.toContain("Pas de dérive");
  });

  it("bilingual mapper exposes payloadSummaryEn and payloadSummaryFr", () => {
    const mapped = mapClinicalDocumentationEntryForLegalChart({
      id: "edoc1",
      encounterId: "enc1",
      category: "STROKE_DOCUMENTATION",
      cardId: STROKE_NIHSS_CARD_ID,
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane",
      authorRoleSnapshot: "RN",
      createdAt: "2026-05-28T12:00:00.000Z",
      payloadJson: NIHSS_VALID,
      voidedAt: null,
    });
    expect(mapped.payloadSummaryEn.some((l) => l.key === "NIHSS total score")).toBe(true);
    expect(mapped.payloadSummaryFr.some((l) => l.key === "Score NIHSS total")).toBe(true);
    expect(mapped.payloadSummary).toEqual(mapped.payloadSummaryEn);
  });

  it("selectClinicalDocumentationPayloadSummary chooses locale with bilingual fields", () => {
    const bilingual = summarizeClinicalDocumentationPayloadBilingual(STROKE_NIHSS_CARD_ID, NIHSS_VALID);
    const entry = {
      payloadSummaryEn: bilingual.payloadSummaryEn,
      payloadSummaryFr: bilingual.payloadSummaryFr,
    };
    expect(selectClinicalDocumentationPayloadSummary(entry, "en")[0]?.key).toBe("NIHSS total score");
    expect(selectClinicalDocumentationPayloadSummary(entry, "fr")[0]?.key).toBe("Score NIHSS total");
  });

  it("selectClinicalDocumentationPayloadSummary never leaks French into English export", () => {
    const legacyFrenchOnly = {
      cardId: STROKE_NIHSS_CARD_ID,
      payloadJson: NIHSS_VALID,
      payloadSummary: [{ key: "Score NIHSS total", value: "5" }],
    };
    const en = selectClinicalDocumentationPayloadSummary(legacyFrenchOnly, "en");
    expect(en.some((l) => l.key === "NIHSS total score")).toBe(true);
    expect(en.some((l) => l.key === "Score NIHSS total")).toBe(false);
    expect(en.some((l) => l.value.includes("Pas de dérive"))).toBe(false);

    const fr = selectClinicalDocumentationPayloadSummary(legacyFrenchOnly, "fr");
    expect(fr.some((l) => l.key === "Score NIHSS total")).toBe(true);
  });

  it("English export with legacy French-only summary and no payloadJson returns empty", () => {
    expect(
      selectClinicalDocumentationPayloadSummary(
        { payloadSummary: [{ key: "Score NIHSS total", value: "5" }] },
        "en"
      )
    ).toEqual([]);
  });

  it("summarizeClinicalDocumentationPayload requires explicit locale (no implicit French)", () => {
    const en = summarizeClinicalDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID, "en");
    const fr = summarizeClinicalDocumentationPayload(STROKE_NIHSS_CARD_ID, NIHSS_VALID, "fr");
    expect(en[0]?.key).toBe("NIHSS total score");
    expect(fr[0]?.key).toBe("Score NIHSS total");
  });
});
