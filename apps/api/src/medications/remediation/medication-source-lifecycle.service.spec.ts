import { BadRequestException } from "@nestjs/common";
import { advanceEvidenceSourceLifecycle } from "./medication-source-lifecycle.service";

describe("medication-source-lifecycle.service", () => {
  const actor = { userId: "u1", roles: ["MEDORA_SUPER_ADMIN"] };

  it("rejects lower-tier promotion to AUTHORITATIVE_SOURCE_CONFIRMED", async () => {
    const prisma = {
      medicationEvidenceSourceRegistration: {
        findUnique: jest.fn().mockResolvedValue({
          id: "reg-1",
          sourceTier: "TIER_5_INSTITUTIONAL_POLICY",
          acquisitionStatus: "REGISTERED",
          reviewStatus: "APPROVED",
          licensingStatus: "LICENSED",
          licenseStatus: "LICENSED",
          sourceCategory: null,
          lifecycleNotes: null,
        }),
        update: jest.fn(),
      },
      medicationRemediationAuditEvent: { create: jest.fn() },
    } as any;

    await expect(
      advanceEvidenceSourceLifecycle(prisma, actor, {
        registrationId: "reg-1",
        targetStatus: "authoritative",
        reviewStatus: "APPROVED",
        licensingStatus: "LICENSED",
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.medicationEvidenceSourceRegistration.update).not.toHaveBeenCalled();
  });

  it("advances Tier-1 registration to AUTHORITATIVE_SOURCE_CONFIRMED", async () => {
    const prisma = {
      medicationEvidenceSourceRegistration: {
        findUnique: jest.fn().mockResolvedValue({
          id: "reg-1",
          sourceTier: "TIER_1_REGULATORY",
          acquisitionStatus: "NORMALIZED",
          reviewStatus: "PENDING",
          licensingStatus: "PUBLIC_DOMAIN",
          licenseStatus: "PUBLIC_DOMAIN",
          sourceCategory: null,
          lifecycleNotes: null,
        }),
        update: jest.fn().mockResolvedValue({
          id: "reg-1",
          acquisitionStatus: "AUTHORITATIVE_SOURCE_CONFIRMED",
          reviewStatus: "APPROVED",
          sourceCategory: "REGULATORY_LABELING",
        }),
      },
      medicationRemediationAuditEvent: { create: jest.fn() },
    } as any;

    const updated = await advanceEvidenceSourceLifecycle(prisma, actor, {
      registrationId: "reg-1",
      targetStatus: "AUTHORITATIVE_SOURCE_CONFIRMED",
      sourceCategory: "REGULATORY_LABELING",
      reviewStatus: "APPROVED",
      licensingStatus: "PUBLIC_DOMAIN",
    });
    expect(updated.acquisitionStatus).toBe("AUTHORITATIVE_SOURCE_CONFIRMED");
    expect(prisma.medicationRemediationAuditEvent.create).toHaveBeenCalled();
  });
});
