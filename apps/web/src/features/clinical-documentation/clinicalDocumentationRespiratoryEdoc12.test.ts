import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation respiratory (EDOC.12)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationRespiratoryForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.12 respiratory form", () => {
    expect(hub).toContain("isEdoc12RespiratoryDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationRespiratoryForm");
  });

  it("form exposes all respiratory cards with compact tablet layout", () => {
    expect(form).toContain("clinical-documentation-respiratory-form");
    expect(form).toContain("resp-assessment-time");
    expect(form).toContain("resp-oxygen-init-time");
    expect(form).toContain("resp-oxygen-titration-time");
    expect(form).toContain("resp-nebulizer-time");
    expect(form).toContain("resp-cpap-time");
    expect(form).toContain("resp-distress-time");
    expect(form).toContain("resp-ventilator-time");
    expect(form).toContain("resp-peak-flow-time");
    expect(form).toContain("validateRespiratoryDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("bilingual respiratory form keys mirrored", () => {
    expect(en).toContain("respiratory:");
    expect(fr).toContain("respiratory:");
    expect(en).toContain("workOfBreathing:");
    expect(fr).toContain("workOfBreathing:");
    expect(en).toContain("rtNotified:");
    expect(fr).toContain("rtNotified:");
  });
});
