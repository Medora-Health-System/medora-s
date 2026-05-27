import { NotFoundException } from "@nestjs/common";
import { EncounterStatus, EncounterType } from "@prisma/client";
import { TriageCarryForwardService } from "./triage-carry-forward.service";

describe("TriageCarryForwardService", () => {
  const facilityId = "facility-1";
  const patientId = "patient-1";
  const currentEncounterId = "enc-current";
  const priorEncounterId = "enc-prior";

  function buildService(overrides?: {
    encounter?: Record<string, unknown> | null;
    priorCandidates?: Array<Record<string, unknown>>;
  }) {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(overrides?.encounter ?? null),
        findMany: jest.fn().mockResolvedValue(overrides?.priorCandidates ?? []),
      },
    };
    const service = new TriageCarryForwardService(prisma as never, audit as never);
    return { service, prisma, audit };
  }

  it("returns carry-forward from most recent prior ED triage", async () => {
    const { service } = buildService({
      encounter: {
        id: currentEncounterId,
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        triage: null,
      },
      priorCandidates: [
        {
          id: priorEncounterId,
          patientId,
          facilityId,
          createdAt: new Date("2025-12-01T12:00:00.000Z"),
          triage: {
            updatedAt: new Date("2025-12-01T14:00:00.000Z"),
            chiefComplaint: "Prior chest pain",
            esi: 3,
            vitalsJson: {
              allergyNote: "Penicillin",
              medoraErTriageV1: {
                pastMedicalHistory: "HTN",
                painScale0to10: "7",
              },
            },
          },
        },
      ],
    });

    const result = await service.resolveForEncounter(currentEncounterId, facilityId, "user-rn");
    expect(result.available).toBe(true);
    expect(result.meta?.sourceEncounterId).toBe(priorEncounterId);
    expect(result.allergyNote).toBe("Penicillin");
    expect(result.fields?.pastMedicalHistory).toBe("HTN");
    expect(result.fields).not.toHaveProperty("painScale0to10");
    expect(result.meta?.reviewStatus).toBe("pending_review");
  });

  it("does not carry forward when current encounter already has triage", async () => {
    const { service } = buildService({
      encounter: {
        id: currentEncounterId,
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        triage: { id: "triage-1" },
      },
    });

    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result).toEqual({ available: false });
  });

  it("excludes cancelled prior encounters via query filter", async () => {
    const { service, prisma } = buildService({
      encounter: {
        id: currentEncounterId,
        patientId,
        facilityId,
        type: EncounterType.EMERGENCY,
        status: EncounterStatus.OPEN,
        triage: null,
      },
    });

    await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: EncounterStatus.CANCELLED },
          id: { not: currentEncounterId },
          type: EncounterType.EMERGENCY,
        }),
      })
    );
  });

  it("throws when encounter is missing", async () => {
    const { service } = buildService({ encounter: null });
    await expect(service.resolveForEncounter(currentEncounterId, facilityId)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });
});
