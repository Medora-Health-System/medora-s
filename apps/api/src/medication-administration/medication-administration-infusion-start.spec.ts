import { MedicationAdministrationInfusionPhase, MedicationMarAction, RoleCode } from "@prisma/client";
import { MedicationAdministrationService } from "./medication-administration.service";
import { INFUSION_START_MAR_NOTE_PREFIX } from "@medora/shared";

function makeEncounter() {
  return {
    id: "enc-1",
    facilityId: "fac-1",
    patientId: "pat-1",
    status: "OPEN",
    createdAt: new Date("2026-05-16T08:00:00Z"),
    admittedAt: null,
    vitals: null,
    nursingAssessment: null,
    triage: { vitalsJson: null },
  };
}

function makeInfusionOrderItem() {
  return {
    id: "oi-vanco",
    orderId: "ord-1",
    catalogItemType: "MEDICATION",
    catalogItemId: "cat-vanco",
    status: "IN_PROGRESS",
    lifecycleState: "IN_PROGRESS",
    quantity: null,
    route: "IVPB",
    strength: "1 g",
    notes: null,
    order: {
      id: "ord-1",
      encounterId: "enc-1",
      facilityId: "fac-1",
      type: "MEDICATION",
      status: "PENDING",
    },
  };
}

describe("MedicationAdministrationService.createInfusionStartMar", () => {
  it("creates INFUSION_START MAR with skip billing and line completion", async () => {
    const encounter = makeEncounter();
    const orderItem = makeInfusionOrderItem();
    const marCreate = jest.fn().mockResolvedValue({
      id: "mar-start-1",
      infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
      infusionSessionKey: "sess-1",
      notes: INFUSION_START_MAR_NOTE_PREFIX,
      administeredAt: new Date("2026-05-16T14:00:00Z"),
      marAction: MedicationMarAction.administered,
      administeredBy: { id: "user-rn", firstName: "A", lastName: "B" },
    });
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(encounter) },
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: marCreate,
        aggregate: jest.fn(),
      },
      orderItem: {
        findFirst: jest.fn().mockResolvedValue(orderItem),
      },
      catalogMedication: {
        findUnique: jest.fn().mockResolvedValue({
          displayNameEn: "Vancomycin",
          displayNameFr: null,
          name: "Vancomycin",
          code: "VANCO",
          strength: "1 g",
          ndc11: null,
          ndcDisplay: null,
          billingUnitType: null,
          therapeuticClass: null,
          billingClass: null,
        }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.RN } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          medicationAdministration: { create: marCreate },
          orderItem: { update: jest.fn() },
          orderEvent: { create: jest.fn() },
        };
        return fn(tx);
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new MedicationAdministrationService(prisma as never, audit as never);

    const startedAt = new Date("2026-05-16T14:00:00Z");
    const row = await service.createInfusionStartMar("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-vanco",
      infusionSessionKey: "sess-1",
      startedAt,
      route: "IVPB",
    });

    expect(row.id).toBe("mar-start-1");
    expect(marCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
          infusionSessionKey: "sess-1",
          administeredAt: startedAt,
          notes: INFUSION_START_MAR_NOTE_PREFIX,
        }),
      })
    );
  });

  it("returns existing START MAR for same session (idempotent)", async () => {
    const existing = {
      id: "mar-existing",
      infusionPhase: MedicationAdministrationInfusionPhase.INFUSION_START,
      administeredBy: { id: "user-rn", firstName: "A", lastName: "B" },
    };
    const prisma = {
      medicationAdministration: {
        findFirst: jest.fn().mockResolvedValue({ id: "mar-existing" }),
        findFirstOrThrow: jest.fn().mockResolvedValue(existing),
      },
    };
    const audit = { log: jest.fn() };
    const service = new MedicationAdministrationService(prisma as never, audit as never);
    const row = await service.createInfusionStartMar("enc-1", "fac-1", "user-rn", {
      orderItemId: "oi-vanco",
      infusionSessionKey: "sess-1",
      startedAt: new Date(),
    });
    expect(row.id).toBe("mar-existing");
  });
});
