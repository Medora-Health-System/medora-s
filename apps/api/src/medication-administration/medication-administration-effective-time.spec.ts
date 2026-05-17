import { AuditAction, MedicationMarAction, RoleCode } from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";

function makeAdminRow(overrides: Record<string, unknown> = {}) {
  const administeredAt = new Date("2026-05-16T14:00:00Z");
  const createdAt = new Date("2026-05-16T14:30:00Z");
  return {
    id: "mar-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    encounterId: "enc-1",
    orderItemId: "oi-1",
    administeredAt,
    createdAt,
    administeredByUserId: "user-rn",
    marAction: MedicationMarAction.administered,
    notes: null,
    effectiveAdministeredAt: null,
    effectiveAdministeredAtVersion: 0,
    encounter: {
      id: "enc-1",
      status: "OPEN",
      createdAt: new Date("2026-05-16T08:00:00Z"),
      admittedAt: null,
    },
    orderItem: {
      id: "oi-1",
      orderId: "ord-1",
      catalogItemType: "MEDICATION",
      catalogItemId: "med-1",
      status: "COMPLETED",
      createdAt: new Date("2026-05-16T10:00:00Z"),
      order: {
        id: "ord-1",
        status: "PENDING",
        createdAt: new Date("2026-05-16T10:00:00Z"),
        cancelledAt: null,
      },
    },
    ...overrides,
  };
}

