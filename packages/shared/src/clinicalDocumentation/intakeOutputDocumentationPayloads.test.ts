import { describe, expect, it } from "vitest";
import {
  getClinicalDocumentationCardById,
} from "./clinicalDocumentationRegistry.js";
import { listFoundationOnlyCardIds } from "./clinicalDocumentationPayloadGovernance.js";
import {
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
  IO_DRAIN_OUTPUT_CARD_ID,
  IO_EMESIS_OUTPUT_CARD_ID,
  IO_FLUID_INTAKE_CARD_ID,
  IO_INTAKE_OUTPUT_SUMMARY_CARD_ID,
  IO_IV_INTAKE_CARD_ID,
  IO_NG_OUTPUT_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_STOOL_OUTPUT_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
  OZ_TO_ML,
  bloodProductIntakePayloadSchema,
  calculateIntakeOutputTotals,
  convertAmountToMl,
  drainOutputPayloadSchema,
  emesisOutputPayloadSchema,
  fluidIntakePayloadSchema,
  intakeOutputSummaryPayloadSchema,
  ivIntakePayloadSchema,
  ngOutputPayloadSchema,
  poIntakePayloadSchema,
  stoolOutputPayloadSchema,
  summarizeIntakeOutputDocumentationPayload,
  urineOutputPayloadSchema,
  validateIntakeOutputPayloadForCard,
} from "./intakeOutputDocumentationPayloads.js";
import {
  CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS,
  validatePayloadForCard,
} from "./observationDocumentationPayloads.js";

const NOW = "2026-05-28T10:00:00.000Z";
const LATER = "2026-05-28T18:00:00.000Z";

