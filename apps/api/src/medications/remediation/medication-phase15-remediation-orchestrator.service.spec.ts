import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_PART2B_IMPLEMENTATION_ID,
  evaluatePhase15OperationalReadiness,
} from "@medora/shared";
import { previewRemediationTransition } from "./medication-phase15-remediation-orchestrator.service";

describe("Phase 15 Part 2B orchestrator", () => {
  it("exposes Part 2B implementation id and keeps CDS off", () => {
    expect(PHASE15_PART2B_IMPLEMENTATION_ID).toContain("PART2B");
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.providerFacingAlertsEnabled).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.orderBlockingEnabled).toBe(
      false
    );
  });

  it("computes operational readiness without claiming certification", () => {
    expect(
      evaluatePhase15OperationalReadiness({
        openWorkItems: 8,
        blockedWorkItems: 8,
        openTier1Gaps: 8,
        resolvedWorkItems: 0,
        syntheticQualifiedWithGaps: true,
      })
    ).toBe("BLOCKED");
    expect(
      evaluatePhase15OperationalReadiness({
        openWorkItems: 0,
        blockedWorkItems: 0,
        openTier1Gaps: 0,
        resolvedWorkItems: 8,
        syntheticQualifiedWithGaps: false,
      })
    ).toBe("READY_FOR_REQUALIFICATION");
  });

  it("preview does not mutate prisma", async () => {
    const update = jest.fn();
    const prisma = {
      medicationRemediationWorkItem: {
        findUnique: jest.fn().mockResolvedValue({
          id: "wi-1",
          workItemKey: "P15:X",
          familyKey: "EM_FAM_IBUPROFEN",
          status: "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
          description: "gap",
          recommendedAction: "attach source",
          requiresAuthoritativeSource: true,
          evidenceRegistrationId: null,
          evidenceRegistration: null,
          shadowGapLink: null,
          program: null,
          gapCategory: "KNOWLEDGE",
        }),
      },
      medicationRemediationAuditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      medicationRemediationWorkItemUpdate: update,
    } as any;
    // alias used by getRemediationWorkItemDetail path
    prisma.medicationRemediationWorkItem.update = update;

    const preview = await previewRemediationTransition(
      prisma,
      "wi-1",
      "ROUTED"
    );
    expect(preview.mutates).toBe(false);
    expect(preview.appliesCds).toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(prisma.medicationRemediationAuditEvent.create).not.toHaveBeenCalled();
  });
});
