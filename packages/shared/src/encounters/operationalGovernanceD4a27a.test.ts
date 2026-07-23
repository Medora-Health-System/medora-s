/**
 * D4A.2.7A — Operational hardening shared contract tests.
 */
import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_HARDENING_CERTIFICATION_ID,
  buildDocumentationComplianceSlice,
  buildEnterpriseOperationsPlatformManifest,
  buildMedicationComplianceSlice,
  buildOperationalKpis,
  buildPlacementReadinessStub,
  enterpriseOperationsMustNotDuplicateEdLogic,
  enterpriseOperationsMustSeparateEdFromInpatient,
  operationalGovernanceMustConsumeEnterpriseCommand,
  operationalGovernanceMustNotEnablePlacement,
  operationalGovernanceMustNotModifyMar,
  operationalGovernanceMustNotScoreClinicalQuality,
} from "../index.js";

describe("MEDUI.OPERATIONAL_HARDENING.D4A2_7A shared", () => {
  it("exposes certification and architectural invariants", () => {
    expect(OPERATIONAL_HARDENING_CERTIFICATION_ID).toBe(
      "MEDUI.OPERATIONAL_HARDENING.D4A2_7A"
    );
    expect(operationalGovernanceMustConsumeEnterpriseCommand()).toBe(true);
    expect(operationalGovernanceMustNotEnablePlacement()).toBe(true);
    expect(operationalGovernanceMustNotModifyMar()).toBe(true);
    expect(operationalGovernanceMustNotScoreClinicalQuality()).toBe(true);
    expect(enterpriseOperationsMustSeparateEdFromInpatient()).toBe(true);
    expect(enterpriseOperationsMustNotDuplicateEdLogic()).toBe(true);
  });

  it("keeps ED and Inpatient as separate platform surfaces", () => {
    const manifest = buildEnterpriseOperationsPlatformManifest();
    expect(manifest.edAndInpatientCombined).toBe(false);
    const ed = manifest.surfaces.find((s) => s.surface === "ED_OPERATIONAL_DASHBOARD");
    const ip = manifest.surfaces.find((s) => s.surface === "INPATIENT_OPERATIONAL_DASHBOARD");
    expect(ed?.domain).toBe("EMERGENCY_DEPARTMENT");
    expect(ed?.href).toBe("/app/trackboard");
    expect(ed?.redesignForbidden).toBe(true);
    expect(ip?.domain).toBe("INPATIENT");
    expect(ip?.href).toBe("/app/hospitalisation/inpatient-operations");
    expect(ed?.href).not.toBe(ip?.href);
  });

  it("builds medication and documentation compliance without owning MAR/docs", () => {
    const med = buildMedicationComplianceSlice({
      total: 10,
      administered: 7,
      refused: 1,
      heldOrUnavailable: 2,
      other: 0,
      lateCount: 2,
      missedCount: 2,
    });
    expect(med.neverModifyMar).toBe(true);
    expect(med.readOnly).toBe(true);
    expect(med.onTimePct).toBe(50);
    expect(med.latePct).toBe(20);
    const docs = buildDocumentationComplianceSlice({
      unsignedNotes: 2,
      signedNotes: 8,
      amendedNotes: 1,
      documentationCreated: 9,
    });
    expect(docs.signaturesPct).toBe(80);
    expect(docs.neverInferOutcomes).toBe(true);
  });

  it("builds KPIs and placement readiness without enabling placement", () => {
    const kpis = buildOperationalKpis({
      admissionsToday: 3,
      dischargesToday: 2,
      transfersReady: 1,
      losHours: [24, 48, 36],
      bedsAvailable: 5,
      bedsOccupied: 15,
      bedsTotal: 20,
      bedsCleaning: 0,
      observationCount: 4,
      inpatientCount: 11,
      pendingPlacementVisibility: 2,
      tasksCompleted: 5,
      tasksTotal: 10,
      medicationCompliancePct: 90,
      documentationSignaturesPct: 80,
      criticalAlerts: 1,
    });
    expect(kpis.placementLogicEnabled).toBe(false);
    expect(kpis.bedOccupancyPct).toBe(75);
    expect(kpis.medianLosHours).toBe(36);
    const readiness = buildPlacementReadinessStub({
      facilityId: "fac-1",
      bedsTotal: 20,
      bedsAvailable: 5,
      bedsOccupied: 15,
      bedsCleaning: 0,
      bedsBlocked: 0,
      pendingPlacementVisibility: 2,
      transportReadyVisibility: 1,
    });
    expect(readiness.placementLogicEnabled).toBe(false);
    expect(readiness.bedAssignmentEnabled).toBe(false);
    expect(readiness.d3bEnabled).toBe(false);
    expect(readiness.readinessOnly).toBe(true);
  });
});