describe("EDOC.5 intake & output documentation", () => {
  it("I&O cards marked AVAILABLE", () => {
    for (const cardId of EDOC5_INTAKE_OUTPUT_CARD_IDS) {
      const card = getClinicalDocumentationCardById(cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
      expect(card?.status).toBe("ACTIVE");
    }
  });

  it("fluid intake schema accepts valid payload", () => {
    const parsed = fluidIntakePayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 500,
      unit: "ML",
      route: "IV",
      fluidType: "Normal saline",
    });
    expect(parsed.success).toBe(true);
  });

  it("PO intake schema accepts valid payload", () => {
    const parsed = poIntakePayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 240,
      unit: "ML",
      substance: "water",
      tolerated: "YES",
      nausea: false,
      vomiting: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("IV intake schema accepts valid payload", () => {
    const parsed = ivIntakePayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 1000,
      unit: "ML",
      fluidType: "LR",
      infusionRelated: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("blood product intake schema accepts valid payload", () => {
    const parsed = bloodProductIntakePayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 350,
      unit: "ML",
      productType: "PRBC",
      transfusionRecordLinked: false,
      reactionSuspected: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("urine output schema accepts valid payload", () => {
    const parsed = urineOutputPayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 400,
      unit: "ML",
      method: "FOLEY",
    });
    expect(parsed.success).toBe(true);
  });

  it("stool output schema accepts valid payload", () => {
    const parsed = stoolOutputPayloadSchema.safeParse({
      recordedAt: NOW,
      occurrenceCount: 1,
      consistency: "FORMED",
    });
    expect(parsed.success).toBe(true);
  });

  it("emesis output schema accepts valid payload", () => {
    const parsed = emesisOutputPayloadSchema.safeParse({
      recordedAt: NOW,
      occurrenceCount: 2,
      appearance: "BILIOUS",
      amount: 100,
      unit: "ML",
    });
    expect(parsed.success).toBe(true);
  });

  it("NG output schema accepts valid payload", () => {
    const parsed = ngOutputPayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 75,
      unit: "ML",
      appearance: "BILIOUS",
      suctionType: "LOW_INTERMITTENT",
    });
    expect(parsed.success).toBe(true);
  });

  it("drain output schema accepts valid payload", () => {
    const parsed = drainOutputPayloadSchema.safeParse({
      recordedAt: NOW,
      amount: 50,
      unit: "ML",
      drainType: "JP",
      appearance: "SEROSANGUINOUS",
    });
    expect(parsed.success).toBe(true);
  });

  it("invalid negative amount rejected", () => {
    expect(
      fluidIntakePayloadSchema.safeParse({
        recordedAt: NOW,
        amount: -5,
        unit: "ML",
        route: "IV",
        fluidType: "NS",
      }).success
    ).toBe(false);
    expect(
      validateIntakeOutputPayloadForCard(IO_FLUID_INTAKE_CARD_ID, {
        recordedAt: NOW,
        amount: -1,
        unit: "ML",
        route: "IV",
        fluidType: "NS",
      }).ok
    ).toBe(false);
  });

  it("L converts to mL", () => {
    expect(convertAmountToMl(2, "L")).toBe(2000);
  });

  it("OZ converts to mL", () => {
    expect(convertAmountToMl(1, "OZ")).toBeCloseTo(OZ_TO_ML, 4);
  });

  it("I&O totals calculate correctly", () => {
    const totals = calculateIntakeOutputTotals([
      {
        cardId: IO_PO_INTAKE_CARD_ID,
        payload: { amount: 500, unit: "ML" },
      },
      {
        cardId: IO_IV_INTAKE_CARD_ID,
        payload: { amount: 1, unit: "L" },
      },
      {
        cardId: IO_URINE_OUTPUT_CARD_ID,
        payload: { amount: 400, unit: "ML" },
      },
      {
        cardId: IO_STOOL_OUTPUT_CARD_ID,
        payload: { occurrenceCount: 1, consistency: "FORMED" },
      },
      {
        cardId: IO_EMESIS_OUTPUT_CARD_ID,
        payload: { occurrenceCount: 1, appearance: "BILIOUS", amount: 100, unit: "ML" },
      },
      {
        cardId: IO_INTAKE_OUTPUT_SUMMARY_CARD_ID,
        payload: {
          totalIntakeMl: 9999,
          totalOutputMl: 9999,
          netBalanceMl: 0,
        },
      },
    ]);
    expect(totals.totalIntakeMl).toBe(1500);
    expect(totals.totalOutputMl).toBe(500);
    expect(totals.netBalanceMl).toBe(1000);
  });

  it("summary net balance validates", () => {
    expect(
      intakeOutputSummaryPayloadSchema.safeParse({
        summaryStartTime: NOW,
        summaryEndTime: LATER,
        totalIntakeMl: 1200,
        totalOutputMl: 800,
        netBalanceMl: 400,
        includesEstimatedValues: false,
        reviewedByNurse: true,
        providerNotified: false,
      }).success
    ).toBe(true);

    expect(
      intakeOutputSummaryPayloadSchema.safeParse({
        summaryStartTime: NOW,
        summaryEndTime: LATER,
        totalIntakeMl: 1200,
        totalOutputMl: 800,
        netBalanceMl: 999,
        includesEstimatedValues: false,
        reviewedByNurse: true,
        providerNotified: false,
      }).success
    ).toBe(false);

    expect(
      intakeOutputSummaryPayloadSchema.safeParse({
        summaryStartTime: NOW,
        summaryEndTime: LATER,
        totalIntakeMl: 1200,
        totalOutputMl: 800,
        netBalanceMl: 500,
        includesEstimatedValues: true,
        reviewedByNurse: true,
        providerNotified: false,
      }).success
    ).toBe(true);
  });

  it("available I&O cards have validators", () => {
    for (const cardId of EDOC5_INTAKE_OUTPUT_CARD_IDS) {
      expect(CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS).toContain(cardId);
    }
  });

  it("foundation-only cards cannot save", () => {
    const foundation = listFoundationOnlyCardIds();
    expect(foundation.length).toBeGreaterThan(0);
    for (const cardId of foundation.slice(0, 3)) {
      expect(validatePayloadForCard(cardId, { recordedAt: NOW, amount: 1, unit: "ML" }).ok).toBe(
        false
      );
    }
  });

  it("payload summaries render key facts", () => {
    const fluid = summarizeIntakeOutputDocumentationPayload(IO_FLUID_INTAKE_CARD_ID, {
      recordedAt: NOW,
      amount: 500,
      unit: "ML",
      route: "IV",
      fluidType: "Normal saline",
    });
    expect(fluid.some((l) => l.key === "Apport" && l.value.includes("500 mL"))).toBe(true);

    const summary = summarizeIntakeOutputDocumentationPayload(IO_INTAKE_OUTPUT_SUMMARY_CARD_ID, {
      summaryStartTime: NOW,
      summaryEndTime: LATER,
      totalIntakeMl: 1200,
      totalOutputMl: 800,
      netBalanceMl: 400,
      includesEstimatedValues: false,
      reviewedByNurse: true,
      providerNotified: false,
    });
    expect(summary).toEqual(
      expect.arrayContaining([
        { key: "Apports", value: "1200 mL" },
        { key: "Sorties", value: "800 mL" },
        { key: "Bilan", value: "+400 mL" },
      ])
    );

    const blood = summarizeIntakeOutputDocumentationPayload(IO_BLOOD_PRODUCT_INTAKE_CARD_ID, {
      recordedAt: NOW,
      amount: 350,
      unit: "ML",
      productType: "PRBC",
      transfusionRecordLinked: true,
      reactionSuspected: false,
    });
    expect(blood.some((l) => l.key === "Lien transfusion" && l.value === "Oui")).toBe(true);
  });
});
