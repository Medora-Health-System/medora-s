import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataNoReadOnlyCopy (MEDUI.ED.CLINICAL_DATA.4)", () => {
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("11 — read-only banner not rendered in Clinical Data panel", () => {
    expect(panel).not.toContain("emergencyClinicalData.readOnlyBanner");
    expect(panel).not.toContain("readOnlyBanner");
  });

  it("12 — Editing remains under Nursing Assessment not shown in Clinical Data", () => {
    expect(panel).not.toContain("reviewPreviewEmpty");
    expect(hub).toContain('workspaceContext === "clinicalData"');
    expect(hub).toContain("clinicalDocumentation.savedEntriesEmpty");
    const clinicalDataBranch = hub.slice(
      hub.indexOf('workspaceContext === "clinicalData"'),
      hub.indexOf('workspaceContext === "clinicalData"') + 400
    );
    expect(clinicalDataBranch).not.toContain("reviewPreviewEmpty");
  });

  it("13 — Read-only provider review not rendered in Clinical Data path", () => {
    expect(panel).not.toContain("Read-only provider review");
    expect(panel).not.toContain("Editing remains under Nursing Assessment");
  });

  it("long subtitle not used in Clinical Data panel", () => {
    expect(panel).not.toContain("emergencyClinicalData.subtitle");
    expect(panel).not.toContain("Review structured ED documentation");
  });

  it("Clinical Data title only in panel header", () => {
    expect(panel).toContain('t("emergencyClinicalData.title")');
    expect(panel).not.toContain("emergencyClinicalData.summaryTitle");
  });
});
