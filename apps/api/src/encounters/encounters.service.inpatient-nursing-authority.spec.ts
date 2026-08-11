import { BadRequestException } from "@nestjs/common";
import { EncounterClinicalEventType, EncounterType } from "@prisma/client";
import { EncountersService } from "./encounters.service";

describe("INP.1A inpatient nursing authority", () => {
  const encounter = {
    id: "enc-1", patientId: "pat-1", type: EncounterType.INPATIENT,
    admissionSummaryJson: { hospitalAssignmentV1: { version: 1, careSetting: "INPATIENT", assignments: [] } },
    nursingAssessment: { erNursingReassessmentV1: { narrative: "legacy" } },
  };

  function harness(row: any = encounter) {
    const events: any[] = [];
    const prisma: any = {
      encounter: { findFirst: jest.fn().mockResolvedValue(row), update: jest.fn().mockResolvedValue({}) },
      encounterClinicalEvent: {
        create: jest.fn(async ({ data }) => { events.push({ id: `ev-${events.length + 1}`, createdAt: new Date(), ...data }); return data; }),
        findMany: jest.fn(async ({ where }) => events.filter((e) => e.encounterId === where.encounterId && e.facilityId === where.facilityId && (e.payloadJson as any).namespace === "inpatientNursingAssessmentV1")),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: "rn-1", firstName: "Renee", lastName: "Nurse" }) },
      userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: "RN" } }]) },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    const service = new EncountersService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
    return { service, prisma, events };
  }

  it("saves only the inpatient namespace with server identity/time and immutable sessions", async () => {
    const { service, prisma, events } = harness();
    const forged: any = { status: "SAVED", narrative: "stable", authorUserId: "attacker", authoredAt: "1999-01-01" };
    const first = await service.saveInpatientNursingAssessment("fac-1", "enc-1", forged, "rn-1");
    const second = await service.saveInpatientNursingAssessment("fac-1", "enc-1", { status: "SAVED", narrative: "next" }, "rn-1");
    expect(first.assessment.authorUserId).toBe("rn-1");
    expect(first.assessment.authoredAt).not.toBe("1999-01-01");
    expect(first.assessment.sessionId).not.toBe(second.assessment.sessionId);
    expect(events).toHaveLength(2);
    expect(events[0].payloadJson.snapshot.narrative).toBe("stable");
    expect(events[0].payloadJson.namespace).toBe("inpatientNursingAssessmentV1");
    expect(events[0].eventType).toBe(EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED);
    expect(prisma.encounter.update.mock.calls[0][0].data.nursingAssessment.erNursingReassessmentV1).toEqual({ narrative: "legacy" });
  });

  it("enforces care setting and returns ER legacy data separately from filtered history", async () => {
    const h = harness();
    await h.service.saveInpatientNursingAssessment("fac-1", "enc-1", { status: "SAVED" }, "rn-1");
    const history = await h.service.listInpatientNursingAssessmentEvents("fac-1", "enc-1");
    expect(history.entries).toHaveLength(1);
    expect(history.legacyCompatibility[0]).toMatchObject({ compatibility: "LEGACY_ER_NAMESPACE_READ_ONLY" });
    const ed = harness({ ...encounter, type: EncounterType.EMERGENCY });
    await expect(ed.service.saveInpatientNursingAssessment("fac-1", "enc-1", { status: "SAVED" }, "rn-1")).rejects.toBeInstanceOf(BadRequestException);
  });
});
