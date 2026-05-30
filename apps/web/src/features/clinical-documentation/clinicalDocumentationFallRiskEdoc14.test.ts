import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation fall risk (EDOC.14 fall risk)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationFallRiskForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.14 fall risk form", () => {
    expect(hub).toContain("isEdoc14FallRiskSafetyDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationFallRiskForm");
  });

  it("form exposes Morse, mobility, fall event, post-fall with compact layout", () => {
    expect(form).toContain("clinical-documentation-fall-risk-form");
    expect(form).toContain("fall-morse-time");
    expect(form).toContain("fall-morse-score");
    expect(form).toContain("fall-morse-risk-level");
    expect(form).toContain("fall-mobility-time");
    expect(form).toContain("fall-event-time");
    expect(form).toContain("fall-post-time");
    expect(form).toContain("calculateMorseFallScore");
    expect(form).toContain("deriveMorseRiskLevel");
    expect(form).toContain("validateFallRiskSafetyDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("bilingual fall risk form keys mirrored", () => {
    expect(en).toContain("fallRisk:");
    expect(fr).toContain("fallRisk:");
    expect(en).toContain("calculatedScore:");
    expect(fr).toContain("calculatedScore:");
    expect(en).toContain("witnessNotice:");
    expect(fr).toContain("witnessNotice:");
  });
});
