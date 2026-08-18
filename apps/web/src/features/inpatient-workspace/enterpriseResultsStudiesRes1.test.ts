/**
 * MEDUI.RES.1 — Enterprise Results & Studies convergence (web gates).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";
import {
  parseLabObservationLines,
  parseRadiologySections,
} from "@/lib/clinicalResultNormalize";

const webSrc = join(__dirname, "../..");
const read = (rel: string) => readFileSync(join(webSrc, rel), "utf8");

function deepKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return prefix ? [prefix] : [];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) return deepKeys(v, path);
    return [path];
  });
}

describe("MEDUI.RES.1 enterprise results projection", () => {
  it("renders smashed CMP as a structured analyte table with reference range and units", () => {
    const smashed =
      "Glucose9270–100mg/dL—BUN146–20mg/dL—Creatinine0.90.6–1.2mg/dL—Sodium140135–145mEq/L";
    const { rows } = parseLabObservationLines(smashed);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({ label: "Glucose", value: "92", ref: "70–100", units: "mg/dL" });
    expect(rows.every((r) => !r.flag)).toBe(true);
  });

  it("flags LOW and HIGH from reference ranges without concatenating columns", () => {
    const low = parseLabObservationLines("Potassium: 2.9 mmol/L (3.5–5.0 mmol/L)").rows[0];
    const high = parseLabObservationLines("Potassium: 5.8 mmol/L (3.5–5.0 mmol/L)").rows[0];
    const normal = parseLabObservationLines("Potassium: 4.2 mmol/L (3.5–5.0 mmol/L)").rows[0];
    expect(low).toMatchObject({ value: "2.9", flag: "L", units: "mmol/L", ref: "3.5–5.0 mmol/L" });
    expect(high).toMatchObject({ value: "5.8", flag: "H", units: "mmol/L" });
    expect(normal?.flag).toBeFalsy();
  });

  it("keeps narrative laboratory text when no analyte table can be recovered", () => {
    const narrative = "Culture pending. No growth at 24 hours.";
    const parsed = parseLabObservationLines(narrative);
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.preamble).toContain("Culture pending");
  });

  it("recovers jammed radiology headings into Findings and Impression sections", () => {
    const jammed =
      "18 Aug 2026Exam Type: CT AbdomenContrastComparison: noneFindingsLower Chest is clear.ImpressionNo acute process.";
    const { sections } = parseRadiologySections(jammed, "en");
    const byHeading = Object.fromEntries(sections.map((s) => [s.heading, s.body]));
    expect(byHeading.Findings || byHeading.Study).toBeTruthy();
    expect(JSON.stringify(sections)).toMatch(/Lower Chest is clear/);
    expect(JSON.stringify(sections)).toMatch(/No acute process/);
    expect(byHeading.Impression).toContain("No acute process");
  });

  it("projects ED and inpatient results from the same EmergencyResultsPanel + EncounterResultsTab", () => {
    const panel = read("features/emergency/EmergencyResultsPanel.tsx");
    const inpatient = read("features/inpatient-workspace/InpatientWorkspacePanel.tsx");
    const tab = read("components/encounters/EncounterResultsTab.tsx");
    expect(inpatient).toContain("EmergencyResultsPanel");
    expect(panel).toContain("EncounterResultsTab");
    expect(panel).not.toContain("CompactResultRow");
    expect(panel).toContain('data-testid="enterprise-results-detail-list"');
    expect(tab).toContain('data-testid="enterprise-result-card"');
    expect(tab).toContain("data-order-item-id");
    expect(tab).toContain("/orders/${orderItemId}/result/acknowledge");
    expect(tab).toContain("item.id");
  });

  it("authoring serializes into Result.resultText without a second lab/rad engine", () => {
    const detail = read("components/worklists/DepartmentOrderDetail.tsx");
    expect(detail).toContain("LabResultStructuredEntry");
    expect(detail).toContain("ImagingReportStructuredEntry");
    expect(detail).toContain("normalizeLabResultTextForPersist");
    expect(detail).toContain("recoverJammedRadiologyHeadings");
    expect(detail).toContain("`/orders/${item.id}/result`");
    expect(detail).not.toContain("prisma.");
    expect(detail).not.toContain("RadiologyReport");
  });

  it("mirrors EN/FR result flag and table keys", () => {
    expect(en.clinicalResultViewer.labTableUnits).toBeTruthy();
    expect(fr.clinicalResultViewer.labTableUnits).toBeTruthy();
    expect(en.clinicalResultViewer.labFlagHigh).toBe("HIGH");
    expect(fr.clinicalResultViewer.labFlagHigh).toBe("ÉLEVÉ");
    expect(en.clinicalResultViewer.labFlagLow).toBe("LOW");
    expect(fr.clinicalResultViewer.labFlagLow).toBe("BAS");
    expect(deepKeys(en.clinicalResultViewer).sort()).toEqual(deepKeys(fr.clinicalResultViewer).sort());
    expect(en.orderDetail.labAnalyteName).toBeTruthy();
    expect(fr.orderDetail.labAnalyteName).toBeTruthy();
  });
});
