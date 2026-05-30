import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation cardiac monitoring (EDOC.15)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationCardiacMonitoringForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.15 cardiac form", () => {
    expect(hub).toContain("isEdoc15CardiacMonitoringDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationCardiacMonitoringForm");
  });

  it("form exposes continuous, ECG, arrhythmia, QTc with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-cardiac-form");
    expect(form).toContain("cardiac-continuous-time");
    expect(form).toContain("cardiac-continuous-rhythm");
    expect(form).toContain("cardiac-ecg-time");
    expect(form).toContain("cardiac-arrhythmia-time");
    expect(form).toContain("cardiac-qtc-value");
    expect(form).toContain("CARDIAC_RHYTHM_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateCardiacMonitoringDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("bilingual cardiac form keys mirrored", () => {
    expect(en).toContain("cardiacMonitoring:");
    expect(fr).toContain("cardiacMonitoring:");
    expect(en).toContain("criticalFindingPresent:");
    expect(fr).toContain("criticalFindingPresent:");
    expect(en).toContain("qtcValue:");
    expect(fr).toContain("qtcValue:");
  });
});
