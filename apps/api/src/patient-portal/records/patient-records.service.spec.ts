import { NotFoundException } from "@nestjs/common";
import { PatientRecordsService } from "./patient-records.service";

describe("PatientRecordsService", () => {
  const access = {
    portalAccountId: "account-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  it("lists visits with both facilityId and patientId constraints", async () => {
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    await service.listVisits(access, {});

    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", patientId: "patient-a" },
      })
    );
  });

  it("loads a visit with id + facilityId + patientId and returns 404 otherwise", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as any;
    const audit = { record: jest.fn() } as any;
    const service = new PatientRecordsService(prisma, audit);

    await expect(service.getVisit(access, "encounter-b", {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encounter.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "encounter-b",
          facilityId: "facility-a",
          patientId: "patient-a",
        },
      })
    );
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("projects allergies from the patient longitudinal profile without exposing provenance or staff ids", async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: "patient-a",
          clinicalHistoryProfileJson: {
            version: "19T.3",
            updatedAt: "2026-09-01T00:00:00.000Z",
            updatedBy: "staff-secret",
            provenance: { allergies: { reviewerId: "staff-secret" } },
            allergies: {
              entries: [
                {
                  id: "alg-1",
                  substance: "Penicillin",
                  reaction: "Hives",
                  severity: "MODERATE",
                  verificationStatus: "CLINICIAN_VERIFIED",
                  status: "ACTIVE",
                  updatedByUserId: "staff-secret",
                },
              ],
            },
          },
        }),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    const result = await service.listAllergies(access, {});

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "patient-a", facilityId: "facility-a" },
      })
    );
    expect(result.active).toEqual([
      expect.objectContaining({
        id: "alg-1",
        substance: "Penicillin",
        reaction: "Hives",
        severity: "MODERATE",
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("staff-secret");
    expect(audit.record).toHaveBeenCalledWith(
      "PATIENT_PORTAL_ALLERGY_VIEW",
      "ALLERGY_LIST",
      expect.objectContaining({ patientId: "patient-a", facilityId: "facility-a" })
    );
  });

  it("represents clean NKDA as not present", async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: "patient-a",
          clinicalHistoryProfileJson: {
            allergies: { nkda: true, entries: [] },
          },
        }),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    const result = await service.listAllergies(access, {});
    expect(result).toEqual(
      expect.objectContaining({
        availability: "NOT_PRESENT",
        nkda: true,
        dataConflict: false,
        active: [],
      })
    );
  });

  it("never reports NKDA when active allergy content conflicts with the NKDA flag", async () => {
    const prisma = {
      patient: {
        findFirst: jest.fn().mockResolvedValue({
          id: "patient-a",
          clinicalHistoryProfileJson: {
            allergies: {
              nkda: true,
              entries: [
                {
                  id: "alg-1",
                  substance: "Penicillin",
                  status: "ACTIVE",
                },
              ],
            },
          },
        }),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    const result = await service.listAllergies(access, {});

    expect(result).toEqual(
      expect.objectContaining({
        availability: "PRESENT",
        nkda: false,
        dataConflict: true,
      })
    );
    expect(result.active).toHaveLength(1);
  });

  it("lists immunizations using facilityId + patientId and returns patient-safe vaccine data", async () => {
    const prisma = {
      vaccineAdministration: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "vac-1",
            encounterId: "enc-1",
            doseNumber: 2,
            lotNumber: "LOT123",
            administeredAt: new Date("2026-08-01T12:00:00.000Z"),
            nextDueAt: null,
            vaccineCatalog: {
              code: "FLU",
              name: "Influenza vaccine",
              description: null,
              manufacturer: "Example Manufacturer",
            },
          },
        ]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientRecordsService(prisma, audit);

    const result = await service.listImmunizations(access, {});

    expect(prisma.vaccineAdministration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { facilityId: "facility-a", patientId: "patient-a" },
      })
    );
    expect(result.immunizations[0]).toEqual(
      expect.objectContaining({
        id: "vac-1",
        vaccineCode: "FLU",
        doseNumber: 2,
        administeredAt: "2026-08-01T12:00:00.000Z",
      })
    );
  });
});
