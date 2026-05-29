import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation procedural sedation (EDOC.10)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationProceduralSedationForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.10 sedation form and immediate witness policy", () => {
    expect(hub).toContain("isEdoc10ProceduralSedationFormCard");
    expect(hub).toContain("ClinicalDocumentationProceduralSedationForm");
    expect(hub).toContain("requiresImmediateWitnessCaptureForPayload");
  });

  it("form exposes sedation cards, witness notice, score dropdowns, compact layout", () => {
    expect(form).toContain("clinical-documentation-sedation-form");
    expect(form).toContain("sedation-timeout-witness-notice");
    expect(form).toContain("ClinicalDocumentationScoreSelectField");
    expect(form).toContain("sedation-recovery-total");
    expect(form).toContain("validateProceduralSedationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))"');
    expect(form).toContain("SEDATION_MONITORING_CARD_ID");
    expect(form).toContain("SEDATION_DISCHARGE_READINESS_CARD_ID");
  });

  it("bilingual sedation form keys mirrored", () => {
    expect(en).toContain("timeoutWitnessNotice:");
    expect(fr).toContain("timeoutWitnessNotice:");
    expect(en).toContain("recoveryCriteriaMet:");
    expect(fr).toContain("recoveryCriteriaMet:");
    expect(en).toContain("medicationAdministrationDocumentedInMar:");
    expect(fr).toContain("medicationAdministrationDocumentedInMar:");
  });

  it("cancel immediate witness does not save (EDOC.10 UI path)", () => {
    expect(hub).toContain("cancelImmediateWitnessDraft");
    expect(hub).toContain("witnessModal.cancelWithoutSave");
    expect(hub).toContain("setImmediateWitnessDraft(null)");
  });
});
