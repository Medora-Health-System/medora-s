import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID,
  HOSPITAL_BOARD_ASSIGNMENT_ROLES,
  HOSPITAL_BOARD_DISPLAY_POLICY,
  HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES,
  applyClinicalAttendingMutation,
  applyHospitalAssignmentMutation,
  applyHospitalWorkflowAssignmentMutation,
  emptyHospitalAssignmentBag,
  ensureEmptyHospitalAssignmentOnAdmission,
  filterMyPatientsEncountersEnterprise,
  filterUnassignedHospitalEncountersEnterprise,
  isHospitalPatientCareTechMembership,
  mergeHospitalAssignmentBagIntoSummary,
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
} from "./enterpriseAssignmentEngineD4a30.js";
import {
  ENTERPRISE_ASSIGNMENT_COMPLETION_UNSUPPORTED_FUTURE_SIGNALS,
  filterMyIncompleteChartsEncountersEnterprise,
  resolveEnterpriseAssignmentCompletion,
} from "./enterpriseAssignmentCompletionD4a30.js";

describe("enterpriseAssignmentEngineD4a30", () => {
  it("exports certification id", () => {
    expect(ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE.D4A3_0"
    );
  });

  it("empty bag starts all board roles unassigned with clinical + workflow", () => {
    const bag = emptyHospitalAssignmentBag("INPATIENT");
    const p = projectHospitalBoardAssignments(bag);
    expect(p.providerUnassigned).toBe(true);
    expect(p.nurseUnassigned).toBe(true);
    expect(p.technicianUnassigned).toBe(true);
    expect(bag.clinical.attendingProviderUserId).toBeNull();
    expect(bag.workflow.COVERING_PROVIDER).toBeNull();
    expect(HOSPITAL_BOARD_ASSIGNMENT_ROLES).toEqual(["PROVIDER", "NURSE", "TECHNICIAN"]);
  });

  it("ensureEmptyHospitalAssignmentOnAdmission never copies ED ids", () => {
    const summary = ensureEmptyHospitalAssignmentOnAdmission(
      {
        physicianAssignedUserId: "ed-md-1",
        nurseAssignedUserId: "ed-rn-1",
        originatingEdEncounterId: "ed-enc-1",
      },
      "OBSERVATION"
    );
    const bag = readHospitalAssignmentBag(summary);
    expect(bag?.careSetting).toBe("OBSERVATION");
    expect(bag?.slots.PROVIDER).toBeNull();
    expect(bag?.slots.NURSE).toBeNull();
    expect(bag?.slots.TECHNICIAN).toBeNull();
    const p = projectHospitalBoardAssignments(bag);
    expect(p.providerUserId).toBeNull();
    expect(p.nurseUserId).toBeNull();
  });

  it("lifecycle: assign → reassign → unassign writes primary workflow", () => {
    let bag = emptyHospitalAssignmentBag("INPATIENT");
    bag = applyHospitalAssignmentMutation(bag, {
      role: "PROVIDER",
      actorUserId: "u1",
      nextUserId: "u1",
      source: "SELF_ASSIGN",
      displayName: "Dr One",
      at: "2026-01-01T00:00:00.000Z",
    });
    expect(bag.workflow.PRIMARY_PROVIDER?.userId).toBe("u1");
    expect(bag.slots.PROVIDER?.userId).toBe("u1");
    expect(bag.history[0]?.action).toBe("ASSIGN");

    bag = applyHospitalAssignmentMutation(bag, {
      role: "PROVIDER",
      actorUserId: "admin",
      nextUserId: "u2",
      source: "REASSIGN",
      displayName: "Dr Two",
      at: "2026-01-01T01:00:00.000Z",
    });
    expect(bag.workflow.PRIMARY_PROVIDER?.userId).toBe("u2");
    expect(bag.history[1]?.action).toBe("REASSIGN");

    bag = applyHospitalAssignmentMutation(bag, {
      role: "PROVIDER",
      actorUserId: "admin",
      nextUserId: null,
      source: "UNASSIGN",
      at: "2026-01-01T02:00:00.000Z",
    });
    expect(bag.slots.PROVIDER).toBeNull();
    expect(bag.history[2]?.action).toBe("UNASSIGN");
  });

  it("TECHNICIAN board role maps to PATIENT_CARE_TECH workflow; LAB/RAD roles do not match my-patients tech", () => {
    let bag = emptyHospitalAssignmentBag("INPATIENT");
    bag = applyHospitalAssignmentMutation(bag, {
      role: "TECHNICIAN",
      actorUserId: "pct-1",
      nextUserId: "pct-1",
      source: "SELF_ASSIGN",
      displayName: "PCT One",
    });
    expect(bag.workflow.PATIENT_CARE_TECH?.userId).toBe("pct-1");
    expect(bag.slots.TECHNICIAN?.userId).toBe("pct-1");
    expect(isHospitalPatientCareTechMembership(["PATIENT_CARE_TECH"])).toBe(true);
    expect(isHospitalPatientCareTechMembership(["LAB"])).toBe(false);
    expect(isHospitalPatientCareTechMembership(["RADIOLOGY"])).toBe(false);
    expect(
      filterMyPatientsEncountersEnterprise(
        [{ technicianUserId: "pct-1", providerUserId: null, nurseUserId: null }],
        { currentUserId: "pct-1", roles: ["PATIENT_CARE_TECH"] }
      )
    ).toHaveLength(1);
    expect(
      filterMyPatientsEncountersEnterprise(
        [{ technicianUserId: "lab-1", providerUserId: null, nurseUserId: null }],
        { currentUserId: "lab-1", roles: ["LAB"] }
      )
    ).toHaveLength(0);
  });

  it("covering does not overwrite clinical attending or primary provider", () => {
    let bag = emptyHospitalAssignmentBag("INPATIENT");
    bag = applyClinicalAttendingMutation(bag, {
      actorUserId: "admin",
      attendingProviderUserId: "attend-1",
      attendingProviderDisplayName: "Dr Attending",
    });
    bag = applyHospitalAssignmentMutation(bag, {
      role: "PROVIDER",
      actorUserId: "prim-1",
      nextUserId: "prim-1",
      source: "SELF_ASSIGN",
      displayName: "Dr Primary",
    });
    bag = applyHospitalWorkflowAssignmentMutation(bag, {
      slot: "COVERING_PROVIDER",
      actorUserId: "cov-1",
      nextUserId: "cov-1",
      source: "SELF_ASSIGN",
      displayName: "Dr Cover",
    });
    expect(bag.clinical.attendingProviderUserId).toBe("attend-1");
    expect(bag.workflow.PRIMARY_PROVIDER?.userId).toBe("prim-1");
    expect(bag.workflow.COVERING_PROVIDER?.userId).toBe("cov-1");
    const p = projectHospitalBoardAssignments(bag);
    expect(p.providerUserId).toBe("prim-1");
    expect(p.clinicalAttendingUserId).toBe("attend-1");
    expect(p.coveringProviderUserId).toBe("cov-1");
    expect(HOSPITAL_BOARD_DISPLAY_POLICY.coveringDoesNotOverwriteAttending).toBe(true);
  });

  it("break and charge RN do not replace primary RN", () => {
    let bag = emptyHospitalAssignmentBag("INPATIENT");
    bag = applyHospitalAssignmentMutation(bag, {
      role: "NURSE",
      actorUserId: "rn-1",
      nextUserId: "rn-1",
      source: "SELF_ASSIGN",
      displayName: "RN Primary",
    });
    bag = applyHospitalWorkflowAssignmentMutation(bag, {
      slot: "BREAK_RN",
      actorUserId: "rn-2",
      nextUserId: "rn-2",
      source: "SELF_ASSIGN",
      displayName: "RN Break",
    });
    bag = applyHospitalWorkflowAssignmentMutation(bag, {
      slot: "CHARGE_RN",
      actorUserId: "rn-3",
      nextUserId: "rn-3",
      source: "SELF_ASSIGN",
      displayName: "RN Charge",
    });
    expect(bag.workflow.PRIMARY_RN?.userId).toBe("rn-1");
    expect(bag.slots.NURSE?.userId).toBe("rn-1");
    expect(bag.workflow.BREAK_RN?.userId).toBe("rn-2");
    expect(bag.workflow.CHARGE_RN?.userId).toBe("rn-3");
    expect(
      filterMyPatientsEncountersEnterprise(
        [
          {
            providerUserId: null,
            nurseUserId: "rn-1",
            breakNurseUserId: "rn-2",
            chargeNurseUserId: "rn-3",
            technicianUserId: null,
          },
        ],
        { currentUserId: "rn-2", roles: ["RN"] }
      )
    ).toHaveLength(1);
  });

  it("my-patients filter matches role slots; provider/RN do not match tech slot alone", () => {
    const rows = [
      { providerUserId: "md-1", nurseUserId: null, technicianUserId: null },
      { providerUserId: null, nurseUserId: "rn-1", technicianUserId: null },
      { providerUserId: null, nurseUserId: null, technicianUserId: "pct-1" },
    ];
    expect(
      filterMyPatientsEncountersEnterprise(rows, {
        currentUserId: "md-1",
        roles: ["PROVIDER"],
      })
    ).toHaveLength(1);
    expect(
      filterMyPatientsEncountersEnterprise(rows, {
        currentUserId: "rn-1",
        roles: ["RN"],
      })
    ).toHaveLength(1);
    expect(
      filterMyPatientsEncountersEnterprise(rows, {
        currentUserId: "pct-1",
        roles: ["PROVIDER"],
      })
    ).toHaveLength(0);
    expect(
      filterMyPatientsEncountersEnterprise(rows, {
        currentUserId: "pct-1",
        roles: ["PATIENT_CARE_TECH"],
      })
    ).toHaveLength(1);
  });

  it("EMERGENCY careSetting context does not resolve hospital my-patients from bag helpers", () => {
    expect(
      filterMyPatientsEncountersEnterprise(
        [{ providerUserId: "md-1", nurseUserId: null, technicianUserId: null }],
        { currentUserId: "md-1", roles: ["PROVIDER"], careSetting: "EMERGENCY" }
      )
    ).toHaveLength(0);
  });

  it("unassigned filter and board projection exclude ancillary roles", () => {
    expect(HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES).toContain("PHARMACIST");
    expect(HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES).toContain("LAB");
    expect(HOSPITAL_BOARD_EXCLUDED_ASSIGNMENT_ROLES).toContain("RADIOLOGY");
    const rows = [
      { providerUserId: null, nurseUserId: "rn-1", technicianUserId: null },
      { providerUserId: "md-1", nurseUserId: null, technicianUserId: null },
    ];
    expect(filterUnassignedHospitalEncountersEnterprise(rows, "PROVIDER")).toHaveLength(1);
    const bag = applyHospitalAssignmentMutation(emptyHospitalAssignmentBag("INPATIENT"), {
      role: "NURSE",
      actorUserId: "rn-1",
      nextUserId: "rn-1",
      source: "SELF_ASSIGN",
      displayName: "RN One",
    });
    const summary = mergeHospitalAssignmentBagIntoSummary({}, bag);
    const p = projectHospitalBoardAssignments(readHospitalAssignmentBag(summary));
    expect(p.nurseName).toBe("RN One");
    expect(p).not.toHaveProperty("pharmacistUserId");
  });
});

