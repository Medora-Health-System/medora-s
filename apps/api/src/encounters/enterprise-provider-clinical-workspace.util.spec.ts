/**
 * MEDUI.D4B.8 — API projection util characterization tests.
 */

import {
  projectEnterpriseProviderClinicalWorkspace,
  rejectClientControlledProviderIdentity,
} from "./enterprise-provider-clinical-workspace.util";

describe("MEDUI.D4B.8 enterprise provider clinical workspace util", () => {
  it("projects inpatient summary with hard authority boundaries", () => {
    const summary = projectEnterpriseProviderClinicalWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "INPATIENT",
      roleCodes: ["MD"],
    });
    expect(summary.careSetting).toBe("INPATIENT");
    expect(summary.roleProfile).toBe("ATTENDING_PHYSICIAN");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.mutatesDiagnosis).toBe(false);
    expect(summary.mutatesProblemList).toBe(false);
    expect(summary.mutatesMar).toBe(false);
    expect(summary.authorizesDischarge).toBe(false);
    expect(summary.isDischargeSummary).toBe(false);
    expect(summary.isProcedureOrOperativeNote).toBe(false);
    expect(summary.rewritesD4b6CarePlans).toBe(false);
    expect(summary.rewritesD4b7Coordination).toBe(false);
    expect(summary.autoEmCoding).toBe(false);
    expect(summary.assignmentEqualsAuthorization).toBe(false);
    expect(summary.sections.some((s) => s.id === "historyPhysical")).toBe(true);
    expect(summary.noteTypeCatalog.length).toBeGreaterThanOrEqual(4);
    expect(summary.createsIndependentDocumentationEngine).toBe(false);
    expect(summary.replacesProviderDocumentationWorkspace).toBe(false);
    expect(summary.composition.webEditor).toBe("ProviderDocumentationWorkspace");
    expect(summary.composition.durableLegalRecord).toBe("EncounterNote");
  });

  it("limits emergency projection sections", () => {
    const summary = projectEnterpriseProviderClinicalWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "EMERGENCY",
      roleCodes: ["MD"],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.sections.some((s) => s.id === "historyPhysical")).toBe(false);
    expect(summary.sections.some((s) => s.id === "overview")).toBe(true);
    expect(summary.createsProviderOrders).toBe(false);
  });

  it("rejects client-controlled author / signer / attester / cosigner identity", () => {
    const rejected = rejectClientControlledProviderIdentity({
      clientAuthorUserId: "spoof",
      serverAuthorUserId: "real-md",
      clientSignerUserId: "spoof-sign",
      serverSignerUserId: "real-sign",
      clientAttesterUserId: "spoof-attest",
      serverAttesterUserId: "real-attest",
      clientCosignerUserId: "spoof-cosign",
      serverCosignerUserId: "real-cosign",
      clientPerformerUserId: "spoof-perf",
      serverPerformerUserId: "real-perf",
      clientSupervisingProviderUserId: "spoof-sup",
      serverSupervisingProviderUserId: "real-sup",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.clientIdentityRejected).toBe(true);
    expect(rejected.authorUserId).toBe("real-md");
    expect(rejected.signerUserId).toBe("real-sign");
    expect(rejected.attesterUserId).toBe("real-attest");
    expect(rejected.cosignerUserId).toBe("real-cosign");

    const ok = rejectClientControlledProviderIdentity({
      clientAuthorUserId: "real-md",
      serverAuthorUserId: "real-md",
      serverSignerUserId: "real-md",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.clientIdentityRejected).toBe(false);
  });
});
