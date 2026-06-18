import { describe, expect, it } from "vitest";
import {
  buildExternalBillingExportCertificationSummary,
  EXTERNAL_BILLING_EXPORT_CSV_HEADERS,
  parseUtcWeekRange,
} from "./externalBillingExportCertification.js";

describe("externalBillingExportCertification (MEDUI.BILLING.EXTERNAL_EXPORT.1)", () => {
  const baseLine = {
    encounterId: "e1",
    patientId: "p1",
    mrn: "MRN-1",
    billingStatus: "official_validated",
    medoraCode: "LAB_CBC",
    performedByTitle: "MD",
    hasClinicalPayload: true,
    isUnmapped: false,
  };

  const baseEncounter = {
    encounterId: "e1",
    patientId: "p1",
    mrn: "MRN-1",
    diagnosisCount: 1,
    lineCount: 1,
  };

  it("ready when required data present", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [baseEncounter],
      lines: [baseLine],
    });
    expect(summary.status).toBe("READY");
    expect(summary.blockerCount).toBe(0);
  });

  it("candidate_only codes produce warning, not blocker", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [baseEncounter],
      lines: [{ ...baseLine, billingStatus: "candidate_only" }],
    });
    expect(summary.status).toBe("READY_WITH_WARNINGS");
    expect(summary.warnings.some((w) => w.includes("candidate-only"))).toBe(true);
    expect(summary.blockerCount).toBe(0);
  });

  it("unmapped lines produce warning, not blocker", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [baseEncounter],
      lines: [{ ...baseLine, isUnmapped: true }],
    });
    expect(summary.status).toBe("READY_WITH_WARNINGS");
    expect(summary.warnings.some((w) => w.includes("unmapped"))).toBe(true);
  });

  it("missing patient id blocks", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [{ ...baseEncounter, patientId: null, mrn: null }],
      lines: [{ ...baseLine, patientId: null, mrn: null }],
    });
    expect(summary.status).toBe("NOT_READY");
    expect(summary.blockers.some((b) => b.includes("patient"))).toBe(true);
  });

  it("missing encounter id blocks", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [{ ...baseEncounter, encounterId: "" }],
      lines: [{ ...baseLine, encounterId: "" }],
    });
    expect(summary.status).toBe("NOT_READY");
  });

  it("no line items blocks", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [baseEncounter],
      lines: [],
    });
    expect(summary.status).toBe("NOT_READY");
    expect(summary.blockers.some((b) => b.includes("line items"))).toBe(true);
  });

  it("internal billing Not Ready does not block external export", () => {
    const summary = buildExternalBillingExportCertificationSummary({
      facilityId: "f1",
      encounters: [baseEncounter],
      lines: [baseLine],
      internalBillingReady: false,
    });
    expect(summary.status).toBe("READY");
  });

  it("weekly range is exactly 7 days", () => {
    const range = parseUtcWeekRange("2026-06-02");
    expect(range.periodStart).toBe("2026-06-02");
    expect(range.periodEnd).toBe("2026-06-08");
    const ms = range.end.getTime() - range.start.getTime();
    expect(ms).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it("CSV headers are stable", () => {
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS).toContain("encounter_id");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS).toContain("clinical_payload_json");
    expect(EXTERNAL_BILLING_EXPORT_CSV_HEADERS.length).toBe(33);
  });
});
