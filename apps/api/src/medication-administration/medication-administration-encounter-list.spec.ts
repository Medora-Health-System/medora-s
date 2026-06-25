import { NotFoundException } from "@nestjs/common";
import { MedicationAdministrationService } from "./medication-administration.service";
import {
  ENCOUNTER_MAR_LIST_DEFAULT_LIMIT,
  ENCOUNTER_MAR_LOOKBACK_DAYS,
} from "../common/encounter-clinical-read-limits";
import { MEDICATION_ADMINISTRATION_ENCOUNTER_LIST_SELECT } from "./medication-administration-encounter-list.select";

function makeService() {
  const prisma = {
    encounter: {
      findFirst: jest.fn().mockResolvedValue({ id: "enc-1", facilityId: "fac-1" }),
    },
    medicationAdministration: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "mar-1",
          facilityId: "fac-1",
          patientId: "pat-1",
          encounterId: "enc-1",
          orderItemId: "item-1",
          administeredAt: new Date("2026-06-01T12:00:00.000Z"),
          administeredByUserId: "user-1",
          notes: null,
          createdAt: new Date("2026-06-01T12:00:00.000Z"),
          medicationLabelSnapshot: "Paracétamol",
          route: "PO",
          doseValue: null,
          doseUnit: null,
          administeredQuantity: null,
          billingQuantity: null,
          quantityUnit: null,
          ndc11Snapshot: null,
          ndcDisplaySnapshot: null,
          marAction: "ADMINISTERED",
          effectiveAdministeredAt: null,
          effectiveAdministeredAtSetAt: null,
          effectiveAdministeredAtSetByUserId: null,
          effectiveAdministeredAtReason: null,
          effectiveAdministeredAtVersion: 0,
          infusionPhase: null,
          infusionSessionKey: null,
          medicationDoseInstanceId: null,
          administeredBy: { id: "user-1", firstName: "Marie", lastName: "Infirmière" },
        },
      ]),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const audit = { log: jest.fn() };
  return {
    service: new MedicationAdministrationService(prisma as any, audit as any),
    prisma,
  };
}

describe("MedicationAdministrationService.findByEncounter", () => {
  it("returns MAR rows for encounter ordered by administeredAt desc", async () => {
    const { service, prisma } = makeService();
    await service.findByEncounter("enc-1", "fac-1");

    const query = prisma.medicationAdministration.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ encounterId: "enc-1", facilityId: "fac-1" });
    expect(query.orderBy).toEqual({ administeredAt: "desc" });
    expect(query.include?.administeredBy?.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
    });
  });

  it("throws when encounter is missing", async () => {
    const { service, prisma } = makeService();
    prisma.encounter.findFirst.mockResolvedValue(null);
    await expect(service.findByEncounter("enc-1", "fac-1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("preserves marAction resolution on list rows", async () => {
    const { service } = makeService();
    const rows = await service.findByEncounter("enc-1", "fac-1");
    expect(rows[0]?.marAction).toBe("administered");
  });
});

describe("encounter MAR read limits", () => {
  it("defaults to a bounded MAR history window", () => {
    expect(ENCOUNTER_MAR_LOOKBACK_DAYS).toBeGreaterThanOrEqual(30);
    expect(ENCOUNTER_MAR_LIST_DEFAULT_LIMIT).toBeGreaterThan(0);
  });
});
