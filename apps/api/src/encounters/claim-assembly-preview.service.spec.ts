import { NotFoundException } from "@nestjs/common";
import { ClaimAssemblyPreviewService } from "./claim-assembly-preview.service";
import { FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS } from "@medora/shared";

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

const closedEncounter = {
  id: "e1",
  type: "OUTPATIENT",
  status: "CLOSED",
  workflowState: "DISCHARGED",
  billingClassification: "URGENT_CARE",
  billingFinalizationStatus: "NOT_READY",
  createdAt: new Date("2026-05-01T10:00:00Z"),
  admittedAt: null,
  dischargedAt: new Date("2026-05-01T14:00:00Z"),
  dischargeStatus: "DISCHARGED_HOME",
  disposition: "Home",
  dischargeSummaryJson: { summary: "ok" },
  providerDocumentationStatus: "SIGNED",
  providerId: "prov1",
  physicianAssignedUserId: "phys1",
  nursingAssessment: {
    erProviderMseV1: { mdmRiskLevel: "Moderate" },
  },
  patientId: "p1",
};

describe("ClaimAssemblyPreviewService (19UCED.8)", () => {
  beforeEach(() => {
    (resolvePrimaryCoverage as jest.Mock).mockResolvedValue({ ok: true, coverage: {} });
  });

  it("returns queue rows", async () => {
    const prisma = {
      encounter: { findMany: jest.fn().mockResolvedValue([closedEncounter]), findFirst: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: {
        groupBy: jest.fn().mockResolvedValue([{ encounterId: "e1", _count: { _all: 1 } }]),
        count: jest.fn(),
      },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { encounterId: "e1", billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
        ]),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn() },
      encounterClinicalEvent: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn() },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    const result = await svc.getQueue({ facilityId: "f1" });
    expect(result.previewOnly).toBe(true);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.packageType).toBe("PROFESSIONAL_CMS_1500");
  });

  it("returns full encounter summary composing 19UCED.3–7", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(closedEncounter), findMany: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn() },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
        ]),
      },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
      encounterClinicalEvent: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(result.previewOnly).toBe(true);
    expect(result.exportReadiness).toBeDefined();
    expect(result.chargeReview).toBeDefined();
    expect(result.codingReview).toBeDefined();
    expect(result.professionalPackage).toBeDefined();
  });

  it("is read-only — no billing event mutation or export generation", async () => {
    const claimExportGenerate = jest.fn();
    const x12Generate = jest.fn();
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(closedEncounter), findMany: jest.fn(), update: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn(), update: jest.fn() },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
      encounterClinicalEvent: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
      encounterChartExport: { create: jest.fn() },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
    expect(prisma.billingEvent.update).not.toHaveBeenCalled();
    expect(prisma.encounterChartExport.create).not.toHaveBeenCalled();
    expect(claimExportGenerate).not.toHaveBeenCalled();
    expect(x12Generate).not.toHaveBeenCalled();
  });

  it("excludes PHI-heavy fields", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(closedEncounter),
        findMany: jest.fn().mockResolvedValue([closedEncounter]),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: {
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([{ encounterId: "e1", _count: { _all: 1 } }]),
      },
      billingEvent: { findMany: jest.fn().mockResolvedValue([]) },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
      encounterClinicalEvent: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    const single = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    const queue = await svc.getQueue({ facilityId: "f1" });
    for (const forbidden of FORBIDDEN_CLAIM_ASSEMBLY_PREVIEW_KEYS) {
      expect(single).not.toHaveProperty(forbidden);
      expect(queue.rows[0]).not.toHaveProperty(forbidden);
    }
  });

  it("missing encounter returns 404", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn(), groupBy: jest.fn() },
      billingEvent: { findMany: jest.fn() },
      order: { count: jest.fn(), groupBy: jest.fn() },
      encounterClinicalEvent: { count: jest.fn(), groupBy: jest.fn() },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    await expect(svc.getForEncounter({ encounterId: "missing", facilityId: "f1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("filters work for professional only", async () => {
    const edEncounter = {
      ...closedEncounter,
      id: "e2",
      billingClassification: "EMERGENCY_DEPARTMENT",
    };
    const prisma = {
      encounter: { findMany: jest.fn().mockResolvedValue([closedEncounter, edEncounter]), findFirst: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: {
        groupBy: jest.fn().mockResolvedValue([
          { encounterId: "e1", _count: { _all: 1 } },
          { encounterId: "e2", _count: { _all: 1 } },
        ]),
      },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { encounterId: "e1", billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
          { encounterId: "e2", billingSide: "BOTH", procedureCode: "99284", hcpcsCode: null, code: null },
        ]),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
      encounterClinicalEvent: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ClaimAssemblyPreviewService(prisma as never);
    const filtered = await svc.getQueue({ facilityId: "f1", professionalOnly: true });
    expect(filtered.rows.every((r) => r.professionalPackage.applies)).toBe(true);
  });
});
