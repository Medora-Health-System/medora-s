/**
 * MEDUI.D4B.6 — API projection util characterization tests.
 */

import {
  projectEnterpriseInterdisciplinaryCarePlans,
  rejectClientControlledCarePlanIdentity,
} from "./enterprise-interdisciplinary-care-plans.util";

describe("MEDUI.D4B.6 enterprise interdisciplinary care plans util", () => {
  it("projects inpatient summary with hard authority boundaries", () => {
    const summary = projectEnterpriseInterdisciplinaryCarePlans({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "INPATIENT",
      roleCodes: ["RN"],
    });
    expect(summary.careSetting).toBe("INPATIENT");
    expect(summary.roleProfile).toBe("NURSE_CARE_PLAN_AUTHOR");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentCarePlanLifecycleEngine).toBe(false);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.authorizesDischarge).toBe(false);
    expect(summary.autoActivatesFromDiagnosisAlone).toBe(false);
    expect(summary.activeTemplates.length).toBe(8);
    expect(summary.sections.some((s) => s.id === "templateCatalog")).toBe(true);
  });

  it("limits emergency projection sections", () => {
    const summary = projectEnterpriseInterdisciplinaryCarePlans({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "EMERGENCY",
      roleCodes: ["RN"],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.sections.some((s) => s.id === "templateCatalog")).toBe(false);
    expect(summary.sections.some((s) => s.id === "overview")).toBe(true);
  });

  it("rejects client-controlled author / performer / signer identity", () => {
    const rejected = rejectClientControlledCarePlanIdentity({
      clientAuthorUserId: "spoof",
      serverAuthorUserId: "real-nurse",
      clientPerformerUserId: "spoof-perf",
      serverPerformerUserId: "real-perf",
      clientSignerUserId: "spoof-sign",
      serverSignerUserId: "real-sign",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.clientIdentityRejected).toBe(true);
    expect(rejected.authorUserId).toBe("real-nurse");
    expect(rejected.performerUserId).toBe("real-perf");
    expect(rejected.signerUserId).toBe("real-sign");

    const ok = rejectClientControlledCarePlanIdentity({
      clientAuthorUserId: "real-nurse",
      serverAuthorUserId: "real-nurse",
      serverPerformerUserId: null,
      serverSignerUserId: "real-nurse",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.clientIdentityRejected).toBe(false);
  });
});
