import { NotFoundException } from "@nestjs/common";
import { BillingExportReadinessService } from "./billing-export-readiness.service";

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

describe("BillingExportReadinessService (19UCED.3)", () => {
  beforeEach(() => {
    (resolvePrimaryCoverage as jest.Mock).mockResolvedValue({ ok: true, coverage: {} });
  });

  it("returns safe PHI-free payload for ED encounter", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: "OPEN",
          billingClassification: "EMERGENCY_DEPARTMENT",
          createdAt: new Date(),
          patientId: "p1",
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
      billingEvent: { count: jest.fn().mockResolvedValue(2) },
    };
    const svc = new BillingExportReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });

    expect(result.billingClassification).toBe("EMERGENCY_DEPARTMENT");
    expect(result.route).toBe("BOTH_PROFESSIONAL_AND_FACILITY");
    expect(result.previewOnly).toBe(true);
    expect(result).not.toHaveProperty("patientName");
    expect(result).not.toHaveProperty("diagnosisDescription");
    expect(result).not.toHaveProperty("payerName");
  });

  it("throws 404 when encounter missing", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn() },
      billingEvent: { count: jest.fn() },
    };
    const svc = new BillingExportReadinessService(prisma as never);
    await expect(svc.getForEncounter({ encounterId: "e1", facilityId: "f1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not mutate billingClassification", async () => {
    const encounterRow = {
      id: "e1",
      status: "OPEN",
      billingClassification: "URGENT_CARE",
      createdAt: new Date(),
      patientId: "p1",
    };
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(encounterRow) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
      billingEvent: { count: jest.fn().mockResolvedValue(1) },
    };
    const svc = new BillingExportReadinessService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(encounterRow.billingClassification).toBe("URGENT_CARE");
    expect(prisma.encounter.findFirst).toHaveBeenCalled();
    expect(prisma.diagnosis.count).toHaveBeenCalled();
  });

  it("returns no diagnosis text or payer details in payload", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          status: "OPEN",
          billingClassification: "URGENT_CARE",
          createdAt: new Date(),
          patientId: "p1",
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(0) },
      billingEvent: { count: jest.fn().mockResolvedValue(0) },
    };
    const svc = new BillingExportReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(result).not.toHaveProperty("diagnosisDescription");
    expect(result).not.toHaveProperty("diagnosisText");
    expect(result).not.toHaveProperty("payerName");
    expect(result).not.toHaveProperty("memberId");
    expect(result.missingItems).toContain("MISSING_DIAGNOSIS");
  });
});
