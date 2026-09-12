import { NotFoundException } from "@nestjs/common";
import { PatientDiagnosticResultsService } from "./patient-diagnostic-results.service";

describe("PatientDiagnosticResultsService", () => {
  const access = {
    portalAccountId: "account-a",
    sessionId: "session-a",
    patientId: "patient-a",
    facilityId: "facility-a",
  };

  it("queries diagnostics only through the authorized patient + facility order scope", async () => {
    const prisma = {
      order: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientDiagnosticResultsService(prisma, audit);

    await service.list(access, "LAB_TEST", {});

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          facilityId: "facility-a",
          patientId: "patient-a",
          cancelledAt: null,
        },
      })
    );
  });

  it("does not release an unverified result", async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "order-a",
            facilityId: "facility-a",
            patientId: "patient-a",
            encounterId: "enc-a",
            createdAt: new Date("2026-09-01T00:00:00Z"),
            items: [
              {
                id: "lab-a",
                catalogItemType: "LAB_TEST",
                manualLabel: "CBC",
                status: "COMPLETED",
                createdAt: new Date("2026-09-01T00:00:00Z"),
                completedAt: new Date("2026-09-01T01:00:00Z"),
                documentedCollectedAt: null,
                effectiveCollectedAt: null,
                documentedPerformedAt: null,
                effectivePerformedAt: null,
                result: {
                  id: "result-a",
                  resultText: "internal preliminary result",
                  resultData: {},
                  criticalValue: false,
                  verifiedAt: null,
                  effectiveResultedAt: null,
                  effectiveFinalizedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            ],
          },
        ]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientDiagnosticResultsService(prisma, audit);

    const listed = await service.list(access, "LAB_TEST", {});
    expect(listed.results).toEqual([]);

    await expect(service.get(access, "LAB_TEST", "lab-a", {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes embedded attachment payloads from patient resultData", async () => {
    const verifiedAt = new Date("2026-09-01T02:00:00Z");
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "order-a",
            facilityId: "facility-a",
            patientId: "patient-a",
            encounterId: "enc-a",
            createdAt: new Date("2026-09-01T00:00:00Z"),
            items: [
              {
                id: "lab-a",
                catalogItemType: "LAB_TEST",
                manualLabel: "CBC",
                status: "COMPLETED",
                createdAt: new Date(),
                completedAt: new Date(),
                documentedCollectedAt: null,
                effectiveCollectedAt: null,
                documentedPerformedAt: null,
                effectivePerformedAt: null,
                result: {
                  id: "result-a",
                  resultText: "WBC 8.1",
                  resultData: {
                    rows: [{ label: "WBC", value: "8.1" }],
                    attachments: [{ fileName: "raw.pdf", dataBase64: "SECRET_BYTES" }],
                  },
                  criticalValue: false,
                  verifiedAt,
                  effectiveResultedAt: verifiedAt,
                  effectiveFinalizedAt: null,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            ],
          },
        ]),
      },
    } as any;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as any;
    const service = new PatientDiagnosticResultsService(prisma, audit);

    const result = await service.get(access, "LAB_TEST", "lab-a", {});
    expect(result.resultData).toEqual({ rows: [{ label: "WBC", value: "8.1" }] });
  });
});
