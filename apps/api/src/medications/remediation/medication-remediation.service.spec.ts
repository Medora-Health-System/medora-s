import {
  PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS,
  PHASE15_PART2A_IMPLEMENTATION_ID,
  assertDomainHasAuthoritativeProvenance,
  canTransitionRemediationWorkItem,
  classifyPhase14BGapForRemediation,
  resolveLifecycleStatusFromAlias,
} from "@medora/shared";
import { assertWave1DomainCompletionAllowed } from "./medication-wave1-completion.service";
import { isAuthoritativeRegistrationStatus } from "./medication-source-lifecycle.service";

describe("Phase 15 Part 2A remediation infrastructure", () => {
  it("keeps MI advisory and forbids fabrication / Wave expansion", () => {
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.clinicalActivationEnabled).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.fabricateUnsupportedFacts).toBe(
      false
    );
    expect(PHASE15_AUTHORITATIVE_SOURCE_DEFAULTS.expandBeyondWave1).toBe(false);
    expect(PHASE15_PART2A_IMPLEMENTATION_ID).toContain("PART2A");
  });

  it("routes Phase 14B gaps into remediation categories", () => {
    expect(classifyPhase14BGapForRemediation("KNOWLEDGE")).toBe("KNOWLEDGE");
    expect(classifyPhase14BGapForRemediation("PROVENANCE")).toBe("PROVENANCE");
    expect(classifyPhase14BGapForRemediation("QUALITY_GAP")).toBe("QUALITY");
    expect(classifyPhase14BGapForRemediation("REFERENCE")).toBe("REFERENCE_CASE");
  });

  it("enforces work-item lifecycle transitions", () => {
    expect(
      canTransitionRemediationWorkItem(
        "BLOCKED_PENDING_AUTHORITATIVE_SOURCE",
        "ROUTED"
      )
    ).toBe(true);
    expect(
      canTransitionRemediationWorkItem("IN_REMEDIATION", "AWAITING_QUALITY_RECALC")
    ).toBe(true);
    expect(canTransitionRemediationWorkItem("RESOLVED", "OPEN")).toBe(false);
  });

  it("maps enterprise lifecycle aliases onto acquisition statuses", () => {
    expect(resolveLifecycleStatusFromAlias("registered")).toBe("REGISTERED");
    expect(resolveLifecycleStatusFromAlias("verified")).toBe("UNDER_REVIEW");
    expect(resolveLifecycleStatusFromAlias("authoritative")).toBe(
      "AUTHORITATIVE_SOURCE_CONFIRMED"
    );
    expect(resolveLifecycleStatusFromAlias("deprecated")).toBe("RETIRED");
    expect(resolveLifecycleStatusFromAlias("superseded")).toBe("SUPERSEDED");
    expect(isAuthoritativeRegistrationStatus("AUTHORITATIVE_SOURCE_CONFIRMED")).toBe(
      true
    );
    expect(isAuthoritativeRegistrationStatus("REGISTERED")).toBe(false);
  });

  it("keeps domains without authoritative provenance deferred", () => {
    expect(() =>
      assertWave1DomainCompletionAllowed({
        hasAuthoritativeSourceLink: false,
        domainStatus: "UNDER_REVIEW",
      })
    ).toThrow();
    expect(() =>
      assertDomainHasAuthoritativeProvenance({
        hasAuthoritativeSourceLink: false,
        domainStatus: "DEFERRED",
      })
    ).not.toThrow();
  });
});

describe("Phase 15 Part 2A remediation seeding (mocked repository)", () => {
  const actor = { userId: "u1", roles: ["MEDORA_SUPER_ADMIN"] };

  function mockPrisma(overrides: Record<string, unknown> = {}) {
    const program = {
      id: "prog-1",
      programKey: "EM_WAVE1_AUTHORITATIVE_SOURCE_REMEDIATION_V1",
      status: "PLANNED",
    };
    const gap = {
      id: "gap-1",
      familyKey: "EM_FAM_IBUPROFEN",
      gapType: "KNOWLEDGE",
      gapKey: "KNOWLEDGE_GAP:EM_FAM_IBUPROFEN:POSITIVE_TIER1",
      description: "Tier-1 positive not authored",
      severity: "INFO",
      status: "OPEN",
    };
    return {
      medicationRemediationProgram: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(program),
        update: jest.fn().mockResolvedValue({ ...program, status: "SEEDING" }),
      },
      medicationShadowEvaluationBatch: {
        findUnique: jest.fn().mockResolvedValue({ id: "batch-1" }),
      },
      medicationShadowGapLink: {
        findMany: jest.fn().mockResolvedValue([gap]),
        update: jest.fn(),
      },
      medicationKnowledgeApprovalWaveItem: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { familyKey: "EM_FAM_IBUPROFEN", canonicalConceptId: "c1" },
          ]),
        count: jest.fn().mockResolvedValue(8),
      },
      medicationRemediationWorkItem: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: "wi-1", ...data })
        ),
        findMany: jest.fn().mockResolvedValue([
          { status: "BLOCKED_PENDING_AUTHORITATIVE_SOURCE" },
        ]),
      },
      medicationRemediationAuditEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      ...overrides,
    };
  }

  it("seeds blocked work items for Tier-1 knowledge gaps", async () => {
    const {
      seedRemediationWorkItemsFromPhase14BGaps,
    } = await import("./medication-remediation.service");
    const prisma = mockPrisma() as any;
    const result = await seedRemediationWorkItemsFromPhase14BGaps(prisma, actor);
    expect(result.workItems).toHaveLength(1);
    expect(result.workItems[0].status).toBe(
      "BLOCKED_PENDING_AUTHORITATIVE_SOURCE"
    );
    expect(result.workItems[0].requiresAuthoritativeSource).toBe(true);
    expect(result.workItems[0].fabricatedKnowledgeForbidden).toBe(true);
    expect(prisma.medicationRemediationWorkItem.create).toHaveBeenCalled();
  });

  it("refuses resolve without authoritative registration", async () => {
    const { transitionRemediationWorkItem } = await import(
      "./medication-remediation.service"
    );
    const item = {
      id: "wi-1",
      programId: "prog-1",
      status: "AWAITING_QUALITY_RECALC",
      requiresAuthoritativeSource: true,
      evidenceRegistrationId: null,
      shadowGapLinkId: null,
      resolvedAt: null,
    };
    const prisma = {
      medicationRemediationWorkItem: {
        findUnique: jest.fn().mockResolvedValue(item),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      medicationEvidenceSourceRegistration: {
        findUnique: jest.fn(),
      },
      medicationRemediationProgram: {
        update: jest.fn(),
      },
      medicationRemediationAuditEvent: {
        create: jest.fn(),
      },
    } as any;

    await expect(
      transitionRemediationWorkItem(prisma, actor, {
        workItemId: "wi-1",
        toStatus: "RESOLVED",
      })
    ).rejects.toThrow(/autoritative/i);
  });
});
