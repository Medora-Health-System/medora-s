import { NotFoundException } from "@nestjs/common";
import { ChargeCaptureReviewService } from "./charge-capture-review.service";
import { FORBIDDEN_CHARGE_REVIEW_KEYS } from "@medora/shared";

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
  providerId: "prov1",
  physicianAssignedUserId: "phys1",
  nursingAssessment: null,
  patientId: "p1",
  patient: { firstName: "Jean", lastName: "Dupont" },
};

describe("ChargeCaptureReviewService (19UCED.6)", () => {
  beforeEach(() => {
    (resolvePrimaryCoverage as jest.Mock).mockResolvedValue({ ok: true, coverage: {} });
  });

  it("returns queue rows", async () => {
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([closedEncounter]),
        findFirst: jest.fn(),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: {
        groupBy: jest.fn().mockResolvedValue([{ encounterId: "e1", _count: { _all: 1 } }]),
        count: jest.fn(),
      },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { encounterId: "e1", billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
        ]),
        count: jest.fn(),
      },
      order: { groupBy: jest.fn().mockResolvedValue([]), count: jest.fn() },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    const result = await svc.getQueue({ facilityId: "f1" });
    expect(result.previewOnly).toBe(true);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.encounterId).toBe("e1");
    expect(result.rows[0]).not.toHaveProperty("layers");
  });

  it("returns single encounter summary composing readiness layers", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(closedEncounter),
        findMany: jest.fn(),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn() },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([
          { billingSide: "PROFESSIONAL", procedureCode: "99213", hcpcsCode: null, code: null },
        ]),
        count: jest.fn(),
      },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    const result = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(result.previewOnly).toBe(true);
    expect(result.exportReadiness).toBeDefined();
    expect(result.ledgerReadiness).toBeDefined();
    expect(result.facilityFeeReadiness).toBeDefined();
    expect(result.chargeReviewStatus).toBeDefined();
    expect(result.eventCounts?.professionalEventCount).toBe(1);
  });

  it("is read-only — no billing event mutations", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(closedEncounter),
        findMany: jest.fn(),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn() },
      billingEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
    expect(prisma.billingEvent.update).not.toHaveBeenCalled();
    expect(prisma.billingEvent.delete).not.toHaveBeenCalled();
  });

  it("does not mutate billingClassification", async () => {
    const row = { ...closedEncounter };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(row),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn().mockResolvedValue(1), groupBy: jest.fn() },
      billingEvent: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn() },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    expect(row.billingClassification).toBe("URGENT_CARE");
    expect(prisma.encounter.update).not.toHaveBeenCalled();
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
      billingEvent: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
      order: { count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    const single = await svc.getForEncounter({ encounterId: "e1", facilityId: "f1" });
    const queue = await svc.getQueue({ facilityId: "f1" });
    for (const forbidden of FORBIDDEN_CHARGE_REVIEW_KEYS) {
      expect(single).not.toHaveProperty(forbidden);
      expect(queue.rows[0]).not.toHaveProperty(forbidden);
    }
    expect(single).not.toHaveProperty("diagnosisText");
    expect(JSON.stringify(single)).not.toContain("chiefComplaint");
  });

  it("missing encounter returns 404", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn() },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: { count: jest.fn(), groupBy: jest.fn() },
      billingEvent: { findMany: jest.fn(), count: jest.fn() },
      order: { count: jest.fn(), groupBy: jest.fn() },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    await expect(svc.getForEncounter({ encounterId: "missing", facilityId: "f1" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("filters apply by status", async () => {
    const openEncounter = { ...closedEncounter, id: "e2", status: "OPEN", dischargedAt: null };
    const prisma = {
      encounter: {
        findMany: jest.fn().mockResolvedValue([closedEncounter, openEncounter]),
        findFirst: jest.fn(),
      },
      facility: { findFirst: jest.fn().mockResolvedValue(hybridFacility) },
      diagnosis: {
        groupBy: jest.fn().mockResolvedValue([
          { encounterId: "e1", _count: { _all: 1 } },
          { encounterId: "e2", _count: { _all: 1 } },
        ]),
      },
      billingEvent: { findMany: jest.fn().mockResolvedValue([]) },
      order: { groupBy: jest.fn().mockResolvedValue([]) },
    };
    const svc = new ChargeCaptureReviewService(prisma as never);
    const filtered = await svc.getQueue({
      facilityId: "f1",
      status: "HOLD_FOR_OPEN_ENCOUNTER",
    });
    expect(filtered.rows.every((r) => r.chargeReviewStatus === "HOLD_FOR_OPEN_ENCOUNTER")).toBe(true);
    expect(filtered.rows.some((r) => r.encounterId === "e2")).toBe(true);
  });
});
