import { describe, expect, it } from "vitest";
import {
  D4C10D_CERTIFICATION_ID,
  clinicAmbulatoryWorklistServiceLineWhere,
  dedupeWorklistRowsByEncounterId,
  isClinicAmbulatoryWorklistServiceLine,
  isDentalWorklistEncounter,
  isRegistrationCompatibleRoomLabel,
  isUnclaimedAmbulatoryWaitingVisit,
  listClinicOwnershipBlockersForDentalReroute,
  planDentalVisitStart,
} from "./enterpriseActiveVisitRoutingD4c10d.js";

const safeWait = {
  id: "c-wait",
  type: "OUTPATIENT",
  status: "OPEN",
  serviceLine: "CLINIC",
  providerDocumentationStatus: "DRAFT",
  workflowState: "ARRIVED",
  billingFinalizationStatus: "NOT_READY",
  reopenCount: 0,
  roomLabel: "Salle d'attente",
} as const;

describe("MEDUI.D4C.10D active visit routing", () => {
  it("exports certification id", () => {
    expect(D4C10D_CERTIFICATION_ID).toBe("MEDUI.D4C.10D");
  });

  it("Clinic board includes CLINIC/null and excludes DENTAL", () => {
    expect(isClinicAmbulatoryWorklistServiceLine("CLINIC")).toBe(true);
    expect(isClinicAmbulatoryWorklistServiceLine(null)).toBe(true);
    expect(isClinicAmbulatoryWorklistServiceLine("URGENT_CARE")).toBe(true);
    expect(isClinicAmbulatoryWorklistServiceLine("DENTAL")).toBe(false);
    expect(isClinicAmbulatoryWorklistServiceLine("EMERGENCY")).toBe(false);
  });

  it("Dental worklist includes DENTAL serviceLine", () => {
    expect(
      isDentalWorklistEncounter({
        id: "d1",
        type: "OUTPATIENT",
        status: "OPEN",
        serviceLine: "DENTAL",
      })
    ).toBe(true);
    expect(
      isDentalWorklistEncounter({
        id: "c1",
        type: "OUTPATIENT",
        status: "OPEN",
        serviceLine: "CLINIC",
      })
    ).toBe(false);
  });

  it("dedupes by encounterId not patientId", () => {
    const rows = dedupeWorklistRowsByEncounterId([
      { id: "e1", patientId: "p1" },
      { id: "e1", patientId: "p1" },
      { id: "e2", patientId: "p1" },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["e1", "e2"]);
  });

  it("SAFE UNCLAIMED WAIT → ROUTE same encounterId", () => {
    expect(isUnclaimedAmbulatoryWaitingVisit(safeWait)).toBe(true);
    expect(listClinicOwnershipBlockersForDentalReroute(safeWait)).toEqual([]);
    expect(planDentalVisitStart([safeWait])).toEqual({
      action: "ROUTE_UNCLAIMED_CLINIC",
      encounterId: "c-wait",
      previousServiceLine: "CLINIC",
    });
  });

  it("null serviceLine legacy wait is routable", () => {
    expect(
      planDentalVisitStart([
        { ...safeWait, id: "legacy", serviceLine: null },
      ]).action
    ).toBe("ROUTE_UNCLAIMED_CLINIC");
  });

  it.each([
    ["PROVIDER_ASSIGNED", { physicianAssignedUserId: "u1" }],
    ["NURSE_ASSIGNED", { nurseAssignedUserId: "n1" }],
    ["LEGACY_PROVIDER_SET", { providerId: "p1" }],
    ["DOCUMENTATION_SIGNED", { providerDocumentationStatus: "SIGNED" }],
    ["PROVIDER_NOTE", { providerNote: "Chest exam" }],
    ["TREATMENT_PLAN", { treatmentPlan: "Plan" }],
    ["ENCOUNTER_NOTES_FIELD", { notes: "RN note" }],
    ["DIAGNOSIS", { diagnosisCount: 1 }],
    ["ORDER", { orderCount: 1 }],
    ["ENCOUNTER_NOTE", { encounterNoteCount: 1 }],
    ["BILLING_EVENT", { billingEventCount: 1 }],
    ["BILLING_CAPTURE", { billingCaptureJson: { lines: [{ code: "99213" }] } }],
    ["BILLING_FINALIZED", { billingFinalizationStatus: "FINALIZED" }],
    ["CLAIM_SUBMISSION", { claimSubmissionCount: 1 }],
    ["DISPOSITION", { disposition: "HOME" }],
    ["DISCHARGE", { dischargeStatus: "DISCHARGED" }],
    ["ADMISSION", { admittedAt: new Date().toISOString() }],
    ["WORKFLOW_BEYOND_ARRIVED", { workflowState: "IN_TREATMENT" }],
    ["TRIAGE_COMPLETED", { triageCompleteAt: new Date().toISOString() }],
    ["CLINICAL_EVENT", { clinicalEventCount: 1 }],
    ["CLINICAL_DOCUMENTATION", { clinicalDocumentationEntryCount: 1 }],
    ["MEDICATION_ADMIN", { medicationAdministrationCount: 1 }],
    ["TOOTH_FINDING", { toothFindingCount: 1 }],
    ["PROVIDER_ADDENDUM", { providerAddendumCount: 1 }],
    ["LIFECYCLE_TRANSITION", { lifecycleTransitionCount: 1 }],
    ["HOSPITAL_EPISODE", { hospitalEpisodeId: "he1" }],
    ["CLINICAL_ROOM", { roomLabel: "12" }],
    ["VITALS", { vitals: { hr: 80 } }],
    [
      "PHYSICIAN_EVAL",
      { nursingAssessment: { physicianEvalV1: { hpi: "pain" } } },
    ],
  ] as const)(
    "ownership blocker %s → CREATE_NEW_DENTAL (no in-place mutate)",
    (_code, patch) => {
      const owned = { ...safeWait, id: "owned", ...patch };
      expect(isUnclaimedAmbulatoryWaitingVisit(owned)).toBe(false);
      const blockers = listClinicOwnershipBlockersForDentalReroute(owned);
      expect(blockers.length).toBeGreaterThan(0);
      const plan = planDentalVisitStart([owned]);
      expect(plan.action).toBe("CREATE_NEW_DENTAL");
      if (plan.action === "CREATE_NEW_DENTAL") {
        expect(plan.reason).toBe("CLINIC_DOCUMENTED");
        expect(plan.blockingEncounterId).toBe("owned");
        expect(plan.ownershipBlockers?.length).toBeGreaterThan(0);
      }
    }
  );

  it("empty note / blank provider / null room alone do NOT prove safety — ownership counts still gate", () => {
    // Looks "empty" in UI but has a diagnosis → unsafe.
    expect(
      isUnclaimedAmbulatoryWaitingVisit({
        id: "x",
        type: "OUTPATIENT",
        status: "OPEN",
        serviceLine: "CLINIC",
        providerNote: "",
        physicianAssignedUserId: null,
        roomLabel: null,
        diagnosisCount: 1,
      })
    ).toBe(false);
  });

  it("reuses existing Dental OPEN before Clinic wait", () => {
    const plan = planDentalVisitStart([
      { id: "d1", type: "OUTPATIENT", status: "OPEN", serviceLine: "DENTAL" },
      { ...safeWait, id: "c1" },
    ]);
    expect(plan).toEqual({ action: "REUSE_EXISTING_DENTAL", encounterId: "d1" });
  });

  it("registration-compatible room labels", () => {
    expect(isRegistrationCompatibleRoomLabel(null)).toBe(true);
    expect(isRegistrationCompatibleRoomLabel("Salle d'attente")).toBe(true);
    expect(isRegistrationCompatibleRoomLabel("DENTAL")).toBe(true);
    expect(isRegistrationCompatibleRoomLabel("12")).toBe(false);
  });

  it("clinic prisma where excludes only by allowing CLINIC/null", () => {
    const w = clinicAmbulatoryWorklistServiceLineWhere();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { serviceLine: null },
        { serviceLine: { in: ["CLINIC", "URGENT_CARE"] } },
      ])
    );
  });
});
