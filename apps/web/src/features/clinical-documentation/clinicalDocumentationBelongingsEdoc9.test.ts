import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation belongings valuables (EDOC.9)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationBelongingsValuablesForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.9 category form and payload-aware immediate witness", () => {
    expect(hub).toContain("isEdoc9BelongingsValuablesFormCard");
    expect(hub).toContain("ClinicalDocumentationBelongingsValuablesForm");
    expect(hub).toContain("requiresImmediateWitnessCaptureForPayload");
  });

  it("form exposes all card test ids and compact layout", () => {
    expect(form).toContain("clinical-documentation-belongings-inventory-form");
    expect(form).toContain("clinical-documentation-valuables-inventory-form");
    expect(form).toContain("clinical-documentation-belongings-transfer-security-form");
    expect(form).toContain("clinical-documentation-belongings-altered-patient-form");
    expect(form).toContain('data-compact-layout="true"');
    expect(form).toContain("requiresImmediateWitnessCaptureForPayload");
    expect(form).toContain("validateBelongingsValuablesPayloadForCard");
  });

  it("bilingual belongings form keys mirrored", () => {
    expect(en).toContain("bagIdentifier:");
    expect(fr).toContain("bagIdentifier:");
    expect(en).toContain("chainOfCustodyWitnessNotice:");
    expect(fr).toContain("chainOfCustodyWitnessNotice:");
    expect(en).toContain("sensitiveDataError:");
    expect(fr).toContain("sensitiveDataError:");
  });
});
