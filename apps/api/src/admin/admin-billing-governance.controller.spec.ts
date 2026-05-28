import "reflect-metadata";
import { NotFoundException } from "@nestjs/common";
import { RoleCode } from "@prisma/client";
import { AdminBillingGovernanceController } from "./admin-billing-governance.controller";
import { AdminBillingGovernanceService } from "./admin-billing-governance.service";
import { FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS } from "@medora/shared";

jest.mock("../billing/claim-coverage-resolution.util", () => ({
  resolvePrimaryCoverage: jest.fn(),
}));

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

describe("AdminBillingGovernanceController (19UCED.9)", () => {
  it("declares RBAC metadata for ADMIN, BILLING, MEDORA_SUPER_ADMIN", () => {
    const handler = (AdminBillingGovernanceController.prototype as unknown as Record<string, unknown>)["summary"];
    const roles = Reflect.getMetadata("roles", handler as object) as RoleCode[];
    expect(roles).toContain(RoleCode.ADMIN);
    expect(roles).toContain(RoleCode.BILLING);
    expect(roles).toContain(RoleCode.MEDORA_SUPER_ADMIN);
  });
});

describe("AdminBillingGovernanceService (19UCED.9)", () => {
  const claimExportGenerate = jest.fn();
  const x12Generate = jest.fn();

  it("returns aggregate payload", async () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      encounter: {
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([{ billingClassification: "URGENT_CARE", _count: { _all: 2 } }])
          .mockResolvedValueOnce([
            { status: "CLOSED", _count: { _all: 2 } },
            { status: "OPEN", _count: { _all: 0 } },
          ]),
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              facilityId: "f1",
              billingClassificationTransitionJson: [
                {
                  from: "URGENT_CARE",
                  to: "EMERGENCY_DEPARTMENT",
                  reasonCode: "HIGHER_ACUITY_WORKUP_REQUIRED",
                  freeTextReasonPresent: false,
                  patientAcknowledged: true,
                  acknowledgmentMethod: "ELECTRONIC_ACKNOWLEDGMENT",
                  changedAt: "2026-05-01T12:00:00Z",
                  changedById: "u1",
                  facilityId: "f1",
                },
              ],
            },
          ])
          .mockResolvedValueOnce([
            {
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
              nursingAssessment: { erProviderMseV1: { mdmRiskLevel: "Moderate" } },
              patientId: "p1",
              facilityId: "f1",
              billingClassificationTransitionJson: null,
            },
          ]),
      },
      diagnosis: { groupBy: jest.fn().mockResolvedValue([{ encounterId: "e1", _count: { _all: 1 } }]) },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { encounterId: "e1", billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
        ]),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
      encounterClinicalEvent: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new AdminBillingGovernanceService(prisma as never, audit as never);
    const result = await svc.getSummary({ facilityId: "f1" }, { userId: "u1" });
    expect(result.previewOnly).toBe(true);
    expect(result.totals.encountersReviewed).toBe(2);
    expect(result.conversionSummary.ucToEdCount).toBe(1);
    expect(result.byClassification.some((b) => b.key === "URGENT_CARE")).toBe(true);
    expect(audit.log).toHaveBeenCalled();
    expect(claimExportGenerate).not.toHaveBeenCalled();
    expect(x12Generate).not.toHaveBeenCalled();
  });

  it("excludes PHI-heavy fields", async () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      encounter: {
        groupBy: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      diagnosis: { groupBy: jest.fn() },
      billingEvent: { findMany: jest.fn() },
      order: { groupBy: jest.fn() },
      encounterClinicalEvent: { groupBy: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new AdminBillingGovernanceService(prisma as never, audit as never);
    const result = await svc.getSummary({ facilityId: "f1" }, {});
    for (const forbidden of FORBIDDEN_BILLING_GOVERNANCE_ANALYTICS_KEYS) {
      expect(result).not.toHaveProperty(forbidden);
    }
  });

  it("is read-only — no billing event mutation", async () => {
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      encounter: {
        groupBy: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      diagnosis: { groupBy: jest.fn(), update: jest.fn() },
      billingEvent: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
      order: { groupBy: jest.fn() },
      encounterClinicalEvent: { groupBy: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new AdminBillingGovernanceService(prisma as never, audit as never);
    await svc.getSummary({ facilityId: "f1" }, {});
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
    expect(prisma.billingEvent.update).not.toHaveBeenCalled();
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it("missing facility returns 404", async () => {
    const prisma = { facility: { findFirst: jest.fn().mockResolvedValue(null) } };
    const audit = { log: jest.fn() };
    const svc = new AdminBillingGovernanceService(prisma as never, audit as never);
    await expect(svc.getSummary({ facilityId: "missing" }, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it("counts missing facility configuration safely", async () => {
    const incompleteFacility = {
      ...hybridFacility,
      billingClassificationMode: null,
      billingLegalName: null,
      billingAddressLine1: null,
      billingCity: null,
      billingCountry: null,
      showEncounterBillingControls: false,
    };
    const prisma = {
      facility: { findFirst: jest.fn().mockResolvedValue(incompleteFacility) },
      encounter: {
        groupBy: jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      diagnosis: { groupBy: jest.fn() },
      billingEvent: { findMany: jest.fn() },
      order: { groupBy: jest.fn() },
      encounterClinicalEvent: { groupBy: jest.fn() },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new AdminBillingGovernanceService(prisma as never, audit as never);
    const result = await svc.getSummary({ facilityId: "f1" }, {});
    expect(result.facilityConfiguration.missingClassificationModeCount).toBe(1);
    expect(result.facilityConfiguration.missingBillingIdentityCount).toBe(1);
    expect(result.warnings.some((w) => w.reason === "MISSING_FACILITY_IDENTITY")).toBe(true);
  });
});

describe("AdminBillingGovernanceController.summary filters", () => {
  it("passes filters to service", async () => {
    const getSummary = jest.fn().mockResolvedValue({ previewOnly: true, totals: {}, warnings: [] });
    const controller = new AdminBillingGovernanceController({ getSummary } as never);
    const req = { user: { facilityId: "f1", userId: "u1" }, headers: {}, ip: "127.0.0.1" };
    await controller.summary(req, "2026-05-01", "2026-05-31", "URGENT_CARE", "true", "false");
    expect(getSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        facilityId: "f1",
        classification: "URGENT_CARE",
        includeClosed: true,
        includeOpen: false,
      }),
      expect.any(Object),
    );
  });
});
