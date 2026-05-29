import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  listClinicalDocumentationCardsByCategory,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation blood product (EDOC.7)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationBloodProductForm.tsx"),
    "utf8"
  );

  it("Blood Product category renders AVAILABLE cards", () => {
    const cards = listClinicalDocumentationCardsByCategory("BLOOD_PRODUCT_DOCUMENTATION");
    for (const cardId of EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS) {
      const card = cards.find((c) => c.id === cardId);
      expect(card?.implementationStatus).toBe("AVAILABLE");
    }
  });

  it("hub wires blood product form", () => {
    expect(hub).toContain("isEdoc7BloodProductFormCard");
    expect(hub).toContain("ClinicalDocumentationBloodProductForm");
  });

  it("verification form renders with witness notice", () => {
    expect(form).toContain("BLOOD_PRODUCT_VERIFICATION_CARD_ID");
    expect(form).toContain("clinical-documentation-blood-product-witness-notice");
    expect(form).toContain("blood-verification-unit-id");
  });

  it("initiation form renders", () => {
    expect(form).toContain("BLOOD_PRODUCT_INITIATION_CARD_ID");
    expect(form).toContain("blood-initiation-start-time");
  });

  it("reaction form renders", () => {
    expect(form).toContain("BLOOD_PRODUCT_REACTION_CARD_ID");
    expect(form).toContain("blood-reaction-type");
  });

  it("completion form renders", () => {
    expect(form).toContain("BLOOD_PRODUCT_COMPLETION_CARD_ID");
    expect(form).toContain("blood-completion-completion-time");
    expect(form).toContain("blood-completion-end-time");
  });

  it("MTP form renders", () => {
    expect(form).toContain("MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID");
    expect(form).toContain("blood-mtp-event-type");
  });

  it("tablet layout preserved (compact grid)", () => {
    expect(form).toContain("repeat(auto-fill, minmax(140px, 1fr))");
    expect(form).toContain("clinical-documentation-blood-product-form");
  });

  it("witness pending badge handled by hub (shared EDOC.4 / EDOC.7A modal)", () => {
    expect(hub).toContain("PENDING_WITNESS");
    expect(hub).toContain("witnessClinicalDocumentationEntry");
    expect(hub).toContain("ClinicalDocumentationWitnessSearchModal");
  });

  it("card guards match registry ids", () => {
    expect(form).toContain("BLOOD_PRODUCT_VERIFICATION_CARD_ID");
    expect(form).toContain("BLOOD_PRODUCT_INITIATION_CARD_ID");
    expect(form).toContain("BLOOD_PRODUCT_REACTION_CARD_ID");
    expect(form).toContain("MASSIVE_TRANSFUSION_PROTOCOL_EVENT_CARD_ID");
  });
});
