import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation pain (EDOC.13)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationPainForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.13 pain form", () => {
    expect(hub).toContain("isEdoc13PainDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationPainForm");
  });

  it("form exposes initial, FLACC, non-verbal, escalation with compact layout", () => {
    expect(form).toContain("clinical-documentation-pain-form");
    expect(form).toContain("pain-initial-time");
    expect(form).toContain("pain-reassessment-time");
    expect(form).toContain("pain-flacc-time");
    expect(form).toContain("pain-nonverbal-time");
    expect(form).toContain("pain-escalation-time");
    expect(form).toContain("ClinicalDocumentationScoreSelectField");
    expect(form).toContain("pain-flacc-total");
    expect(form).toContain("pain-nonverbal-total");
    expect(form).toContain("validatePainDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
  });

  it("bilingual pain form keys mirrored", () => {
    expect(en).toContain("pain:");
    expect(fr).toContain("pain:");
    expect(en).toContain("flaccTotal:");
    expect(fr).toContain("flaccTotal:");
    expect(en).toContain("escalationReason:");
    expect(fr).toContain("escalationReason:");
  });
});