describe("enterpriseAssignmentCompletionD4a30", () => {
  const ctx = { currentUserId: "md-1", roles: ["PROVIDER"] as const };

  it("My Patients includes all assigned; Incomplete only with proven reasons", () => {
    const assignedComplete = {
      providerUserId: "md-1",
      nurseUserId: null,
      technicianUserId: null,
      alerts: [] as Array<{ code: string }>,
    };
    const assignedIncomplete = {
      providerUserId: "md-1",
      nurseUserId: null,
      technicianUserId: null,
      alerts: [{ code: "READY_DISCHARGE" }],
    };
    const assignedCritical = {
      providerUserId: "md-1",
      nurseUserId: null,
      technicianUserId: null,
      alerts: [{ code: "CRITICAL_RESULTS" }],
    };
    const unassigned = {
      providerUserId: null,
      nurseUserId: null,
      technicianUserId: null,
      alerts: [{ code: "READY_DISCHARGE" }],
    };
    const openOnlyAssigned = {
      providerUserId: "md-1",
      nurseUserId: null,
      technicianUserId: null,
      alerts: [{ code: "REASSESSMENT_OVERDUE" }, { code: "VITALS_STALE" }],
    };

    expect(filterMyPatientsEncountersEnterprise([assignedComplete, assignedIncomplete], ctx)).toHaveLength(
      2
    );
    const incomplete = filterMyIncompleteChartsEncountersEnterprise(
      [assignedComplete, assignedIncomplete, assignedCritical, unassigned, openOnlyAssigned],
      ctx
    );
    expect(incomplete.map((r) => r.alerts?.[0]?.code).sort()).toEqual([
      "CRITICAL_RESULTS",
      "READY_DISCHARGE",
    ]);
    expect(resolveEnterpriseAssignmentCompletion(assignedComplete, ctx).status).toBe(
      "ASSIGNED_NO_KNOWN_INCOMPLETE"
    );
    expect(resolveEnterpriseAssignmentCompletion(unassigned, ctx).status).toBe("UNASSIGNED");
    expect(resolveEnterpriseAssignmentCompletion(openOnlyAssigned, ctx).status).toBe(
      "ASSIGNED_NO_KNOWN_INCOMPLETE"
    );
  });

  it("does not treat open-only or assignment-only as incomplete", () => {
    expect(ENTERPRISE_ASSIGNMENT_COMPLETION_UNSUPPORTED_FUTURE_SIGNALS).toContain("OPEN_ENCOUNTER_ONLY");
    expect(ENTERPRISE_ASSIGNMENT_COMPLETION_UNSUPPORTED_FUTURE_SIGNALS).toContain("ASSIGNMENT_ONLY");
    const r = resolveEnterpriseAssignmentCompletion(
      { providerUserId: "md-1", alerts: [] },
      ctx
    );
    expect(r.incomplete).toBe(false);
    expect(r.assigned).toBe(true);
  });
});
