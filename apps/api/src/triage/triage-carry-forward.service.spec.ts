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
    clinicalHistoryProfileJson?: unknown;
  }) {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(overrides?.encounter ?? null),
        findMany: jest.fn().mockResolvedValue(overrides?.priorCandidates ?? []),
      },
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          clinicalHistoryProfileJson: overrides?.clinicalHistoryProfileJson ?? null,
        }),
      },
    };
    const service = new TriageCarryForwardService(prisma as never, audit as never);
    return { service, prisma, audit };
  }

  const openEdEncounter = {
    id: currentEncounterId,
    patientId,
    facilityId,
    type: EncounterType.EMERGENCY,
    status: EncounterStatus.OPEN,
    triage: null,
  };

  const patientProfileJson = {
    version: "19T.3",
    updatedAt: "2026-05-18T12:00:00.000Z",
    allergies: { allergyNote: "Profile allergy" },
    provenance: {
      allergies: {
        sourceType: "reviewed_triage",
        sourceEncounterId: priorEncounterId,
        sourceEncounterDate: "2025-11-01T00:00:00.000Z",
        lastReviewedAt: "2026-05-18T12:00:00.000Z",
      },
    },
  };

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
    expect(result.hydrationSource).toBe("prior_encounter");
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

  it("returns available false when no profile and no prior triage history", async () => {
    const { service } = buildService({
      encounter: openEdEncounter,
      priorCandidates: [],
      clinicalHistoryProfileJson: null,
    });
    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result).toEqual({ available: false });
  });

  it("returns hydrationSource patient_profile when profile has content", async () => {
    const { service, prisma } = buildService({
      encounter: openEdEncounter,
      priorCandidates: [
        {
          id: priorEncounterId,
          patientId,
          facilityId,
          createdAt: new Date("2025-12-01T12:00:00.000Z"),
          triage: {
            updatedAt: new Date("2025-12-01T14:00:00.000Z"),
            vitalsJson: {
              allergyNote: "Prior only",
              medoraErTriageV1: { pastMedicalHistory: "Prior HTN" },
            },
          },
        },
      ],
      clinicalHistoryProfileJson: patientProfileJson,
    });

    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result.available).toBe(true);
    expect(result.hydrationSource).toBe("patient_profile");
    expect(result.allergyNote).toBe("Profile allergy");
    expect(prisma.encounter.findMany).not.toHaveBeenCalled();
  });

  it("falls back to prior encounter when profile is null", async () => {
    const { service } = buildService({
      encounter: openEdEncounter,
      clinicalHistoryProfileJson: null,
      priorCandidates: [
        {
          id: priorEncounterId,
          patientId,
          facilityId,
          createdAt: new Date("2025-12-01T12:00:00.000Z"),
          triage: {
            updatedAt: new Date("2025-12-01T14:00:00.000Z"),
            vitalsJson: {
              allergyNote: "Prior allergy",
              medoraErTriageV1: { pastMedicalHistory: "Prior HTN" },
            },
          },
        },
      ],
    });

    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result.available).toBe(true);
    expect(result.hydrationSource).toBe("prior_encounter");
    expect(result.meta?.sourceEncounterId).toBe(priorEncounterId);
  });

  it("malformed profile JSON falls back to prior encounter without throwing", async () => {
    const { service } = buildService({
      encounter: openEdEncounter,
      clinicalHistoryProfileJson: { invalid: true },
      priorCandidates: [
        {
          id: priorEncounterId,
          patientId,
          facilityId,
          createdAt: new Date("2025-12-01T12:00:00.000Z"),
          triage: {
            updatedAt: new Date("2025-12-01T14:00:00.000Z"),
            vitalsJson: {
              allergyNote: "Prior allergy",
              medoraErTriageV1: {},
            },
          },
        },
      ],
    });

    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result.available).toBe(true);
    expect(result.hydrationSource).toBe("prior_encounter");
  });

  it("scopes patient profile lookup by facilityId", async () => {
    const { service, prisma } = buildService({
      encounter: openEdEncounter,
      clinicalHistoryProfileJson: patientProfileJson,
    });
    await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: { id: patientId, facilityId },
      select: { clinicalHistoryProfileJson: true },
    });
  });

  it("carry-forward audit metadata excludes clinical text", async () => {
    const { service, audit } = buildService({
      encounter: openEdEncounter,
      clinicalHistoryProfileJson: patientProfileJson,
    });
    await service.resolveForEncounter(currentEncounterId, facilityId, "user-rn");
    const metadata = audit.log.mock.calls[0]?.[2]?.metadata;
    expect(JSON.stringify(metadata)).not.toContain("Profile allergy");
    expect(metadata?.hydrationSource).toBe("patient_profile");
  });

  it("does not expose forbidden visit-specific fields in carry-forward response", async () => {
    const { service } = buildService({
      encounter: openEdEncounter,
      priorCandidates: [
        {
          id: priorEncounterId,
          patientId,
          facilityId,
          createdAt: new Date("2025-12-01T12:00:00.000Z"),
          triage: {
            updatedAt: new Date("2025-12-01T14:00:00.000Z"),
            vitalsJson: {
              allergyNote: "A",
              medoraErTriageV1: {
                pastMedicalHistory: "HTN",
                painScale0to10: "9",
                triageNarrative: "Should not forward",
              },
            },
          },
        },
      ],
    });
    const result = await service.resolveForEncounter(currentEncounterId, facilityId);
    expect(result.fields).not.toHaveProperty("painScale0to10");
    expect(result.fields).not.toHaveProperty("triageNarrative");
  });
});
