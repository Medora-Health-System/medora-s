import { NotFoundException } from "@nestjs/common";
import { BillingLedgerReadinessService } from "./billing-ledger-readiness.service";

jest.mock("../billing/claim-coverage-resolution.util", () => ({
  resolvePrimaryCoverage: jest.fn().mockResolvedValue({ ok: true, coverage: {} }),
}));

import { resolvePrimaryCoverage } from "../billing/claim-coverage-resolution.util";

const hybridFacility = {
  billingClassificationMode: "HYBRID_UC_ED" as const,
  billingSiteType: "HYBRID" as const,
  allowedEncounterBillingClassifications: ["URGENT_CARE", "EMERGENCY_DEPARTMENT"],
  allowUrgentCareToEmergencyUpgrade: true,
  requireUcToEdPatientAcknowledgement: true,
  showEncounterBillingControls: true,
  billingLegalName: "Hospital Cardinale",
  billingAddressLine1: "1 Rue Main",
  billingCity: "Port-au-Prince",
  billingStateProvince: "Ouest",
  billingPostalCode: "6110",
  billingCountry: "Haiti",
  billingNpi: "1234567890",
  taxIdEin: "12-3456789",
};

describe("BillingLedgerReadinessService (19UCED.4)", () => {
  beforeEach(() => {
    (resolvePrimaryCoverage as jest.Mock).mockResolvedValue({ ok: true, coverage: {} });
  });

  it("returns professional and facility sections for ED", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: "OPEN",
          billingClassification: "EMERGENCY_DEPARTMENT",
          createdAt: new Date(),
          patientId: "p1",
          providerId: "u1",
          physicianAssignedUserId: "u2",
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
      billingEvent: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { billingSide: "PROFESSIONAL" },
          { billingSide: "FACILITY" },
        ]),
      },
    };
    const svc = new BillingLedgerReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });

    expect(result.professional.applies).toBe(true);
    expect(result.facility.applies).toBe(true);
    expect(result.previewOnly).toBe(true);
    expect(result.exportRoute).toBe("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(result.ledgerPreview.professionalLineCount).toBe(1);
    expect(result.ledgerPreview.facilityLineCount).toBe(1);
  });

  it("throws 404 when encounter missing", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn() },
      billingEvent: { count: jest.fn(), findMany: jest.fn() },
    };
    const svc = new BillingLedgerReadinessService(prisma as never);
    await expect(svc.getForEncounter({ encounterId: "e1", facilityId: "f1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not mutate billingClassification or create billing events", async () => {
    const encounterRow = {
      id: "e1",
      status: "OPEN",
      billingClassification: "URGENT_CARE",
      createdAt: new Date(),
      patientId: "p1",
      providerId: "u1",
      physicianAssignedUserId: null,
    };
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(encounterRow) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
      billingEvent: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ billingSide: "PROFESSIONAL" }]),
      },
    };
    const svc = new BillingLedgerReadinessService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(encounterRow.billingClassification).toBe("URGENT_CARE");
    expect(prisma.billingEvent.findMany).toHaveBeenCalled();
    expect(prisma.encounter.findFirst).toHaveBeenCalled();
  });

  it("excludes PHI-heavy fields from payload", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: "OPEN",
          billingClassification: "URGENT_CARE",
          createdAt: new Date(),
          patientId: "p1",
          providerId: "u1",
          physicianAssignedUserId: null,
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(0) },
      billingEvent: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new BillingLedgerReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(result).not.toHaveProperty("patientName");
    expect(result).not.toHaveProperty("diagnosisDescription");
    expect(result).not.toHaveProperty("payerName");
    expect(result).not.toHaveProperty("providerName");
    expect(result.facility.applies).toBe(false);
    expect(result.professional.applies).toBe(true);
  });
});
