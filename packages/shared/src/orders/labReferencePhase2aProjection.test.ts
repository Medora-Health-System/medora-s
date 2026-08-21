/**
 * MEDUI.LAB.REF.2A — one-engine projection: ClinicalResultViewer reads stored
 * observation fields only (no care-setting re-resolution of intervals).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const webSrc = join(__dirname, "../../../../apps/web/src");

function read(rel: string): string {
  return readFileSync(join(webSrc, rel), "utf8");
}

describe("MEDUI.LAB.REF.2A one-engine ClinicalResultViewer projection", () => {
  it("ClinicalResultViewer does not import/call lab reference resolver", () => {
    const viewer = read("components/clinical/ClinicalResultViewer.tsx");
    expect(viewer).not.toMatch(/resolveLabReferenceInterval/);
    expect(viewer).not.toMatch(/lab-reference/);
    expect(viewer).not.toMatch(/LabReferenceIntervalService/);
    // Displays stored reference text / numeric range from observation payload
    expect(viewer).toMatch(/referenceText|referenceLow|referenceHigh/);
  });

  it("Lab / ED / IP / chart surfaces reuse ClinicalResultViewer (not parallel range engines)", () => {
    const surfaces: Array<{ path: string; available: boolean }> = [
      { path: "components/worklists/DepartmentOrderDetail.tsx", available: true },
      { path: "components/encounters/EncounterResultsTab.tsx", available: true },
      { path: "components/patient-chart/PatientChartClinicalTabs.tsx", available: true },
      { path: "components/encounters/EnterpriseClosedEncounterClinicalRecord.tsx", available: true },
    ];
    for (const s of surfaces) {
      const src = read(s.path);
      expect(src).toContain("ClinicalResultViewer");
    }
  });
});
