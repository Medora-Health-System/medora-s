import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation behavioral health (EDOC.16)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationBehavioralHealthForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.16 behavioral form", () => {
    expect(hub).toContain("isEdoc16BehavioralHealthDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationBehavioralHealthForm");
  });

  it("form exposes suicide, elopement, 1:1, escalation with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-behavioral-form");
    expect(form).toContain("behavioral-suicide-precautions-time");
    expect(form).toContain("behavioral-elopement-monitoring-time");
    expect(form).toContain("behavioral-one-to-one-time");
    expect(form).toContain("behavioral-escalation-time");
    expect(form).toContain("PRECAUTION_LEVEL_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateBehavioralHealthSafetyDocumentationPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("bilingual behavioral form keys mirrored", () => {
    expect(en).toContain("behavioralHealth:");
    expect(fr).toContain("behavioralHealth:");
    expect(en).toContain("currentSuicidalIdeation:");
    expect(fr).toContain("currentSuicidalIdeation:");
    expect(en).toContain("restraintDocumentationReferenced:");
    expect(fr).toContain("restraintDocumentationReferenced:");
  });
});
