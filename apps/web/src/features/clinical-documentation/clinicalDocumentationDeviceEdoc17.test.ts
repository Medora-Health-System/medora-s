import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation device monitoring (EDOC.17)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationDeviceMonitoringForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.17 device form", () => {
    expect(hub).toContain("isEdoc17DeviceMonitoringDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationDeviceMonitoringForm");
  });

  it("form exposes IV, Foley, chest tube, ETT with dropdowns and compact layout", () => {
    expect(form).toContain("clinical-documentation-device-form");
    expect(form).toContain("device-peripheral-iv-time");
    expect(form).toContain("device-foley-time");
    expect(form).toContain("device-chest-tube-time");
    expect(form).toContain("device-ett-position");
    expect(form).toContain("IV_STATUS_OPTIONS");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain("validateDeviceLineTubeDrainMonitoringPayloadForCard");
    expect(form).toContain('gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))"');
    expect(form).toContain('data-compact-layout="true"');
  });

  it("bilingual device form keys mirrored", () => {
    expect(en).toContain("deviceMonitoring:");
    expect(fr).toContain("deviceMonitoring:");
    expect(en).toContain("infectionConcern:");
    expect(fr).toContain("infectionConcern:");
    expect(en).toContain("airLeakPresent:");
    expect(fr).toContain("airLeakPresent:");
  });
});
