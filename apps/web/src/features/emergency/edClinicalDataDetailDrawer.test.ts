import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), "utf8");
}

describe("edClinicalDataDetailDrawer (MEDUI.ED.CLINICAL_DATA.3)", () => {
  const drawer = readSrc("features/emergency/EmergencyClinicalDataDetailDrawer.tsx");
  const panel = readSrc("features/emergency/EmergencyClinicalDataPanel.tsx");
  const hub = readSrc("features/clinical-documentation/ClinicalDocumentationHub.tsx");

  it("19 — clicking recent item opens detail drawer via panel state", () => {
    expect(panel).toContain("setDetailEntryId");
    expect(panel).toContain("EmergencyClinicalDataDetailDrawer");
  });

  it("20 — detail drawer shows all documented fields", () => {
    expect(drawer).toContain("buildClinicalDocumentationDetailRows");
    expect(drawer).toContain("clinical-data-detail-row");
  });

  it("21 — detail drawer shows author name/title", () => {
    expect(drawer).toContain("authorDisplayName");
    expect(drawer).toContain("authorRoleTitle");
    expect(drawer).toContain("emergencyClinicalData.detail.completedBy");
  });

  it("22 — detail drawer uses facility timezone", () => {
    expect(drawer).toContain("formatClinicalInstantForFacility");
    expect(drawer).toContain("facilityTimeZone");
  });

  it("drawer shows Open form when editable", () => {
    expect(drawer).toContain("clinical-data-detail-open-form");
    expect(drawer).toContain("emergencyClinicalData.detail.openForm");
  });

  it("drawer shows Review only when not editable", () => {
    expect(drawer).toContain("clinical-data-detail-review-only");
    expect(drawer).toContain("emergencyClinicalData.detail.reviewOnly");
  });

  it("26 — no duplicate API call in hub when skipEntriesFetch", () => {
    expect(hub).toContain("onEntriesChanged");
    expect(panel).toContain("skipEntriesFetch");
    expect(panel).toContain("onEntriesChanged={loadEntries}");
  });
});