describe("MedicationAdministrationService.setEffectiveAdministeredAt", () => {
  const auditLog = jest.fn().mockResolvedValue(undefined);

  function makeService(row: ReturnType<typeof makeAdminRow>) {
    const update = jest.fn().mockImplementation(async ({ data }) => ({
      ...row,
      ...data,
      effectiveAdministeredAt: data.effectiveAdministeredAt,
      effectiveAdministeredAtVersion: (row.effectiveAdministeredAtVersion ?? 0) + 1,
      administeredBy: { id: "user-rn", firstName: "A", lastName: "B" },
    }));
    const prisma = {
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(row),
        update,
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({ isControlled: false }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ medicationAdministration: { update } })
      ),
    };
    const audit = { log: auditLog };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    return { service, update, auditLog, row };
  }

  it("allows RN to adjust and writes audit without mutating administeredAt", async () => {
    const row = makeAdminRow();
    const { service, update, auditLog: log } = makeService(row);
    await service.setEffectiveAdministeredAt(
      "enc-1",
      "fac-1",
      "mar-1",
      {
        effectiveAdministeredTime: "2026-05-16T13:00:00.000Z",
        reason: "Given before charting",
      },
      "user-rn"
    );
    const updateArg = update.mock.calls[0][0];
    expect(updateArg.data.administeredAt).toBeUndefined();
    expect(updateArg.data.createdAt).toBeUndefined();
    expect(updateArg.data.effectiveAdministeredAt).toBeInstanceOf(Date);
    expect(log).toHaveBeenCalledWith(
      AuditAction.MEDICATION_ADMIN_TIME_ADJUSTED,
      "MEDICATION_ADMINISTRATION",
      expect.objectContaining({
        metadata: expect.objectContaining({
          controlledMedication: false,
          source: "MAR",
          reasonProvided: true,
        }),
      })
    );
  });

  it("rejects future timestamp", async () => {
    const { service } = makeService(makeAdminRow());
    await expect(
      service.setEffectiveAdministeredAt(
        "enc-1",
        "fac-1",
        "mar-1",
        { effectiveAdministeredTime: "2099-01-01T12:00:00.000Z", reason: "x" },
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("futur") });
  });

  it("requires reason for controlled medication", async () => {
    const row = makeAdminRow();
    const { service, update } = makeService(row);
    const prisma = (service as unknown as { prisma: { catalogMedication: { findUnique: jest.Mock } } }).prisma;
    prisma.catalogMedication.findUnique.mockResolvedValue({ isControlled: true });
    await expect(
      service.setEffectiveAdministeredAt(
        "enc-1",
        "fac-1",
        "mar-1",
        { effectiveAdministeredTime: "2026-05-16T13:55:00.000Z" },
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("motif") });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects wrong facility row (not found)", async () => {
    const row = makeAdminRow({ facilityId: "other-fac" });
    const { service } = makeService(row);
    const prisma = (service as unknown as { prisma: { medicationAdministration: { findFirst: jest.Mock } } })
      .prisma;
    prisma.medicationAdministration.findFirst.mockResolvedValue(null);
    await expect(
      service.setEffectiveAdministeredAt(
        "enc-1",
        "fac-1",
        "mar-1",
        { effectiveAdministeredTime: "2026-05-16T13:00:00.000Z", reason: "ok reason here" },
        "user-rn"
      )
    ).rejects.toMatchObject({ message: expect.stringContaining("introuvable") });
  });

  it("allows infusion START MAR effective time without mutating administeredAt", async () => {
    const row = makeAdminRow({
      notes: "Perfusion IV — début",
      infusionPhase: "INFUSION_START",
    });
    const { service, update } = makeService(row);
    await service.setEffectiveAdministeredAt(
      "enc-1",
      "fac-1",
      "mar-1",
      {
        effectiveAdministeredTime: "2026-05-16T13:00:00.000Z",
        reason: "Started at bedside before charting",
      },
      "user-rn"
    );
    expect(update.mock.calls[0][0].data.administeredAt).toBeUndefined();
  });

  it("allows infusion stop terminal MAR effective time without mutating administeredAt", async () => {
    const row = makeAdminRow({ notes: "Perfusion IV terminée — durée : 10 min" });
    const { service, update, auditLog: log } = makeService(row);
    await service.setEffectiveAdministeredAt(
      "enc-1",
      "fac-1",
      "mar-1",
      {
        effectiveAdministeredTime: "2026-05-16T13:00:00.000Z",
        reason: "Stop documented at bedside before charting",
      },
      "user-rn"
    );
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0].data.administeredAt).toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({ infusionEvent: true }),
      })
    );
  });

  it("allows INFUSION_STOP phase row with infusionPhase enum", async () => {
    const row = makeAdminRow({
      notes: "Perfusion IV terminée — durée : 45 min",
      infusionPhase: "INFUSION_STOP",
    });
    const { service, update, auditLog: log } = makeService(row);
    await service.setEffectiveAdministeredAt(
      "enc-1",
      "fac-1",
      "mar-1",
      {
        effectiveAdministeredTime: "2026-05-16T13:30:00.000Z",
        reason: "Delayed documentation correction",
      },
      "user-rn"
    );
    expect(update).toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        metadata: expect.objectContaining({
          infusionEvent: true,
          infusionPhase: "INFUSION_STOP",
        }),
      })
    );
  });

  it("rejects adjustment when provider documentation is signed", async () => {
    const row = makeAdminRow({
      encounter: {
        id: "enc-1",
        status: "OPEN",
        providerDocumentationStatus: "SIGNED",
        createdAt: new Date("2026-05-16T08:00:00Z"),
        admittedAt: null,
      },
    });
    const { service, update } = makeService(row);
    await expect(
      service.setEffectiveAdministeredAt(
        "enc-1",
        "fac-1",
        "mar-1",
        {
          effectiveAdministeredTime: "2026-05-16T13:00:00.000Z",
          reason: "Delayed documentation correction",
        },
        "user-rn"
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining("signée"),
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects large backdate with short reason using clear message", async () => {
    const row = makeAdminRow({
      createdAt: new Date("2026-05-18T14:30:00Z"),
    });
    const { service, update } = makeService(row);
    await expect(
      service.setEffectiveAdministeredAt(
        "enc-1",
        "fac-1",
        "mar-1",
        {
          effectiveAdministeredTime: "2026-05-16T10:00:00.000Z",
          reason: "too short",
        },
        "user-rn"
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining("motif détaillé"),
    });
    expect(update).not.toHaveBeenCalled();
  });
});
