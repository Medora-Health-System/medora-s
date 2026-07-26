/**
 * MEDUI.D4B.2 — Nursing workspace projection util tests.
 */

import { projectEnterpriseNursingClinicalWorkspace } from "./enterprise-nursing-clinical-workspace.util";

describe("enterprise-nursing-clinical-workspace.util", () => {
  it("projects inpatient nursing workspace summary without independent lifecycle", () => {
    const summary = projectEnterpriseNursingClinicalWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "INPATIENT",
      admission: {
        encounterId: "e1",
        patientId: "p1",
        facilityId: "f1",
        documentationStatus: "DRAFT",
      },
      notes: [
        {
          id: "n1",
          encounterId: "e1",
          patientId: "p1",
          facilityId: "f1",
          noteType: "NURSING",
          body: "hello",
          authorUserId: "u1",
          authorDisplayName: "Nurse",
          authorRoleTitle: "RN",
          createdAt: "2026-07-26T12:00:00.000Z",
        },
      ],
    });
    expect(summary.careSetting).toBe("INPATIENT");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentNursingLifecycleEngine).toBe(false);
    expect(summary.sections.some((s) => s.id === "admission")).toBe(true);
    expect(summary.documents.length).toBeGreaterThanOrEqual(2);
  });

  it("classifies ER encounter type to emergency care setting", () => {
    const summary = projectEnterpriseNursingClinicalWorkspace({
      encounterId: "e2",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "ER",
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.sections.some((s) => s.id === "admission")).toBe(false);
    expect(summary.sections.some((s) => s.id === "reassessment")).toBe(true);
  });
});
