import { describe, expect, it } from "vitest";
import {
  buildThrombolyticCoverageAuditReport,
} from "./thrombolyticCoverageAudit.js";

describe("ThrombolyticCoverageAuditReport", () => {
  it("audits thrombolytic coverage", () => {
    const report = buildThrombolyticCoverageAuditReport();
    expect(report.totalExpected).toBe(7);
  });

  it("audits alteplase", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.find((r) => r.medication.includes("Alteplase"))?.present).toBe(true);
  });

  it("audits tenecteplase", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.find((r) => r.medication.includes("Tenecteplase"))?.present).toBe(true);
  });

  it("audits reteplase", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.some((r) => r.medication === "Reteplase")).toBe(true);
  });

  it("audits streptokinase", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.some((r) => r.medication === "Streptokinase")).toBe(true);
  });

  it("audits stroke pathways", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.find((r) => r.groupId === "STROKE_PATHWAYS")?.pathwayReady).toBe(true);
  });

  it("audits STEMI pathways", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.find((r) => r.groupId === "STEMI_PATHWAYS")?.pathwayReady).toBe(true);
  });

  it("audits PE pathways", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.find((r) => r.groupId === "PE_PATHWAYS")?.pathwayReady).toBe(true);
  });

  it("keeps present thrombolytics restricted/governed", () => {
    const present = buildThrombolyticCoverageAuditReport().rows.filter((r) => r.present);
    expect(present.every((r) => r.restricted || !r.orderable)).toBe(true);
  });

  it("reports MAR readiness for thrombolytics where present", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.filter((r) => r.present).some((r) => r.marReady)).toBe(true);
  });

  it("reports billing readiness for thrombolytics where present", () => {
    expect(buildThrombolyticCoverageAuditReport().rows.filter((r) => r.present).some((r) => r.billingReady)).toBe(true);
  });

  it("reports missing rows as audit gaps only", () => {
    const report = buildThrombolyticCoverageAuditReport();
    expect(report.presentCount + report.missingCount).toBe(report.totalExpected);
  });
});
