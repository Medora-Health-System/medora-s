import { describe, expect, it } from "vitest";
import {
  buildEmergencyMedicationActivationEligibilityReport,
  certifyEmergencyMedicationPresence,
} from "./tranche3EmergencyMedicationReadiness.js";

describe("EmergencyMedicationActivationEligibilityReport", () => {
  it("evaluates all expected ED medications", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    expect(report.totalEvaluated).toBeGreaterThan(40);
    expect(report.rows).toHaveLength(report.totalEvaluated);
  });

  it("returns decision counts that sum to total", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const sum = Object.values(report.byDecision).reduce((a, b) => a + b, 0);
    expect(sum).toBe(report.totalEvaluated);
  });

  it("does not classify all ED medications as ready", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    expect(report.byDecision.READY_FOR_ACTIVATION).toBeLessThan(report.totalEvaluated);
  });

  it("keeps thrombolytics under governance", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const thrombolytics = report.rows.filter((row) => ["Alteplase", "Tenecteplase"].includes(row.medication));
    expect(thrombolytics.every((row) => row.decision !== "READY_FOR_ACTIVATION")).toBe(true);
  });

  it("keeps anticoagulants under governance", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const anticoagulants = report.rows.filter((row) => ["Heparin", "Enoxaparin"].includes(row.medication));
    expect(anticoagulants.every((row) => row.decision !== "READY_FOR_ACTIVATION")).toBe(true);
  });

  it("keeps sedatives under governance", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const sedatives = report.rows.filter((row) => ["Propofol", "Ketamine", "Lorazepam"].includes(row.medication));
    expect(sedatives.every((row) => row.decision !== "READY_FOR_ACTIVATION")).toBe(true);
  });

  it("keeps paralytics under governance", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const paralytics = report.rows.filter((row) => ["Rocuronium", "Succinylcholine"].includes(row.medication));
    expect(paralytics.every((row) => row.decision !== "READY_FOR_ACTIVATION")).toBe(true);
  });

  it("keeps controlled substances blocked", () => {
    const report = buildEmergencyMedicationActivationEligibilityReport();
    const controlled = report.rows.filter((row) => ["Morphine", "Fentanyl"].includes(row.medication));
    expect(controlled.every((row) => row.decision === "BLOCKED")).toBe(true);
  });

  it("adds high-risk blocker labels", () => {
    const row = buildEmergencyMedicationActivationEligibilityReport().rows.find((r) => r.medication === "Alteplase");
    expect(row?.blockers.some((b) => b.includes("THROMBOLYTIC"))).toBe(true);
  });

  it("reports missing catalog rows as blocked", () => {
    const missing = buildEmergencyMedicationActivationEligibilityReport().rows.filter((row) => row.catalogCodes.length === 0);
    expect(missing.every((row) => row.decision === "BLOCKED")).toBe(true);
  });

  it("presence certification evaluates readiness", () => {
    const cert = certifyEmergencyMedicationPresence();
    expect(["READY", "PARTIAL", "MISSING"]).toContain(cert.decision);
  });

  it("presence certification counts sum to total", () => {
    const cert = certifyEmergencyMedicationPresence();
    expect(cert.readyCount + cert.partialCount + cert.missingCount).toBe(cert.totalExpected);
  });

  it("presence rows include blockers for incomplete medications", () => {
    const cert = certifyEmergencyMedicationPresence();
    expect(cert.rows.some((row) => row.blockers.length > 0)).toBe(true);
  });
});
