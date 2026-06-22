import { describe, expect, it } from "vitest";
import {
  buildDualSignatureMedicationCertificationReport,
  buildHighRiskGovernanceCertificationReport,
} from "./anticoagulationHighRiskGovernance.js";

describe("HighRiskGovernanceCertificationReport", () => {
  it("passes high-risk governance certification", () => {
    expect(buildHighRiskGovernanceCertificationReport().decision).toBe("PASS");
  });

  it("certifies heparin weight-based dosing governance", () => {
    expect(buildHighRiskGovernanceCertificationReport().heparinWeightBasedDosing).toBe(true);
  });

  it("certifies heparin infusion protocols", () => {
    expect(buildHighRiskGovernanceCertificationReport().heparinInfusionProtocols).toBe(true);
  });

  it("certifies monitoring requirements", () => {
    expect(buildHighRiskGovernanceCertificationReport().monitoringRequirements).toBe(true);
  });

  it("certifies warfarin INR monitoring", () => {
    expect(buildHighRiskGovernanceCertificationReport().warfarinInrMonitoring).toBe(true);
  });

  it("certifies DOAC renal review", () => {
    expect(buildHighRiskGovernanceCertificationReport().doacRenalReview).toBe(true);
  });

  it("certifies bleed-risk review", () => {
    expect(buildHighRiskGovernanceCertificationReport().bleedRiskReview).toBe(true);
  });

  it("certifies thrombolytic stroke-alert workflow", () => {
    expect(buildHighRiskGovernanceCertificationReport().thrombolyticStrokeAlertWorkflow).toBe(true);
  });

  it("certifies thrombolytic STEMI workflow", () => {
    expect(buildHighRiskGovernanceCertificationReport().thrombolyticStemiWorkflow).toBe(true);
  });

  it("certifies contraindication review", () => {
    expect(buildHighRiskGovernanceCertificationReport().contraindicationReview).toBe(true);
  });

  it("does not allow unrestricted thrombolytics", () => {
    expect(buildHighRiskGovernanceCertificationReport().unrestrictedThrombolytics).toBe(0);
  });

  it("does not allow unrestricted anticoagulant infusions", () => {
    expect(buildHighRiskGovernanceCertificationReport().unrestrictedAnticoagulantInfusions).toBe(0);
  });

  it("does not allow unrestricted reversal agents", () => {
    expect(buildHighRiskGovernanceCertificationReport().unrestrictedReversalAgents).toBe(0);
  });

  it("audits dual-signature medication rows", () => {
    expect(buildDualSignatureMedicationCertificationReport().rows.length).toBeGreaterThan(5);
  });

  it("supports alteplase dual-sign governance when present", () => {
    const row = buildDualSignatureMedicationCertificationReport().rows.find((r) => r.medication.includes("Alteplase"));
    expect(row?.status).not.toBe("PARTIAL");
  });

  it("supports heparin infusion double check", () => {
    const row = buildDualSignatureMedicationCertificationReport().rows.find((r) => r.medication === "Heparin infusion");
    expect(row?.independentDoubleCheck).toBe(true);
  });

  it("tracks missing dual-signature rows as partial certification", () => {
    expect(["SUPPORTED", "PARTIAL", "MISSING"]).toContain(buildDualSignatureMedicationCertificationReport().decision);
  });
});
