import { BadRequestException } from "@nestjs/common";
import { TriageVitalsReadingStatus } from "@prisma/client";
import { TriageVitalsReadingService } from "./triage-vitals-reading.service";

describe("TriageVitalsReadingService", () => {
  const facilityId = "fac-1";
  const encounterId = "enc-1";
  const readingId = "read-1";
  const patientId = "pat-1";
  const userId = "user-1";

  function buildService(overrides?: {
    reading?: Record<string, unknown>;
    encounter?: Record<string, unknown> | null;
  }) {
    const reading = {
      id: readingId,
      encounterId,
      facilityId,
      patientId,
      triageId: "triage-1",
      status: TriageVitalsReadingStatus.ACTIVE,
      vitalsJson: { hr: 80, spo2: 97, temperatureSite: "ORAL" },
      measuredAt: new Date("2026-07-14T14:00:00.000Z"),
      recordedAt: new Date("2026-07-14T14:05:00.000Z"),
      recordedByUserId: userId,
      ...overrides?.reading,
    };
    const encounter =
      overrides?.encounter === null
        ? null
        : {
            id: encounterId,
            patientId,
            status: "OPEN",
            workflowState: "ACTIVE",
            providerDocumentationStatus: "DRAFT",
            ...overrides?.encounter,
          };

    const prisma: any = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
      },
      triageVitalsReading: {
        findFirst: jest.fn().mockResolvedValue(reading),
        update: jest.fn().mockImplementation(async ({ data }: any) => ({
          ...reading,
          ...data,
          recordedBy: { id: userId, firstName: "Ashby", lastName: "Chadis" },
        })),
      },
      triage: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      patient: {
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: userId,
          firstName: "Ashby",
          lastName: "Chadis",
          userRoles: [{ role: { code: "RN" } }],
        }),
      },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new TriageVitalsReadingService(prisma, audit as any);
    return { service, prisma, audit, reading };
  }

  it("updates vitals and measuredAt while preserving recordedAt attribution", async () => {
    const { service, prisma, audit } = buildService();
    const result = await service.updateReading(
      encounterId,
      readingId,
      facilityId,
      {
        vitalsJson: {
          hr: 88,
          spo2: 96,
          temperatureSite: "AXILLARY",
          oxygenDevice: "ROOM_AIR",
        },
        measuredAt: "2026-07-14T13:55:00.000Z",
      },
      userId
    );

    expect(prisma.triageVitalsReading.update).toHaveBeenCalled();
    const updateArg = prisma.triageVitalsReading.update.mock.calls[0][0];
    expect(updateArg.data.measuredAt.toISOString()).toBe("2026-07-14T13:55:00.000Z");
    expect(updateArg.data.vitalsJson.temperatureSite).toBe("AXILLARY");
    expect(updateArg.data.vitalsJson.oxygenDevice).toBe("ROOM_AIR");
    expect(updateArg.data.recordedAt).toBeUndefined();
    expect(updateArg.data.recordedByUserId).toBeUndefined();
    expect(audit.log).toHaveBeenCalled();
    expect(result.measuredAt).toBeDefined();
  });

  it("requires void reason and rejects OTHER without text", async () => {
    const { service } = buildService();
    await expect(
      service.voidReading(encounterId, readingId, facilityId, {}, userId)
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.voidReading(
        encounterId,
        readingId,
        facilityId,
        { voidReasonCode: "OTHER" },
        userId
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("voids an active reading with reason", async () => {
    const { service, prisma, audit } = buildService();
    const result = await service.voidReading(
      encounterId,
      readingId,
      facilityId,
      { voidReasonCode: "ENTERED_IN_ERROR" },
      userId
    );
    expect(result.status).toBe(TriageVitalsReadingStatus.VOIDED);
    expect(prisma.triageVitalsReading.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: TriageVitalsReadingStatus.VOIDED,
          voidReasonCode: "ENTERED_IN_ERROR",
        }),
      })
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.anything(),
      "TRIAGE_VITALS_READING",
      expect.objectContaining({
        metadata: expect.objectContaining({ action: "VITALS_READING_VOID" }),
      })
    );
  });

  it("blocks edit on closed encounter", async () => {
    const { service } = buildService({
      encounter: { status: "CLOSED", workflowState: "CLOSED" },
    });
    await expect(
      service.updateReading(
        encounterId,
        readingId,
        facilityId,
        { vitalsJson: { hr: 70 } },
        userId
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
