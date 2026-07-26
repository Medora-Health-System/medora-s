/**
 * MEDUI.D4B.7 — API projection util characterization tests.
 */

import {
  projectEnterpriseCaseManagementDischargePlanning,
  rejectClientControlledCareCoordinationIdentity,
} from "./enterprise-case-management-discharge-planning.util";

describe("MEDUI.D4B.7 enterprise case management discharge planning util", () => {
  it("projects inpatient summary with hard authority boundaries", () => {
    const summary = projectEnterpriseCaseManagementDischargePlanning({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "INPATIENT",
      roleCodes: ["CM"],
    });
    expect(summary.careSetting).toBe("INPATIENT");
    expect(summary.roleProfile).toBe("CASE_MANAGER");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.authorizesDischarge).toBe(false);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.usesPredictiveAi).toBe(false);
    expect(summary.usesProprietaryInterQualOrMcg).toBe(false);
    expect(summary.rewritesD4b6CarePlans).toBe(false);
    expect(summary.assignmentEqualsAuthorization).toBe(false);
    expect(summary.sections.some((s) => s.id === "episode")).toBe(true);
    expect(summary.barrierCatalog.length).toBe(12);
  });

  it("limits emergency projection sections", () => {
    const summary = projectEnterpriseCaseManagementDischargePlanning({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "EMERGENCY",
      roleCodes: ["CM"],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.sections.some((s) => s.id === "episode")).toBe(false);
    expect(summary.sections.some((s) => s.id === "overview")).toBe(true);
    expect(summary.interdisciplinaryReadiness.authorizesDischarge).toBe(false);
  });

  it("rejects client-controlled author / performer / signer identity", () => {
    const rejected = rejectClientControlledCareCoordinationIdentity({
      clientAuthorUserId: "spoof",
      serverAuthorUserId: "real-cm",
      clientPerformerUserId: "spoof-perf",
      serverPerformerUserId: "real-perf",
      clientSignerUserId: "spoof-sign",
      serverSignerUserId: "real-sign",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.clientIdentityRejected).toBe(true);
    expect(rejected.authorUserId).toBe("real-cm");
    expect(rejected.performerUserId).toBe("real-perf");
    expect(rejected.signerUserId).toBe("real-sign");

    const ok = rejectClientControlledCareCoordinationIdentity({
      clientAuthorUserId: "real-cm",
      serverAuthorUserId: "real-cm",
      serverPerformerUserId: null,
      serverSignerUserId: "real-cm",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.clientIdentityRejected).toBe(false);
  });
});
