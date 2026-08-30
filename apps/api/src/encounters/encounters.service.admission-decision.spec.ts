/**
 * ED admission decision writer — dual-role auth, correlation preserve, placement on sign,
 * never closes ED.
 */

import { ForbiddenException } from "@nestjs/common";
import { EncountersService } from "./encounters.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { createMockEnterpriseLifecycleService } from "./encounters.service.test-enterprise-lifecycle.mock";

const facilityId = "fac-1";
const encounterId = "enc-ed-1";
const userId = "user-dual";

const openEdEncounter = {
  id: encounterId,
  patientId: "pat-1",
  facilityId,
  type: "EMERGENCY",
  status: "OPEN",
  version: 3,
  admittedAt: null as Date | null,
  admissionSummaryJson: {
    admissionCorrelation: { correlationId: "corr-keep", status: "ACTIVE" },
    admissionReason: "prior",
  },
  providerDocumentationSignedAt: null as Date | null,
  workflowState: "IN_TREATMENT",
};

function baseDto(mode: "DRAFT" | "SIGN" = "SIGN") {
  return {
    mode,
    admissionSummary: {
      admissionReason: "Needs inpatient care",
      serviceUnit: "HOSPITAL_MEDICINE",
      admissionDiagnosis: "Pneumonia",
      careLevel: "MEDICAL_SURGICAL",
      conditionAtAdmission: "Stable",
      initialPlan: "IV Abx",
      responsiblePhysicianName: "Dr Dual",
    },
    admissionDiagnoses: {
      primaryDiagnosisId: "dx-1",
      secondaryDiagnosisIds: ["dx-2"],
      primaryDisplay: "J18.9 — Pneumonia",
      secondaryDisplays: ["I10 — HTN"],
      clarificationText: null,
    },
    admissionPacket: {
      version: 1 as const,
      admittingServiceCode: "HOSPITAL_MEDICINE",
      levelOfCareCode: "MEDICAL_SURGICAL",
      conditionStatus: "STABLE",
      fields: {
        admissionReason: {
          value: "Needs inpatient care",
          origin: "PHYSICIAN_EDITED",
          sources: [],
        },
        initialPlan: {
          value: "IV Abx",
          origin: "PHYSICIAN_EDITED",
          sources: [],
        },
      },
      structuredInitialPlan: { items: [] },
    },
    requestedEncounterType: "INPATIENT" as const,
  };
}

