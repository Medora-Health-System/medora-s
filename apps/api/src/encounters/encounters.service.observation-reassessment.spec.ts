/**
 * Phase 13G-B — observation / short-stay reassessment (`appendObservationReassessment`).
 *
 * Invariants:
 * - OPEN INPATIENT + observation care level → append `NURSING_ASSESSMENT_SAVED` with observation payload.
 * - CLOSED encounter, non-inpatient, or non-observation care level → rejected before write.
 * - Role gate: RN path requires RN/ADMIN; PROVIDER path requires PROVIDER/ADMIN.
 * - Audit metadata is PHI-safe (flags + role code only).
 */

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterClinicalEventType } from "@prisma/client";
import { OBSERVATION_REASSESSMENT_EVENT_SOURCE } from "@medora/shared";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";

const facilityId = "fac-1";
const encounterId = "enc-1";
const userId = "user-1";

const baseDto = {
  role: "PROVIDER" as const,
  patientStatus: "unchanged" as const,
  symptomsReviewed: true,
  vitalsReviewed: true,
  resultsReviewed: true,
  painControlled: true,
  continueObservation: true,
  readyForDischarge: false,
  transferConsidered: false,
};

const openInpatientObservationEncounter = {
  id: encounterId,
  patientId: "pat-1",
  type: "INPATIENT",
  status: "OPEN",
  workflowState: "IN_TREATMENT",
  admittedAt: null as Date | null,
  admissionSummaryJson: { careLevel: "Observation" } as unknown,
};

function buildMocks(encounterRow: typeof openInpatientObservationEncounter | null, userRoleCodes: string[]) {
  const encounterClinicalEventCreate = jest.fn().mockResolvedValue({
    id: "clinical-ev-1",
    createdAt: new Date("2026-05-01T10:00:00.000Z"),
  });
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue(encounterRow),
    },
    userRole: {
      findMany: jest.fn().mockImplementation(async () => userRoleCodes.map((code) => ({ role: { code } }))),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: userId, firstName: "Alex", lastName: "Test" }),
    },
    encounterClinicalEvent: {
      create: encounterClinicalEventCreate,
    },
  };
  const audit = { log: auditLog };
  const trackboard = {
    getOperationalAggregatesForEncounterIds: jest.fn().mockResolvedValue(new Map()),
  };
  return { prisma, audit, trackboard, encounterClinicalEventCreate, auditLog };
}

describe("EncountersService.appendObservationReassessment (13G-B)", () => {
  it("appends NURSING_ASSESSMENT_SAVED with observation discriminator for PROVIDER", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate, auditLog } = buildMocks(
      openInpatientObservationEncounter,
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    const res = await svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId);

    expect(encounterClinicalEventCreate).toHaveBeenCalledTimes(1);
    const createArg = encounterClinicalEventCreate.mock.calls[0]![0].data as Record<string, unknown>;
    expect(createArg.eventType).toBe(EncounterClinicalEventType.NURSING_ASSESSMENT_SAVED);
    expect(createArg.facilityId).toBe(facilityId);
    expect(createArg.encounterId).toBe(encounterId);
    expect(createArg.patientId).toBe("pat-1");
    expect(createArg.createdByUserId).toBe(userId);
    const payload = createArg.payloadJson as Record<string, unknown>;
    expect(payload.source).toBe(OBSERVATION_REASSESSMENT_EVENT_SOURCE);
    const obs = payload.observationReassessmentV1 as Record<string, unknown>;
    expect(obs.role).toBe("PROVIDER");
    expect(obs.patientStatus).toBe("unchanged");

    expect(auditLog).toHaveBeenCalledTimes(1);
    const meta = auditLog.mock.calls[0]![2].metadata as Record<string, unknown>;
    expect(meta).toEqual({ observationReassessmentV1: true, role: "PROVIDER" });
    expect(JSON.stringify(meta).toLowerCase()).not.toContain("alex");

    expect(res).toMatchObject({ ok: true, id: "clinical-ev-1", createdAt: "2026-05-01T10:00:00.000Z" });
  });

  it("allows RN role when dto.role is RN", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      openInpatientObservationEncounter,
      ["RN"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await svc.appendObservationReassessment(
      facilityId,
      encounterId,
      { ...baseDto, role: "RN" },
      userId
    );

    expect(encounterClinicalEventCreate).toHaveBeenCalledTimes(1);
    const payload = encounterClinicalEventCreate.mock.calls[0]![0].data.payloadJson as Record<string, unknown>;
    expect((payload.observationReassessmentV1 as Record<string, unknown>).role).toBe("RN");
  });

  it("rejects CLOSED encounter", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      { ...openInpatientObservationEncounter, status: "CLOSED", workflowState: "CLOSED" },
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId)).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("rejects non-INPATIENT encounter", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      { ...openInpatientObservationEncounter, type: "EMERGENCY" },
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId)).rejects.toThrow(
      /Observation reassessment applies only to inpatient encounters/i
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("rejects when encounter is not in an observation / short-stay workflow lane (no anchor, empty packet)", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      {
        ...openInpatientObservationEncounter,
        admittedAt: null,
        admissionSummaryJson: {},
      },
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId)).rejects.toThrow(
      /Observation reassessment is only available for an open observation or short-stay stay/i
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("allows PROVIDER when admittedAt is set even if careLevel is not observation wording", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      {
        ...openInpatientObservationEncounter,
        admittedAt: new Date("2026-05-01T09:00:00.000Z"),
        admissionSummaryJson: { careLevel: "Soins généraux (salle)" },
      },
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId);

    expect(encounterClinicalEventCreate).toHaveBeenCalledTimes(1);
  });

  it("rejects RN dto when caller is only PROVIDER", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      openInpatientObservationEncounter,
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(
      svc.appendObservationReassessment(facilityId, encounterId, { ...baseDto, role: "RN" }, userId)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("rejects PROVIDER dto when caller is only RN", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      openInpatientObservationEncounter,
      ["RN"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId)).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("rejects missing user id", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(
      openInpatientObservationEncounter,
      ["PROVIDER"]
    );
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, undefined)).rejects.toThrow(
      /Authentication required to save observation reassessment/i
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("returns NotFound when encounter missing", async () => {
    const { prisma, audit, trackboard, encounterClinicalEventCreate } = buildMocks(null, ["PROVIDER"]);
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await expect(svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId)).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(encounterClinicalEventCreate).not.toHaveBeenCalled();
  });

  it("logs ENCOUNTER_UPDATE audit action", async () => {
    const { prisma, audit, trackboard, auditLog } = buildMocks(openInpatientObservationEncounter, ["ADMIN"]);
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      trackboard as never,
      createMockBedBoardService() as never
    );

    await svc.appendObservationReassessment(facilityId, encounterId, baseDto, userId);

    expect(auditLog).toHaveBeenCalledWith(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", expect.any(Object));
  });
});
