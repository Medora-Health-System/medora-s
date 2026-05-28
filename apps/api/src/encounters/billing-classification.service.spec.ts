import { BadRequestException, ForbiddenException } from "@nestjs/common";
import {
  BILLING_CLASSIFICATION_AUDIT_METADATA_KEYS,
  FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS,
} from "@medora/shared";
import { RoleCode } from "@prisma/client";
import { BillingClassificationService } from "./billing-classification.service";

function makeService(encounter: Record<string, unknown>, updateResult?: Record<string, unknown>) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    userRole: {
      findMany: jest.fn().mockResolvedValue([{ role: { code: RoleCode.PROVIDER } }]),
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

describe("BillingClassificationService (19UCED.1)", () => {
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
  });

  it("UC → ED rejects missing acknowledgment", async () => {
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

  it("blocks silent ED → UC downgrade without admin", async () => {
    const { svc } = makeService({
      ...baseEncounter,
      billingClassification: "EMERGENCY_DEPARTMENT",
    });
    await expect(
      svc.changeBillingClassification({
        encounterId: "e1",
        facilityId: "f1",
        userId: "u1",
        dto: {
          classification: "URGENT_CARE",
          reasonCode: "FACILITY_POLICY",
          acknowledgmentMethod: "NOT_APPLICABLE_PER_POLICY",
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
    expect(updateArg.data.billingClassification).toBe("EMERGENCY_DEPARTMENT");
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
    expect(metadata.reasonCode).toBe("OTHER");
    expect(metadata.patientAcknowledged).toBe(true);
    expect(metadata.actorId).toBe("u1");
    for (const forbidden of FORBIDDEN_BILLING_CLASSIFICATION_AUDIT_KEYS) {
      expect(Object.keys(metadata)).not.toContain(forbidden);
    }
    expect(BILLING_CLASSIFICATION_AUDIT_METADATA_KEYS.length).toBeGreaterThan(0);
    expect(JSON.stringify(metadata)).not.toMatch(/chief complaint|diagnosis/i);
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
});
