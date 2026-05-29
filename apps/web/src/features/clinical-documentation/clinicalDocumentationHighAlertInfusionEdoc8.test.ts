import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  listClinicalDocumentationCardsByCategory,
} from "@medora/shared";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation high-alert infusion (EDOC.8)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(
      webSrcRoot,
      "features/clinical-documentation/ClinicalDocumentationHighAlertInfusionForm.tsx"
    ),
    "utf8"
  );

  it("High Alert Infusion category renders AVAILABLE cards", () => {
    const cards = listClinicalDocumentationCardsByCategory("HIGH_ALERT_INFUSION_DOCUMENTATION");
    for (const cardId of EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS) {
      expect(cards.find((c) => c.id === cardId)?.implementationStatus).toBe("AVAILABLE");
    }
  });

  it("hub wires high-alert infusion form", () => {
    expect(hub).toContain("isEdoc8HighAlertInfusionFormCard");
    expect(hub).toContain("ClinicalDocumentationHighAlertInfusionForm");
  });

  it("verification form renders with witness notice", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID");
    expect(form).toContain("clinical-documentation-high-alert-infusion-witness-notice");
    expect(form).toContain("infusion-verification-med-name");
  });

  it("initiation form renders", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_INITIATION_CARD_ID");
    expect(form).toContain("infusion-initiation-start-time");
  });

  it("titration form renders", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_TITRATION_CARD_ID");
    expect(form).toContain("infusion-titration-med-type");
  });

  it("reassessment form renders", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_REASSESSMENT_CARD_ID");
    expect(form).toContain("infusion-reassessment-time");
  });

  it("hold form renders", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_HOLD_CARD_ID");
    expect(form).toContain("infusion-hold-reason");
  });

  it("completion form renders", () => {
    expect(form).toContain("HIGH_ALERT_INFUSION_COMPLETION_CARD_ID");
    expect(form).toContain("infusion-completion-time");
  });

  it("tablet layout preserved", () => {
    expect(form).toContain("repeat(auto-fill, minmax(140px, 1fr))");
    expect(form).toContain("clinical-documentation-high-alert-infusion-form");
  });

  it("uses EDOC.UI.1 select and boolean fields", () => {
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("ClinicalDocumentationBooleanField");
    expect(form).toContain("ClinicalDocumentationScoreSelectField");
  });

  it("witness pending handled by hub", () => {
    expect(hub).toContain("PENDING_WITNESS");
    expect(hub).toContain("witnessClinicalDocumentationEntry");
  });
});
