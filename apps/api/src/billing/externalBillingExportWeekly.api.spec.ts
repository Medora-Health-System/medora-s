import { BadRequestException } from "@nestjs/common";
import { EncounterStatus } from "@prisma/client";
import { MAX_EXTERNAL_BILLING_WEEKLY_ENCOUNTER_COUNT, parseUtcWeekRange } from "@medora/shared";
import { ExternalBillingExportService } from "./external-billing-export.service";

describe("externalBillingExportWeekly API (MEDUI.BILLING.EXTERNAL_EXPORT.1)", () => {
  function buildService(encounterCount = 2) {
    const encounterIds = Array.from({ length: encounterCount }, (_, i) => `e${i + 1}`);
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue({ id: "f1", name: "Clinic" }) },
      encounter: {
        findMany: jest.fn().mockResolvedValue(encounterIds.map((id) => ({ id }))),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: "A", lastName: "B", email: "a@b.com" }) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const billingService = { getEncounterBillingExportRows: jest.fn().mockResolvedValue([]) };
    const svc = new ExternalBillingExportService(prisma as never, audit as never, billingService as never);
    (svc as any).buildEncounterPackage = jest.fn(async (_f: string, encounterId: string) => ({
      json: {
        patient: { patientId: "p1", mrn: "MRN-1" },
        encounter: { encounterId, status: EncounterStatus.CLOSED },
        diagnoses: [{ diagnosisId: "d1" }],
        lineItems: [{ lineId: "l1", medoraCode: "CODE", billingStatus: "official_validated", clinicalPayload: {} }],
        billingReadiness: { readyForExternalBilling: false },
      },
      csvRows: [],
      patient: { patientId: "p1" },
    }));
    return { svc, prisma };
  }

  it("weekly JSON export works", async () => {
    const { svc } = buildService();
    const out = await svc.exportWeeklyJson({
      facilityId: "f1",
      weekStart: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(out.exportType).toBe("weekly");
    expect(out.periodStart).toBe("2026-06-02");
    expect(out.periodEnd).toBe("2026-06-08");
    expect(out.certification).toBeDefined();
  });

  it("weekly CSV export works", async () => {
    const { svc } = buildService();
    const { csv, filename } = await svc.exportWeeklyCsv({
      facilityId: "f1",
      weekStart: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(csv).toContain("export_batch_id");
    expect(filename).toContain("weekly");
  });

  it("weekly range is exactly 7 days", () => {
    const range = parseUtcWeekRange("2026-06-02");
    expect(range.periodStart).toBe("2026-06-02");
    expect(range.periodEnd).toBe("2026-06-08");
    const ms = range.end.getTime() - range.start.getTime();
    expect(ms).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it("rejects weekly export over max encounter count", async () => {
    const { svc } = buildService(MAX_EXTERNAL_BILLING_WEEKLY_ENCOUNTER_COUNT + 1);
    await expect(
      svc.exportWeeklyJson({
        facilityId: "f1",
        weekStart: "2026-06-02",
        userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("facility scoped encounter query", async () => {
    const { svc, prisma } = buildService();
    await svc.exportWeeklyJson({
      facilityId: "f1",
      weekStart: "2026-06-02",
      userCtx: { userId: "u1", displayName: "User", role: "BILLING" },
    });
    expect(prisma.encounter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ facilityId: "f1", status: EncounterStatus.CLOSED }),
      })
    );
  });
});
