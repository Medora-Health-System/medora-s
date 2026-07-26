import {
  projectEnterpriseRehabilitationWorkspace,
  rejectClientControlledRehabIdentity,
} from "./enterprise-rehabilitation-workspaces.util";

describe("enterprise-rehabilitation-workspaces.util (D4B.5)", () => {
  it("projects a bounded PT workspace summary without creating orders", () => {
    const summary = projectEnterpriseRehabilitationWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "ER",
      disciplineMode: "PHYSICAL_THERAPY",
      roleCodes: ["RN"],
      relatedOrders: [
        {
          orderId: "o1",
          procedureCode: "fall_precautions",
          displayLabel: "Fall precautions",
          status: "ACTIVE",
        },
      ],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.disciplineMode).toBe("PHYSICAL_THERAPY");
    expect(summary.createsProviderOrders).toBe(false);
    expect(summary.collapsesPtOtSlp).toBe(false);
    expect(summary.relatedOrders).toHaveLength(1);
  });

  it("rejects client-controlled author identity", () => {
    const rejected = rejectClientControlledRehabIdentity({
      clientAuthorUserId: "attacker",
      serverAuthorUserId: "rn-1",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.clientIdentityRejected).toBe(true);
    expect(rejected.authorUserId).toBe("rn-1");
    const ok = rejectClientControlledRehabIdentity({
      serverAuthorUserId: "rn-1",
      serverPerformerUserId: "rn-1",
    });
    expect(ok.accepted).toBe(true);
    expect(ok.clientIdentityRejected).toBe(false);
  });
});
