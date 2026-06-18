import { EncounterStatus, EncounterType } from "@prisma/client";
import { ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import {
  EmergencyEncountersArchiveService,
} from "./emergency-encounters-archive.service";

describe("EmergencyEncountersArchiveService (MEDUI.ED.LIFECYCLE.7A)", () => {
  const facilityId = "fac-er-1";

  function buildClosedSignedEncounter(overrides: Record<string, unknown> = {}) {
    return {
      id: "enc-closed-1",
      status: EncounterStatus.CLOSED,
      type: EncounterType.EMERGENCY,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      dischargedAt: new Date("2026-06-01T14:00:00.000Z"),
      chiefComplaint: "Chest pain",
      providerDocumentationStatus: "SIGNED",
      billingFinalizationStatus: "READY",
      billingReadinessSnapshotJson: { isReady: true },
      dischargeSummaryJson: {
        dischargeMode: ED_DISCHARGE_MODE_HOME,
        nursingDischargeSummary: "Done",
      },
      admissionSummaryJson: null,
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "Done" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-06-01T14:00:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
      workflowState: null,
      providerNote: "Stable",
      treatmentPlan: "Discharge home",
      patient: {
        id: "pat-1",
        firstName: "Marie",
        lastName: "Joseph",
        dob: new Date("1990-01-01"),
        sexAtBirth: "F",
        mrn: "MRN-100",
        phone: "555-0100",
      },
      triage: { chiefComplaint: "Chest pain" },
      facility: { name: "Clinique Medora" },
      _count: { diagnoses: 1 },
      ...overrides,
    };
  }

  it("returns closed signed ED encounters for facility regardless of certification", async () => {
    const certified = buildClosedSignedEncounter();
    const billingNotReady = buildClosedSignedEncounter({
      id: "enc-billing-blocked",
      billingReadinessSnapshotJson: { isReady: false },
      billingFinalizationStatus: "NOT_READY",
      _count: { diagnoses: 0 },
    });
    const findMany = jest.fn().mockResolvedValue([certified, billingNotReady]);
    const count = jest.fn().mockResolvedValue(2);
    const prisma = { encounter: { findMany, count } } as never;

    const service = new EmergencyEncountersArchiveService(prisma);
    const result = await service.listArchiveEncounters({ facilityId });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId,
          status: EncounterStatus.CLOSED,
          type: EncounterType.EMERGENCY,
          providerDocumentationStatus: "SIGNED",
        }),
      })
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.certification.allEncountersEligible).toBe(true);
    expect(result.rows[1]?.certification.allEncountersEligible).toBe(false);
    expect(result.rows[1]?.certification.billingReady).toBe(false);
  });

  it("applies search and date filters in query", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { encounter: { findMany, count } } as never;

    const service = new EmergencyEncountersArchiveService(prisma);
    await service.listArchiveEncounters({
      facilityId,
      search: "marie",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      limit: 50,
      offset: 10,
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        take: 50,
        skip: 10,
      })
    );
  });

  it("caps max limit and defaults to bounded page size", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { encounter: { findMany, count } } as never;
    const service = new EmergencyEncountersArchiveService(prisma);

    const defaulted = await service.listArchiveEncounters({ facilityId });
    expect(defaulted.limit).toBe(EmergencyEncountersArchiveService.DEFAULT_LIMIT);

    await service.listArchiveEncounters({ facilityId, limit: 999 });
    expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: EmergencyEncountersArchiveService.MAX_LIMIT }));
  });

  it("does not return unsigned closed encounters from prisma query", async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { encounter: { findMany, count } } as never;
    const service = new EmergencyEncountersArchiveService(prisma);
    await service.listArchiveEncounters({ facilityId });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ providerDocumentationStatus: "SIGNED" }),
      })
    );
  });
});
