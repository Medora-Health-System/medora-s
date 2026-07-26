import { projectEnterpriseTechnicianNursingAssistantWorkspace } from "./enterprise-technician-nursing-assistant-workspace.util";

describe("enterprise-technician-nursing-assistant-workspace.util (D4B.3)", () => {
  it("projects capability-aware workspace without independent lifecycle engine", () => {
    const summary = projectEnterpriseTechnicianNursingAssistantWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "INPATIENT",
      roleCodes: ["PATIENT_CARE_TECH"],
      tasks: [
        {
          taskId: "t1",
          type: "VITAL_SIGNS",
          title: "Vitals",
          status: "ASSIGNED",
          encounterId: "e1",
          rnValidationRequired: false,
          escalationRequired: false,
          createdAt: "2026-07-26T10:00:00.000Z",
        },
      ],
    });
    expect(summary.careSetting).toBe("INPATIENT");
    expect(summary.roleProfile).toBe("PATIENT_CARE_TECH");
    expect(summary.usesD4b1Lifecycle).toBe(true);
    expect(summary.independentTechnicianLifecycleEngine).toBe(false);
    expect(summary.masqueradesAsNursingAssessment).toBe(false);
    expect(summary.operationalTasks).toHaveLength(1);
    expect(summary.sections.some((s) => s.id === "vitalSigns")).toBe(true);
  });

  it("maps ED encounter type for care-setting sections", () => {
    const summary = projectEnterpriseTechnicianNursingAssistantWorkspace({
      encounterId: "e1",
      patientId: "p1",
      facilityId: "f1",
      encounterType: "ER",
      roleCodes: ["LAB"],
    });
    expect(summary.careSetting).toBe("EMERGENCY");
    expect(summary.roleProfile).toBe("LAB_TECHNICIAN");
    expect(summary.sections.some((s) => s.id === "adlAssistance")).toBe(false);
  });
});
