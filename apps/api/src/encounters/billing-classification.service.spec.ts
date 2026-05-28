import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  BILLING_CLASSIFICATION_AUDIT_METADATA_KEYS,
  FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS,
} from "@medora/shared";
import { AuditAction, RoleCode } from "@prisma/client";
import { BillingClassificationService } from "./billing-classification.service";

const hybridFacility = {
  billingClassificationMode: "HYBRID_UC_ED" as const,
  billingSiteType: "HYBRID" as const,
  allowedEncounterBillingClassifications: ["URGENT_CARE", "EMERGENCY_DEPARTMENT"],
  allowUrgentCareToEmergencyUpgrade: true,
  requireUcToEdPatientAcknowledgement: true,
  showEncounterBillingControls: true,
};

function makeService(encounter: Record<string, unknown>, updateResult?: Record<string, unknown>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.PROVIDER } }]),
    },
    facility: {
      findFirst: jest.fn().mockResolvedValue(hybridFacility),
    },
    encounter: {
      findFirst: jest.fn().mockResolvedValue(encounter),
      update: jest.fn().mockResolvedValue(
        updateResult ?? {
          ...encounter,
          billingClassification: "EMERGENCY_DEPARTMENT",
          patient: { id: "p1", firstName: "Formation", lastName: "Demo", mrn: "MRN-1" },
        },
      ),
    },
  };
  const svc = new BillingClassificationService(prisma as never, audit as never);
  return { svc, prisma, audit };
}

describe("BillingClassificationService (19UCED.1/2)", () => {
  const baseEncounter = {
    id: "e1",
    patientId: "p1",
    facilityId: "f1",
    type: "URGENT_CARE",
    status: "OPEN",
    billingClassification: "URGENT_CARE",
    billingClassificationTransitionJson: [],
  };

  it("UC → ED conversion requires explicit request with reason and acknowledgment", async () => {
    const { svc, audit } = makeService(baseEncounter);
    await svc.changeBillingClassification({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
      dto: {
        classification: "EMERGENCY_DEPARTMENT",
        reasonCode: "HIGHER_ACUITY_WORKUP_REQUIRED",
        acknowledgmentMethod: "SIGNED_FORM",
        patientAcknowledged: true,
      },
    });
    expect(audit.log).toHaveBeenCalled();
    const actions = audit.log.mock.calls.map((c: unknown[]) => c[0]);
    expect(actions).toContain(AuditAction.UC_TO_ED_CONVERSION_COMPLETED);
  });

  it("UC → ED rejects missing acknowledgment when facility requires it", async () => {
    const { svc } = makeService(baseEncounter);
    await expect(
      svc.changeBillingClassification({
        encounterId: "e1",
        facilityId: "f1",
        userId: "u1",
        dto: {
          classification: "EMERGENCY_DEPARTMENT",
          reasonCode: "PROVIDER_DIRECTED_ED_EVALUATION",
          acknowledgmentMethod: "SIGNED_FORM",
          patientAcknowledged: false,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("blocks UC→ED when facility upgrade disabled", async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.PROVIDER } }]) },
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          ...hybridFacility,
          allowUrgentCareToEmergencyUpgrade: false,
        }),
      },
      encounter: { findFirst: jest.fn().mockResolvedValue(baseEncounter), update: jest.fn() },
    };
    const svc = new BillingClassificationService(prisma as never, audit as never);
    await expect(
      svc.changeBillingClassification({
        encounterId: "e1",
        facilityId: "f1",
        userId: "u1",
        dto: {
          classification: "EMERGENCY_DEPARTMENT",
          reasonCode: "FACILITY_POLICY",
          acknowledgmentMethod: "SIGNED_FORM",
          patientAcknowledged: true,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("appends transition history on update", async () => {
    const { svc, prisma } = makeService(baseEncounter);
    await svc.changeBillingClassification({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
      dto: {
        classification: "EMERGENCY_DEPARTMENT",
        reasonCode: "PATIENT_AGREED_TO_ED_BILLING",
        acknowledgmentMethod: "ELECTRONIC_ACKNOWLEDGMENT",
        patientAcknowledged: true,
      },
    });
    const updateArg = prisma.encounter.update.mock.calls[0][0];
    const transitions = updateArg.data.billingClassificationTransitionJson;
    expect(transitions).toHaveLength(1);
    expect(transitions[0].from).toBe("URGENT_CARE");
    expect(transitions[0].to).toBe("EMERGENCY_DEPARTMENT");
  });

  it("audit metadata is PHI-safe", async () => {
    const { svc, audit } = makeService(baseEncounter);
    await svc.changeBillingClassification({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
      dto: {
        classification: "EMERGENCY_DEPARTMENT",
        reasonCode: "OTHER",
        acknowledgmentMethod: "VERBAL_WITH_WITNESS",
        patientAcknowledged: true,
      },
    });
    const metadata = audit.log.mock.calls[0][2].metadata as Record<string, unknown>;
    expect(metadata.fromClassification).toBe("URGENT_CARE");
    expect(metadata.toClassification).toBe("EMERGENCY_DEPARTMENT");
    for (const forbidden of FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS) {
      expect(Object.keys(metadata)).not.toContain(forbidden);
    }
    expect(BILLING_CLASSIFICATION_AUDIT_METADATA_KEYS.length).toBeGreaterThan(0);
  });

  it("blocks closed encounter conversion for non-admin", async () => {
    const { svc } = makeService({ ...baseEncounter, status: "CLOSED" });
    await expect(
      svc.changeBillingClassification({
        encounterId: "e1",
        facilityId: "f1",
        userId: "u1",
        dto: {
          classification: "EMERGENCY_DEPARTMENT",
          reasonCode: "FACILITY_POLICY",
          acknowledgmentMethod: "SIGNED_FORM",
          patientAcknowledged: true,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("getTransitionOptions returns allowed targets for hybrid facility", async () => {
    const { svc } = makeService(baseEncounter);
    const opts = await svc.getTransitionOptions({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
    });
    expect(opts.currentClassification).toBe("URGENT_CARE");
    expect(opts.allowedTargets).toContain("EMERGENCY_DEPARTMENT");
    expect(opts.showControls).toBe(true);
  });

  it("getTransitionOptions sets allowChange false when facility hides controls", async () => {
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = {
      userRole: { findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.PROVIDER } }]) },
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          ...hybridFacility,
          showEncounterBillingControls: false,
        }),
      },
      encounter: { findFirst: jest.fn().mockResolvedValue(baseEncounter), update: jest.fn() },
    };
    const svc = new BillingClassificationService(prisma as never, audit as never);
    const opts = await svc.getTransitionOptions({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
    });
    expect(opts.allowedTargets).toContain("EMERGENCY_DEPARTMENT");
    expect(opts.allowChange).toBe(false);
  });

  it("getTransitionOptions returns ED→UC for hybrid ED trackboard encounter (19UCED.2A)", async () => {
    const { svc } = makeService({
      ...baseEncounter,
      type: "EMERGENCY",
      billingClassification: "EMERGENCY_DEPARTMENT",
    });
    const opts = await svc.getTransitionOptions({
      encounterId: "e1",
      facilityId: "f1",
      userId: "u1",
    });
    expect(opts.currentClassification).toBe("EMERGENCY_DEPARTMENT");
    expect(opts.allowedTargets).toContain("URGENT_CARE");
    expect(opts.allowChange).toBe(true);
  });
});
