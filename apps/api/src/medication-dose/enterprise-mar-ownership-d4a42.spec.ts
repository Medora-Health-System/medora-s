/**
 * MEDUI.D4A.4.2 — Nest unit tests (mocked Prisma; no live DB required).
 * Shared characterization covers pure ownership; this suite verifies Nest wiring.
 */
import {
  collectMarNursingAssigneeEncounterIds,
  emptyHospitalAssignmentBag,
  mergeHospitalAssignmentBagIntoSummary,
  resolveMarNursingOwnership,
} from "@medora/shared";
import {
  resolveMarAssigneeEncounterIds,
  resolveMarAssignedNurseUserIdFromEncounter,
  toMarOwnershipEncounterFields,
} from "./mar-enterprise-ownership.util";
import { MarShiftTimelineService } from "./mar-shift-timeline.service";
import { MedicationPassQueueService } from "./medication-pass-queue.service";

function hospitalBag(careSetting: "OBSERVATION" | "INPATIENT", primaryRnId: string | null) {
  const bag = emptyHospitalAssignmentBag(careSetting);
  if (primaryRnId) {
    bag.workflow.PRIMARY_RN = {
      userId: primaryRnId,
      assignedAt: "2026-07-01T12:00:00.000Z",
      source: "SELF_ASSIGN",
      displayName: "IP Primary RN",
    };
  }
  return mergeHospitalAssignmentBagIntoSummary({}, bag);
}

