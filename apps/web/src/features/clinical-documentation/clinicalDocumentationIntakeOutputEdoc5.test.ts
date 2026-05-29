import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDOC5_INTAKE_OUTPUT_CARD_IDS,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation intake & output (EDOC.5)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const ioForm = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationIntakeOutputForm.tsx"),
    "utf8"
  );

  it("Intake & Output category renders in hub", () => {
    expect(hub).toContain("isEdoc5IntakeOutputFormCard");
    expect(hub).toContain("ClinicalDocumentationIntakeOutputForm");
    expect(hub).toContain("INTAKE_OUTPUT");
    expect(hub).toContain("clinical-documentation-io-mini-totals");
  });

  it("I&O forms open for all EDOC.5 cards", () => {
    expect(ioForm).toContain("IO_INTAKE_OUTPUT_SUMMARY_CARD_ID");
    expect(ioForm).toContain("IO_FLUID_INTAKE_CARD_ID");
    expect(ioForm).toContain("IO_PO_INTAKE_CARD_ID");
    expect(ioForm).toContain("IO_IV_INTAKE_CARD_ID");
    expect(ioForm).toContain("IO_BLOOD_PRODUCT_INTAKE_CARD_ID");
    expect(ioForm).toContain("IO_URINE_OUTPUT_CARD_ID");
    expect(ioForm).toContain("IO_STOOL_OUTPUT_CARD_ID");
    expect(ioForm).toContain("IO_EMESIS_OUTPUT_CARD_ID");
    expect(ioForm).toContain("IO_NG_OUTPUT_CARD_ID");
    expect(ioForm).toContain("IO_DRAIN_OUTPUT_CARD_ID");
    expect(ioForm).toContain("gridTemplateColumns");
    expect(ioForm).toContain("validateIntakeOutputPayloadForCard");
  });

  it("PO intake form saves", () => {
    expect(ioForm).toContain("clinical-documentation-po-intake-form");
    expect(ioForm).toContain("IO_PO_INTAKE_CARD_ID");
    expect(ioForm).toContain("clinical-documentation-intake-output-save");
  });

  it("Urine output form saves", () => {
    expect(ioForm).toContain("clinical-documentation-urine-output-form");
    expect(ioForm).toContain("IO_URINE_OUTPUT_CARD_ID");
  });

  it("Blood product intake form shows I&O-only warning", () => {
    expect(ioForm).toContain("clinical-documentation-blood-product-intake-form");
    expect(ioForm).toContain("clinical-documentation-blood-product-io-warning");
    expect(ioForm).toContain("IO_BLOOD_PRODUCT_INTAKE_CARD_ID");
    expect(ioForm).toContain("bloodProductIoOnlyWarning");
  });

  it("validation errors visible", () => {
    expect(ioForm).toContain("clinical-documentation-intake-output-validation-error");
  });

  it("hub refreshes entries and uses shared save path", () => {
    expect(hub).toContain("loadEntries");
    expect(hub).toContain("saveObservationEntry");
    expect(hub).toContain("setExpandedCardId(null)");
    expect(hub).toContain("calculateIntakeOutputTotals");
  });

  it("witness pending badge path unchanged in hub", () => {
    expect(hub).toContain("badgePendingWitness");
    expect(hub).toContain("clinicalDocumentationPendingWitness");
  });
});

describe("EDOC.5 regression guards", () => {
  it("observation and stroke forms still wired", () => {
    const hub = readFileSync(
      join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
      "utf8"
    );
    expect(hub).toContain("ClinicalDocumentationObservationForm");
    expect(hub).toContain("ClinicalDocumentationStrokeForm");
  });
});
