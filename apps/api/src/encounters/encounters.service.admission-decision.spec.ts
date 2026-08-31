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
    facility: {
      findFirst: jest.fn().mockResolvedValue({ facilityType: "HOSPITAL" }),
    },
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

  it("5-8. Observation and Admission dest survive save and re-save", async () => {
    const prior = {
      ...openEdEncounter,
      admissionSummaryJson: {
        ...openEdEncounter.admissionSummaryJson,
        requestedEncounterType: "OBSERVATION",
        careLevel: "OBSERVATION",
      },
    };
    const { svc, updateMany } = buildService({ roleCodes: ["PROVIDER"], encounter: prior });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
      },
      userId
    );
    const first = updateMany.mock.calls[0]![0].data.admissionSummaryJson as Record<string, unknown>;
    expect(first.requestedEncounterType).toBe("OBSERVATION");

    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
      },
      userId
    );
    const second = updateMany.mock.calls[1]![0].data.admissionSummaryJson as Record<string, unknown>;
    expect(second.requestedEncounterType).toBe("OBSERVATION");
  });

  it("9. omitting dest on re-save preserves prior requestedEncounterType", async () => {
    const prior = {
      ...openEdEncounter,
      admissionSummaryJson: {
        ...openEdEncounter.admissionSummaryJson,
        requestedEncounterType: "OBSERVATION",
      },
    };
    const { svc, updateMany } = buildService({ roleCodes: ["PROVIDER"], encounter: prior });
    const dto = { ...baseDto("DRAFT") };
    delete (dto as { requestedEncounterType?: string }).requestedEncounterType;
    await svc.recordAdmissionDecision(facilityId, encounterId, dto as never, userId);
    const data = updateMany.mock.calls[0]![0].data.admissionSummaryJson as Record<string, unknown>;
    expect(data.requestedEncounterType).toBe("OBSERVATION");
  });

  it("13. duplicate save reuses active placement instead of creating a second row", async () => {
    const { svc, placement } = buildService({
      roleCodes: ["PROVIDER"],
      placementEnabled: true,
    });
    placement.getActiveForEncounter.mockResolvedValue({
      id: "plc-1",
      status: "DRAFT",
      version: 1,
      requestedEncounterType: "INPATIENT",
    });
    await svc.recordAdmissionDecision(facilityId, encounterId, baseDto("DRAFT"), userId);
    expect(placement.createDraft).not.toHaveBeenCalled();
    expect(placement.updateDraft).toHaveBeenCalled();
  });

  it("14. committed placement dest cannot silently flip via admission decision", async () => {
    const { svc, updateMany, placement } = buildService({
      roleCodes: ["PROVIDER"],
      placementEnabled: true,
    });
    placement.getActiveForEncounter.mockResolvedValue({
      id: "plc-1",
      status: "REQUESTED",
      version: 4,
      requestedEncounterType: "OBSERVATION",
    });
    await expect(
      svc.recordAdmissionDecision(
        facilityId,
        encounterId,
        { ...baseDto("DRAFT"), requestedEncounterType: "INPATIENT" },
        userId
      )
    ).rejects.toMatchObject({ response: { code: "PLACEMENT_DESTINATION_LOCKED" } });
    expect(updateMany).not.toHaveBeenCalled();
    expect(placement.updateDraft).not.toHaveBeenCalled();
  });

  it("35. FSER cannot stamp local INPATIENT destination", async () => {
    const { svc, prisma, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    prisma.facility.findFirst.mockResolvedValue({ facilityType: "FREESTANDING_ER" });
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, baseDto("DRAFT"), userId)
    ).rejects.toMatchObject({ response: { code: "INPATIENT_DISABLED_BY_PROFILE" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("keeps NURSING_COMPLETION_INCOMPLETE in the admission error map", async () => {
    const { ADMISSION_ERROR_MESSAGES_FR } = await import("./admission-decision-errors.util");
    expect(ADMISSION_ERROR_MESSAGES_FR.NURSING_COMPLETION_INCOMPLETE).toMatch(/éléments infirmiers/i);
    expect(ADMISSION_ERROR_MESSAGES_FR.INPATIENT_DISABLED_BY_PROFILE).toBeTruthy();
    expect(ADMISSION_ERROR_MESSAGES_FR.PLACEMENT_DESTINATION_LOCKED).toBeTruthy();
  });

  it("35b. FSER blocks inferred INPATIENT from careLevel when dest is omitted", async () => {
    const { svc, prisma, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    prisma.facility.findFirst.mockResolvedValue({ facilityType: "FREESTANDING_ER" });
    const { requestedEncounterType: _omit, ...dto } = baseDto("DRAFT");
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, dto as never, userId)
    ).rejects.toMatchObject({ response: { code: "INPATIENT_DISABLED_BY_PROFILE" } });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("35c. FSER inferred INPATIENT is blocked before placement write", async () => {
    const { svc, prisma, updateMany, placement } = buildService({
      roleCodes: ["PROVIDER"],
      placementEnabled: true,
    });
    prisma.facility.findFirst.mockResolvedValue({ facilityType: "FREESTANDING_ER" });
    const { requestedEncounterType: _omit, ...dto } = baseDto("DRAFT");
    await expect(
      svc.recordAdmissionDecision(facilityId, encounterId, dto as never, userId)
    ).rejects.toMatchObject({ response: { code: "INPATIENT_DISABLED_BY_PROFILE" } });
    expect(updateMany).not.toHaveBeenCalled();
    expect(placement.createDraft).not.toHaveBeenCalled();
  });

  it("36. FSER can stamp OBSERVATION destination", async () => {
    const { svc, prisma, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    prisma.facility.findFirst.mockResolvedValue({ facilityType: "FREESTANDING_ER" });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
      },
      userId
    );
    const data = updateMany.mock.calls[0]![0].data.admissionSummaryJson as Record<string, unknown>;
    expect(data.requestedEncounterType).toBe("OBSERVATION");
  });

  it("36b. FSER inferred OBSERVATION from careLevel remains allowed", async () => {
    const { svc, prisma, updateMany } = buildService({ roleCodes: ["PROVIDER"] });
    prisma.facility.findFirst.mockResolvedValue({ facilityType: "FREESTANDING_ER" });
    const { requestedEncounterType: _omit, ...dto } = {
      ...baseDto("DRAFT"),
      admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
    };
    await svc.recordAdmissionDecision(facilityId, encounterId, dto as never, userId);
    expect(updateMany).toHaveBeenCalled();
  });

  function buildVersionTrackingService(opts: { roleCodes: string[]; placementEnabled?: boolean }) {
    let current: {
      id: string;
      patientId: string;
      facilityId: string;
      type: string;
      status: string;
      version: number;
      admittedAt: Date | null;
      admissionSummaryJson: Record<string, unknown>;
      providerDocumentationSignedAt: Date | null;
      workflowState: string;
    } = { ...openEdEncounter };
    const updateMany = jest.fn().mockImplementation(async (args: { where: { version?: number }; data: { admissionSummaryJson?: Record<string, unknown> } }) => {
      if (args.where.version != null && args.where.version !== current.version) {
        return { count: 0 };
      }
      current = {
        ...current,
        version: current.version + 1,
        admissionSummaryJson: {
          ...current.admissionSummaryJson,
          ...(args.data.admissionSummaryJson ?? {}),
        },
      };
      return { count: 1 };
    });
    const diagnosisFindMany = jest.fn().mockResolvedValue([
      { id: "dx-1", code: "J18.9", description: "Pneumonia" },
      { id: "dx-2", code: "I10", description: "HTN" },
    ]);
    const prisma = {
      userRole: {
        findMany: jest.fn().mockResolvedValue(opts.roleCodes.map((code) => ({ role: { code } }))),
        findFirst: jest.fn().mockImplementation(async (args: { where?: { role?: { code?: { in?: string[] } } } }) => {
          const allowed = args?.where?.role?.code?.in ?? [];
          const hit = opts.roleCodes.find((c) => allowed.includes(c));
          return hit ? { id: "ur-1" } : null;
        }),
      },
      encounter: {
        findFirst: jest.fn().mockImplementation(async () => ({ ...current })),
        updateMany,
      },
      diagnosis: { findMany: diagnosisFindMany },
      facility: { findFirst: jest.fn().mockResolvedValue({ facilityType: "HOSPITAL" }) },
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const placement = createMockInternalPlacementService();
    placement.isWorkflowEnabled.mockReturnValue(opts.placementEnabled === true);
    const draft = { id: "plc-1", status: "DRAFT", version: 1 };
    placement.getActiveForEncounter.mockResolvedValue(null);
    placement.createDraft.mockResolvedValue(draft);
    placement.signDraft.mockResolvedValue({ ...draft, status: "SIGNED", version: 2 });
    placement.submitRequested.mockResolvedValue({ ...draft, status: "REQUESTED", version: 3 });
    const svc = new EncountersService(
      prisma as never,
      audit as never,
      {} as never,
      createMockBedBoardService() as never,
      placement as never,
      createMockEnterpriseAssignmentService() as never,
      createMockEnterpriseLifecycleService() as never
    );
    return { svc, updateMany, placement, audit, getCurrent: () => current };
  }

  it("1. fresh Admission draft save succeeds with matching expectedVersion", async () => {
    const { svc, updateMany, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("DRAFT"), expectedVersion: 3 } as never,
      userId
    );
    expect(updateMany).toHaveBeenCalled();
    expect(getCurrent().version).toBe(4);
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("INPATIENT");
  });

  it("2. fresh Observation draft save succeeds with matching expectedVersion", async () => {
    const { svc, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        expectedVersion: 3,
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
        admissionPacket: { ...baseDto("DRAFT").admissionPacket, levelOfCareCode: "OBSERVATION" },
      } as never,
      userId
    );
    expect(getCurrent().version).toBe(4);
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("OBSERVATION");
  });

  it("3. fresh Admission direct sign succeeds with matching expectedVersion", async () => {
    const { svc, getCurrent, placement } = buildVersionTrackingService({
      roleCodes: ["PROVIDER"],
      placementEnabled: false,
    });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("SIGN"), expectedVersion: 3 } as never,
      userId
    );
    expect(getCurrent().version).toBe(4);
    expect(getCurrent().admissionSummaryJson.admissionDecisionMode).toBe("SIGN");
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("INPATIENT");
    expect(placement.signDraft).not.toHaveBeenCalled();
  });

  it("4. fresh Observation direct sign succeeds with matching expectedVersion", async () => {
    const { svc, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("SIGN"),
        expectedVersion: 3,
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("SIGN").admissionSummary, careLevel: "OBSERVATION" },
        admissionPacket: { ...baseDto("SIGN").admissionPacket, levelOfCareCode: "OBSERVATION" },
      } as never,
      userId
    );
    expect(getCurrent().version).toBe(4);
    expect(getCurrent().admissionSummaryJson.admissionDecisionMode).toBe("SIGN");
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("OBSERVATION");
  });

  it("5-8. Admission save then sign succeeds when client uses returned version", async () => {
    const { svc, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    const draftRes = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("DRAFT"), expectedVersion: 3 } as never,
      userId
    );
    expect(draftRes.encounter.version).toBe(4);
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("SIGN"), expectedVersion: draftRes.encounter.version } as never,
      userId
    );
    expect(getCurrent().version).toBe(5);
    expect(getCurrent().admissionSummaryJson.admissionDecisionMode).toBe("SIGN");
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("INPATIENT");
  });

  it("6. Observation save then sign succeeds when client uses returned version", async () => {
    const { svc, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    const obsDto = {
      requestedEncounterType: "OBSERVATION" as const,
      admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
      admissionPacket: { ...baseDto("DRAFT").admissionPacket, levelOfCareCode: "OBSERVATION" },
    };
    const draftRes = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("DRAFT"), ...obsDto, expectedVersion: 3 } as never,
      userId
    );
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("SIGN"), ...obsDto, expectedVersion: draftRes.encounter.version } as never,
      userId
    );
    expect(getCurrent().admissionSummaryJson.admissionDecisionMode).toBe("SIGN");
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("OBSERVATION");
  });

  it("9-11. truly stale revision 409s, does not overwrite, and does not sign", async () => {
    const { svc, updateMany, getCurrent, placement } = buildVersionTrackingService({
      roleCodes: ["PROVIDER"],
      placementEnabled: true,
    });
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("DRAFT"), expectedVersion: 3 } as never,
      userId
    );
    const afterDraft = { ...getCurrent() };
    expect(afterDraft.version).toBe(4);
    await expect(
      svc.recordAdmissionDecision(
        facilityId,
        encounterId,
        {
          ...baseDto("SIGN"),
          expectedVersion: 3,
          admissionSummary: { ...baseDto("SIGN").admissionSummary, admissionReason: "CONFLICTING OVERWRITE" },
        } as never,
        userId
      )
    ).rejects.toMatchObject({ response: { code: "ADMISSION_DECISION_STALE" } });
    expect(getCurrent().version).toBe(4);
    expect(getCurrent().admissionSummaryJson.admissionReason).toBe(afterDraft.admissionSummaryJson.admissionReason);
    expect(getCurrent().admissionSummaryJson.admissionDecisionMode).not.toBe("SIGN");
    expect(placement.signDraft).not.toHaveBeenCalled();
    expect(updateMany.mock.calls.length).toBe(1);
  });

  it("12. pathway switch Admission→Observation with refreshed version does not 409", async () => {
    const { svc, getCurrent } = buildVersionTrackingService({ roleCodes: ["PROVIDER"] });
    const first = await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      { ...baseDto("DRAFT"), expectedVersion: 3 } as never,
      userId
    );
    await svc.recordAdmissionDecision(
      facilityId,
      encounterId,
      {
        ...baseDto("DRAFT"),
        expectedVersion: first.encounter.version,
        requestedEncounterType: "OBSERVATION",
        admissionSummary: { ...baseDto("DRAFT").admissionSummary, careLevel: "OBSERVATION" },
        admissionPacket: { ...baseDto("DRAFT").admissionPacket, levelOfCareCode: "OBSERVATION" },
      } as never,
      userId
    );
    expect(getCurrent().admissionSummaryJson.requestedEncounterType).toBe("OBSERVATION");
    expect(getCurrent().version).toBe(5);
  });
});
