import { projectEnterpriseRespiratoryTherapyWorkspace } from "./enterprise-respiratory-therapy-workspace.util";

describe("MEDUI.D4B.4 enterprise respiratory therapy workspace util", () => {
  it("projects care-setting-aware summary with D4B.1 lifecycle flags", () => {
    const summary = projectEnterpriseRespiratoryTherapyWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "ER",
      roleCodes: ["RN"],
      edocEntries: [
        {
          id: "edoc-1",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          category: "RESPIRATORY_DOCUMENTATION",
          cardId: "resp_ventilator",
          payloadJson: { mode: "AC" },
          authorUserId: "rn-1",
          authorDisplayNameSnapshot: "Nurse",
          authorRoleSnapshot: "RN",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
      activeOrders: [
        {
          orderId: "o1",
          displayLabel: "Oxygen",
          status: "ACTIVE",
          rtInvolvement: "rt_notify",
        },
      ],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.roleProfile).toBe("NURSE_WITH_RT_PERMISSIONS");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentRespiratoryTherapyLifecycleEngine).toBe(false);
    expect(summary.documents[0]?.documentTypeId).toBe("rt.ventilator_check");
    expect(summary.activeOrders).toHaveLength(1);
    expect(summary.createsProviderOrders).toBe(false);
  });

  it("limits technician profile to measurement visibility", () => {
    const summary = projectEnterpriseRespiratoryTherapyWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      careSetting: "INPATIENT",
      roleCodes: ["PATIENT_CARE_TECH"],
    });
    expect(summary.roleProfile).toBe("TECHNICIAN_MEASUREMENT_ONLY");
    const ids = summary.sections.map((s: { id: string }) => s.id);
    expect(ids).toContain("technicianMeasurements");
    expect(ids).not.toContain("respiratoryAssessment");
  });
});