function buildService(opts: {
  roleCodes: string[];
  placementEnabled?: boolean;
  encounter?: typeof openEdEncounter | null;
}) {
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const diagnosisFindMany = jest.fn().mockResolvedValue([
    { id: "dx-1", code: "J18.9", description: "Pneumonia" },
    { id: "dx-2", code: "I10", description: "HTN" },
  ]);
  const prisma = {
    userRole: {
      findMany: jest.fn().mockResolvedValue(
        opts.roleCodes.map((code) => ({ role: { code } }))
      ),
      findFirst: jest.fn().mockImplementation(async (args: { where?: { role?: { code?: { in?: string[] } } } }) => {
        const allowed = args?.where?.role?.code?.in ?? [];
        const hit = opts.roleCodes.find((c) => allowed.includes(c));
        return hit ? { id: "ur-1" } : null;
      }),
    },
    encounter: {
      findFirst: jest
        .fn()
        .mockResolvedValueOnce(opts.encounter === undefined ? openEdEncounter : opts.encounter)
        .mockResolvedValue({
          ...(opts.encounter === undefined ? openEdEncounter : opts.encounter),
          status: "OPEN",
          type: "EMERGENCY",
        }),
      updateMany,
    },
    diagnosis: { findMany: diagnosisFindMany },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const placement = createMockInternalPlacementService();
  placement.isWorkflowEnabled.mockReturnValue(opts.placementEnabled === true);
  const draft = {
    id: "plc-1",
    status: "DRAFT",
    version: 1,
  };
  placement.getActiveForEncounter.mockResolvedValue(null);
  placement.createDraft.mockResolvedValue(draft);
  placement.signDraft.mockResolvedValue({ ...draft, status: "SIGNED", version: 2 });
  placement.submitRequested.mockResolvedValue({
    ...draft,
    status: "REQUESTED",
    version: 3,
  });

  const svc = new EncountersService(
    prisma as never,
    audit as never,
    {} as never,
    createMockBedBoardService() as never,
    placement as never,
    createMockEnterpriseAssignmentService() as never,
    createMockEnterpriseLifecycleService() as never
  );
  return { svc, prisma, audit, placement, updateMany, diagnosisFindMany };
}

describe("EncountersService.recordAdmissionDecision", () => {
  it("allows dual-role PROVIDER+RN to sign (membership-based)", async () => {
    const { svc, updateMany, audit } = buildService({ roleCodes: ["RN", "PROVIDER"] });
    const res = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      baseDto("SIGN"),
      userId
    );
    expect(updateMany).toHaveBeenCalled();
    const data = updateMany.mock.calls[0]![0].data as {
      admissionSummaryJson: Record<string, unknown>;
      status?: string;
    };
    expect(data.admissionSummaryJson.admissionCorrelation).toEqual({
      correlationId: "corr-keep",
      status: "ACTIVE",
    });
    expect(data.admissionSummaryJson.admissionDiagnosesV1).toMatchObject({
      primaryDiagnosisId: "dx-1",
    });
    expect(data.admissionSummaryJson.requestedEncounterType).toBe("INPATIENT");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("type");
    expect(res.edEncounterClosed).toBe(false);
    expect(audit.log).toHaveBeenCalled();
    const meta = audit.log.mock.calls[0]![2].metadata as Record<string, unknown>;
    expect(meta.event).toBe("ED_ADMISSION_DECISION_SIGNED");
    expect(meta.edEncounterClosed).toBe(false);
  });

  it("forbids RN-only from writing admission decision", async () => {
    const { svc, updateMany } = buildService({ roleCodes: ["RN"] });
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, baseDto("DRAFT"), userId)
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("requires primary diagnosis to SIGN", async () => {
    const { svc, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    const dto = {
      ...baseDto("SIGN"),
      admissionDiagnoses: {
        primaryDiagnosisId: undefined,
        secondaryDiagnosisIds: [] as string[],
        primaryDisplay: null,
        secondaryDisplays: [] as string[],
        clarificationText: null,
      },
    };
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, dto, userId)
    ).rejects.toMatchObject({ status: 400 });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("creates and submits placement when workflow flag ON; does not close ED", async () => {
    const { svc, placement, updateMany } = buildService({
      roleCodes: ["PROVIDER"],
      placementEnabled: true,
    });
    const res = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      baseDto("SIGN"),
      userId
    );
    expect(placement.createDraft).toHaveBeenCalled();
    expect(placement.signDraft).toHaveBeenCalled();
    expect(placement.submitRequested).toHaveBeenCalled();
    expect(res.placement?.submittedToQueue).toBe(true);
    expect(res.edEncounterClosed).toBe(false);
    const data = updateMany.mock.calls[0]![0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty("status");
  });

  it("stamps requestedEncounterType OBSERVATION on admissionSummaryJson without changing encounter type", async () => {
    const { svc, updateMany, placement } = buildService({
      roleCodes: ["PROVIDER"],
      placementEnabled: false,
    });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
        admissionPacket: {
          ...baseDto("DRAFT").admissionPacket,
          levelOfCareCode: "OBSERVATION",
        },
      },
      userId
    );
    expect(placement.createDraft).not.toHaveBeenCalled();
    const data = updateMany.mock.calls[0]![0].data as {
      admissionSummaryJson: Record<string, unknown>;
      type?: string;
    };
    expect(data.admissionSummaryJson.requestedEncounterType).toBe("OBSERVATION");
    expect(data.admissionSummaryJson.careLevel).toBe("OBSERVATION");
    expect(data).not.toHaveProperty("type");
  });

  it("actorHasProviderOrAdminAtFacility is true for dual-role when findFirst would prefer RN", async () => {
    const { svc, prisma } = buildService({ roleCodes: ["RN", "PROVIDER"] });
    const ok = await svc.actorHasProviderOrAdminAtFacility(facilityId, userId);
    expect(ok).toBe(true);
    expect(prisma.userRole.findFirst).toHaveBeenCalled();
  });

  it("rejects SIGN without condition status (D4A.2.1)", async () => {
    const { svc, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    const dto = {
      ...baseDto("SIGN"),
      admissionPacket: {
        ...baseDto("SIGN").admissionPacket,
        conditionStatus: null,
      },
    };
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, dto as never, userId)
    ).rejects.toMatchObject({ response: { code: "CONDITION_ON_ADMISSION_REQUIRED" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale expectedVersion (D4A.2.1)", async () => {
    const { svc, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    await expect(
      svc.recordAdmissionDecision(
        facilityId,
        encounterId,
        { ...baseDto("DRAFT"), expectedVersion: 1 } as never,
        userId
      )
    ).rejects.toMatchObject({ response: { code: "ADMISSION_DECISION_STALE" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("idempotent SIGN replay with same clientRequestId does not double-audit", async () => {
    const signedEncounter = {
      ...openEdEncounter,
      admissionSummaryJson: {
        ...openEdEncounter.admissionSummaryJson,
        admissionDecisionMode: "SIGN",
        admissionDecisionClientRequestId: "idem-1",
      },
    };
    const { svc, updateMany, audit } = buildService({
      roleCodes: ["PROVIDER"],
      encounter: signedEncounter,
    });
    const res = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("SIGN"), clientRequestId: "idem-1" } as never,
      userId
    );
    expect(res.idempotentReplay).toBe(true);
    expect(updateMany).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });
});