describe("MEDUI.D4A.4.2 — Nest MAR ownership wiring", () => {
  const savedCompat = process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE;

  afterEach(() => {
    if (savedCompat === undefined) delete process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE;
    else process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE = savedCompat;
  });

  it("IP defect: projected nurse is PRIMARY_RN not ED receiving nurse", () => {
    const enc = {
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      physicianAssignedUserId: "ed-md",
      nurseAssignedUserId: "ed-receiving-rn",
      admissionSummaryJson: hospitalBag("INPATIENT", "ip-primary-rn"),
    };
    expect(resolveMarAssignedNurseUserIdFromEncounter(enc)).toBe("ip-primary-rn");
    expect(resolveMarNursingOwnership(toMarOwnershipEncounterFields(enc)).source).toBe(
      "HOSPITAL_ASSIGNMENT_BAG"
    );
  });

  it("OBS: assignee encounter id collection uses bag owner", () => {
    const ids = collectMarNursingAssigneeEncounterIds(
      [
        {
          id: "obs-1",
          type: "INPATIENT",
          nurseAssignedUserId: "ed-rn",
          admissionSummaryJson: hospitalBag("OBSERVATION", "obs-rn"),
        },
        {
          id: "obs-2",
          type: "INPATIENT",
          nurseAssignedUserId: "ed-rn",
          admissionSummaryJson: hospitalBag("OBSERVATION", "other-rn"),
        },
      ],
      "obs-rn"
    );
    expect(ids).toEqual(["obs-1"]);
  });

  it("ED: projected nurse uses ED column", () => {
    expect(
      resolveMarAssignedNurseUserIdFromEncounter({
        type: "EMERGENCY",
        physicianAssignedUserId: null,
        nurseAssignedUserId: "ed-rn-1",
        admissionSummaryJson: hospitalBag("INPATIENT", "should-not-win"),
      })
    ).toBe("ed-rn-1");
  });

  it("STRICT empty bag → null assignee (ED must not win)", () => {
    delete process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE;
    expect(
      resolveMarAssignedNurseUserIdFromEncounter({
        type: "INPATIENT",
        nurseAssignedUserId: "legacy-ed-rn",
        physicianAssignedUserId: null,
        admissionSummaryJson: hospitalBag("INPATIENT", null),
      })
    ).toBeNull();
  });

  it("LEGACY_COMPATIBILITY env surfaces ED fallback for empty PRIMARY_RN", () => {
    process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE = "LEGACY_COMPATIBILITY";
    expect(
      resolveMarAssignedNurseUserIdFromEncounter({
        type: "INPATIENT",
        nurseAssignedUserId: "legacy-ed-rn",
        physicianAssignedUserId: null,
        admissionSummaryJson: hospitalBag("INPATIENT", null),
      })
    ).toBe("legacy-ed-rn");
  });

  it("resolveMarAssigneeEncounterIds: one findMany, no audit, filters by ownership", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "e-ip",
        type: "INPATIENT",
        billingClassification: "INPATIENT",
        physicianAssignedUserId: null,
        nurseAssignedUserId: "ed-receiving",
        admissionSummaryJson: hospitalBag("INPATIENT", "ip-rn"),
      },
      {
        id: "e-ed",
        type: "EMERGENCY",
        billingClassification: null,
        physicianAssignedUserId: null,
        nurseAssignedUserId: "ip-rn",
        admissionSummaryJson: null,
      },
      {
        id: "e-other",
        type: "INPATIENT",
        billingClassification: "INPATIENT",
        physicianAssignedUserId: null,
        nurseAssignedUserId: "ed-receiving",
        admissionSummaryJson: hospitalBag("INPATIENT", "other-rn"),
      },
    ]);
    const prisma = { encounter: { findMany } };
    const ids = await resolveMarAssigneeEncounterIds(prisma as never, "fac-1", "ip-rn");
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0]![0].where).toEqual({ facilityId: "fac-1", status: "OPEN" });
    expect(ids?.sort()).toEqual(["e-ed", "e-ip"]);
  });

  it("resolveMarAssigneeEncounterIds: no assignee → null (no encounter query)", async () => {
    const findMany = jest.fn();
    const prisma = { encounter: { findMany } };
    await expect(
      resolveMarAssigneeEncounterIds(prisma as never, "fac-1", undefined)
    ).resolves.toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("MarShiftTimelineService.resolveAssignedNurseForEncounter uses ownership fields", async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: "enc-1",
      type: "INPATIENT",
      billingClassification: "INPATIENT",
      physicianAssignedUserId: null,
      nurseAssignedUserId: "ed-receiving",
      admissionSummaryJson: hospitalBag("INPATIENT", "ip-rn"),
    });
    const prisma = {
      encounter: { findFirst },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "ip-rn",
          firstName: "Inpatient",
          lastName: "Primary",
        }),
      },
      userRole: {
        findFirst: jest.fn().mockResolvedValue({ role: { code: "RN" } }),
      },
    };
    const svc = new MarShiftTimelineService(prisma as never);
    const assigned = await svc.resolveAssignedNurseForEncounter("fac-1", "enc-1");
    expect(findFirst.mock.calls[0]![0].select).toMatchObject({
      nurseAssignedUserId: true,
      admissionSummaryJson: true,
      physicianAssignedUserId: true,
    });
    expect(assigned?.userId).toBe("ip-rn");
  });

  it("MarShiftTimelineService: STRICT unassigned hospital → null header nurse", async () => {
    delete process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE;
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-1",
          type: "INPATIENT",
          billingClassification: "INPATIENT",
          physicianAssignedUserId: null,
          nurseAssignedUserId: "ed-receiving",
          admissionSummaryJson: hospitalBag("INPATIENT", null),
        }),
      },
      user: { findUnique: jest.fn() },
      userRole: { findFirst: jest.fn() },
    };
    const svc = new MarShiftTimelineService(prisma as never);
    await expect(svc.resolveAssignedNurseForEncounter("fac-1", "enc-1")).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("MedicationPassQueueService: assignee filter queries encounterId in ownership set", async () => {
    process.env.MEDICATION_SCHEDULING_V1 = "true";
    process.env.MEDICATION_DOSE_INSTANCES = "true";

    const encounterFindMany = jest.fn().mockResolvedValue([
      {
        id: "enc-match",
        type: "INPATIENT",
        billingClassification: "INPATIENT",
        physicianAssignedUserId: null,
        nurseAssignedUserId: "ed-receiving",
        admissionSummaryJson: hospitalBag("INPATIENT", "ip-rn"),
      },
    ]);
    const doseFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      encounter: { findMany: encounterFindMany },
      medicationDoseInstance: { findMany: doseFindMany },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new MedicationPassQueueService(prisma as never);
    const res = await svc.getPassQueue("fac-1", {
      assignedToUserId: "ip-rn",
      shiftStart: new Date("2026-06-11T07:00:00.000Z"),
      shiftEnd: new Date("2026-06-11T20:00:00.000Z"),
    });
    expect(res.enabled).toBe(true);
    expect(doseFindMany).toHaveBeenCalled();
    const where = doseFindMany.mock.calls[0]![0].where;
    expect(where.encounterId).toEqual({ in: ["enc-match"] });
    expect(where.encounter?.nurseAssignedUserId).toBeUndefined();
  });

  it("historical authorship contract: ownership util does not expose administeredBy", () => {
    const mar = resolveMarNursingOwnership({
      type: "INPATIENT",
      admissionSummaryJson: hospitalBag("INPATIENT", "ip-rn"),
      nurseAssignedUserId: "ed-rn",
    });
    expect(mar).not.toHaveProperty("administeredByUserId");
    expect(mar).not.toHaveProperty("administeredByDisplay");
    expect(mar.assignedNurseUserId).toBe("ip-rn");
  });
});
