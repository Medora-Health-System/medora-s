import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  D4C8B_CERTIFICATION_ID,
  isForbiddenClosedRecordAggregatePath,
  isEnterpriseEncounterClosed,
  shouldShowEnterpriseReopenAction,
} from "@medora/shared";

describe("MEDUI.D4C.8B enterprise closed clinical record composition", () => {
  it("exports certification id and forbids chart-summary aggregate", () => {
    expect(D4C8B_CERTIFICATION_ID).toBe("MEDUI.D4C.8B");
    expect(isForbiddenClosedRecordAggregatePath("/patients/p1/chart-summary")).toBe(true);
  });

  it("wires clinical record into the enterprise CLOSED_READ_ONLY shell", () => {
    const viewer = readFileSync(
      resolve(__dirname, "./EnterpriseClosedEncounterViewer.tsx"),
      "utf8"
    );
    expect(viewer).toContain("EnterpriseClosedEncounterClinicalRecord");
    expect(viewer).toContain("CLOSED_READ_ONLY");
    expect(viewer).toContain("EnterpriseReopenEncounterAction");
    expect(viewer).not.toContain("JSON.stringify");
  });

  it("clinical record uses encounter-scoped endpoints only", () => {
    const record = readFileSync(
      resolve(__dirname, "./EnterpriseClosedEncounterClinicalRecord.tsx"),
      "utf8"
    );
    expect(record).toContain("/vitals-history");
    expect(record).toContain("/orders");
    expect(record).toContain("/medication-administrations");
    expect(record).toContain("parseEncounterDiagnosisApiItems");
    expect(record).not.toMatch(/\/chart-summary\b/);
    expect(isForbiddenClosedRecordAggregatePath("/patients/x/chart-summary")).toBe(true);
    expect(record).toContain("ClinicalResultViewer");
    expect(record).toContain("parsePhysicianEvalV1ForChart");
    expect(record).toContain("parseNursingAssessmentSectionsForChart");
    expect(record).toContain("parseDischargeSummaryForChart");
    expect(record).toContain("formatOxygenSupportCompact");
    expect(record).toContain("formatBp");
    expect(record).toContain("formatTemperatureDualLine");
    expect(record).toContain('data-read-only="true"');
    expect(record).not.toContain("JSON.stringify");
    expect(record).not.toMatch(/\b(onSave|handleSave|onEdit|placeOrder|administer)\b/);
  });

  it("ED archive remains a thin adapter over the enterprise shell", () => {
    const ed = readFileSync(
      resolve(__dirname, "../../features/emergency/EmergencyClosedChartArchiveView.tsx"),
      "utf8"
    );
    expect(ed).toContain("EnterpriseClosedEncounterViewer");
    expect(ed).toContain('data-testid="ed-closed-chart-archive"');
    expect(ed).not.toContain("EmergencyErSummaryClosureSurface");
  });

  it("preserves D4C.8A reopen and closed predicates", () => {
    expect(isEnterpriseEncounterClosed("CLOSED")).toBe(true);
    expect(isEnterpriseEncounterClosed("OPEN")).toBe(false);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["ADMIN"] })).toBe(true);
    expect(shouldShowEnterpriseReopenAction({ status: "CLOSED", roleCodes: ["PROVIDER"] })).toBe(
      false
    );
  });

  it("French and English clinical-record keys exist", () => {
    const fr = readFileSync(resolve(__dirname, "../../i18n/messages/fr.ts"), "utf8");
    const en = readFileSync(resolve(__dirname, "../../i18n/messages/en.ts"), "utf8");
    for (const src of [fr, en]) {
      expect(src).toContain("enterpriseClosedClinicalRecordD4c8b:");
      expect(src).toContain("sections:");
      expect(src).toContain("vitals:");
    }
    expect(fr).toContain("Signes vitaux");
    expect(en).toContain("Provider documentation");
  });
});
