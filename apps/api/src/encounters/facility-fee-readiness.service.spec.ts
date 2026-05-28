import { NotFoundException } from "@nestjs/common";
import { FacilityFeeReadinessService } from "./facility-fee-readiness.service";

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

describe("FacilityFeeReadinessService (19UCED.5)", () => {
  it("returns safe facility-fee payload for observation encounter", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          type: "INPATIENT",
          status: "OPEN",
          workflowState: "IN_OBSERVATION",
          billingClassification: "OBSERVATION",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          admittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          dischargedAt: null,
          dischargeStatus: null,
          providerId: "u1",
          physicianAssignedUserId: "u2",
          nursingAssessment: { ok: true },
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
    };
    const svc = new FacilityFeeReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });

    expect(result.facilityFeeCategory).toBe("OBSERVATION_FACILITY");
    expect(result.observationOperationalStatus).toBe("ACTIVE_OBSERVATION");
    expect(result.previewOnly).toBe(true);
    expect(result).not.toHaveProperty("patientName");
    expect(result).not.toHaveProperty("reimbursementAmount");
    expect(result).not.toHaveProperty("claimPayload");
  });

  it("throws 404 when encounter missing", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn() },
    };
    const svc = new FacilityFeeReadinessService(prisma as never);
    await expect(svc.getForEncounter({ encounterId: "e1", facilityId: "f1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("does not mutate encounter or create billing events", async () => {
    const encounterRow = {
      id: "e1",
      type: "EMERGENCY",
      status: "OPEN",
      workflowState: "TRIAGE",
      billingClassification: "EMERGENCY_DEPARTMENT",
      createdAt: new Date(),
      admittedAt: null,
      dischargedAt: null,
      dischargeStatus: null,
      providerId: "u1",
      physicianAssignedUserId: null,
      nursingAssessment: null,
    };
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(encounterRow) },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1) },
    };
    const svc = new FacilityFeeReadinessService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(encounterRow.billingClassification).toBe("EMERGENCY_DEPARTMENT");
    expect(prisma.diagnosis.count).toHaveBeenCalled();
  });

  it("excludes PHI-heavy fields from payload", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          type: "INPATIENT",
          status: "OPEN",
          workflowState: "IN_OBSERVATION",
          billingClassification: "INPATIENT",
          createdAt: new Date(),
          admittedAt: new Date(),
          dischargedAt: null,
          dischargeStatus: null,
          providerId: "u1",
          physicianAssignedUserId: null,
          nursingAssessment: null,
        }),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(0) },
    };
    const svc = new FacilityFeeReadinessService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(result).not.toHaveProperty("diagnosisText");
    expect(result).not.toHaveProperty("payerName");
    expect(result).not.toHaveProperty("providerName");
    expect(result.reasons).toContain("MISSING_PRIMARY_DIAGNOSIS");
  });
});
