import { ForbiddenException } from "@nestjs/common";
import { EnterpriseEncounterLifecycleService } from "./enterprise-encounter-lifecycle.service";
import { D4C7K_REOPEN_CODES } from "@medora/shared";

describe("EnterpriseEncounterLifecycleService MEDUI.D4C.7K", () => {
  function build(status: string = "CLOSED") {
    const encounter = {
      id: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      type: "OUTPATIENT",
      status,
      version: 2,
      workflowState: "CLOSED",
      closedAt: new Date("2026-07-29T10:00:00Z"),
      closedByUserId: "provider-1",
      reopenedAt: null,
      reopenedByUserId: null,
      reopenReason: null,
      reopenCount: 0,
      billingFinalizationStatus: "READY_FOR_REVIEW",
      roomLabel: null,
    };
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const lifecycleCreate = jest.fn().mockResolvedValue({ id: "lt-1" });
    const tx = {
      encounter: {
        updateMany,
        findFirst: jest.fn().mockResolvedValue({ ...encounter, status: "OPEN", version: 3, type: "OUTPATIENT", workflowState: "IN_TREATMENT" }),
      },
      encounterLifecycleTransition: {
        create: lifecycleCreate,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(encounter),
      },
      encounterLifecycleTransition: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx)),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const svc = new EnterpriseEncounterLifecycleService(prisma as never, audit as never);
    return { svc, prisma, audit, updateMany, lifecycleCreate };
  }

  it("denies reopen for Provider and RN", async () => {
    const { svc, updateMany } = build();
    await expect(
      svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "u1", ["PROVIDER"])
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "u1", ["RN"])
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("Facility ADMIN reopens without restoring room or billing", async () => {
    const { svc, updateMany, audit, lifecycleCreate } = build();
    const result = await svc.reopenEncounter(
      "fac-1",
      "enc-1",
      { reason: "Closed accidentally during demo" },
      "admin-1",
      ["ADMIN"]
    );
    expect(result.status).toBe("OPEN");
    expect(result.transitionType).toBe("ENCOUNTER_REOPENED");
    expect(result.roomAssignmentRestored).toBe(false);
    expect(result.billingReopened).toBe(false);
    expect(result.signedDocumentationUnlocked).toBe(false);
    expect(result.prescriptionsUnlocked).toBe(false);
    expect(updateMany).toHaveBeenCalled();
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("OPEN");
    expect(data.roomLabel).toBeNull();
    expect(lifecycleCreate).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalled();
  });

  it("rejects empty reopen reason", async () => {
    const { svc } = build();
    await expect(
      svc.reopenEncounter("fac-1", "enc-1", { reason: "  " }, "admin-1", ["ADMIN"])
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: D4C7K_REOPEN_CODES.REASON_REQUIRED }),
    });
  });

  it("rejects reopen of OPEN encounter without matching idempotency", async () => {
    const { svc } = build("OPEN");
    await expect(
      svc.reopenEncounter("fac-1", "enc-1", { reason: "Already open retry" }, "admin-1", ["ADMIN"])
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: D4C7K_REOPEN_CODES.ALREADY_OPEN }),
    });
  });

  it("clears current closedAt / closedByUserId and increments reopenCount", async () => {
    const { svc, updateMany } = build();
    await svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "admin-1", [
      "ADMIN",
    ]);
    const data = updateMany.mock.calls[0][0].data;
    expect(data.status).toBe("OPEN");
    expect(data.closedAt).toBeNull();
    expect(data.closedByUserId).toBeNull();
    expect(data.reopenedAt).toBeInstanceOf(Date);
    expect(data.reopenedByUserId).toBe("admin-1");
    expect(data.reopenReason).toBe("Closed by mistake");
    expect(data.reopenCount).toEqual({ increment: 1 });
    // dischargedAt belongs to the discharge workflow and is never rewritten here.
    expect(Object.keys(data)).not.toContain("dischargedAt");
  });

  it("keeps the historical closure in the immutable timeline, not on the encounter row", async () => {
    const { svc, lifecycleCreate } = build();
    await svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "admin-1", [
      "ADMIN",
    ]);
    const row = lifecycleCreate.mock.calls[0][0].data;
    expect(row.transitionType).toBe("ENCOUNTER_REOPENED");
    expect(row.previousState).toBe("CLOSED");
    expect(row.newState).toBe("OPEN");
    expect(row.metadataJson.previousClosedAt).toBe("2026-07-29T10:00:00.000Z");
    expect(row.metadataJson.previousClosedByUserId).toBe("provider-1");
    expect(row.metadataJson.closedAtCleared).toBe(true);
  });

  it("reopen never deletes or updates prior transition rows", async () => {
    const { svc, lifecycleCreate } = build();
    await svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "admin-1", [
      "ADMIN",
    ]);
    expect(lifecycleCreate).toHaveBeenCalledTimes(1);
    expect((lifecycleCreate.mock.calls[0][0] as { data: unknown }).data).toBeDefined();
  });

  it("multiple close/reopen cycles append monotonic sequences", async () => {
    const created: Array<Record<string, unknown>> = [];
    const lifecycleCreate = jest.fn(async (args: { data: Record<string, unknown> }) => {
      created.push(args.data);
      return { id: `lt-${created.length}` };
    });
    const tx = {
      encounter: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      encounterLifecycleTransition: {
        create: lifecycleCreate,
        findFirst: jest.fn(async () =>
          created.length ? { sequence: created.length } : null
        ),
      },
    };
    const svc = new EnterpriseEncounterLifecycleService(
      { $transaction: jest.fn() } as never,
      { log: jest.fn() } as never
    );

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await svc.applyCloseTransition(tx as never, {
        facilityId: "fac-1",
        encounterId: "enc-1",
        patientId: "pat-1",
        previousStatus: "OPEN",
        encounterType: "OUTPATIENT",
        actorUserId: "provider-1",
        actorRoleCodes: ["PROVIDER"],
        expectedVersion: cycle + 1,
        reopenCountBeforeClose: cycle,
      });
    }

    expect(created.map((row) => row.sequence)).toEqual([1, 2, 3]);
    expect(created.map((row) => row.transitionType)).toEqual([
      "ENCOUNTER_CLOSED",
      "ENCOUNTER_CLOSED_AGAIN",
      "ENCOUNTER_CLOSED_AGAIN",
    ]);
  });

  it("generic close does not write dischargedAt; an explicit discharge workflow does", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = {
      encounter: { updateMany },
      encounterLifecycleTransition: {
        create: jest.fn().mockResolvedValue({ id: "lt-1" }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const svc = new EnterpriseEncounterLifecycleService(
      { $transaction: jest.fn() } as never,
      { log: jest.fn() } as never
    );

    await svc.applyCloseTransition(tx as never, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      previousStatus: "OPEN",
      encounterType: "EMERGENCY",
      expectedVersion: 1,
    });
    expect(Object.keys(updateMany.mock.calls[0][0].data)).not.toContain("dischargedAt");

    const dischargedAt = new Date("2026-07-30T11:00:00.000Z");
    await svc.applyCloseTransition(tx as never, {
      facilityId: "fac-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      previousStatus: "OPEN",
      encounterType: "INPATIENT",
      expectedVersion: 2,
      forceDischargedAt: true,
      dischargedAt,
    });
    expect(updateMany.mock.calls[1][0].data.dischargedAt).toBe(dischargedAt);
  });

  it("denies a cross-facility reopen request", async () => {
    const { svc, updateMany } = build();
    await expect(
      svc.reopenEncounter(
        "fac-1",
        "enc-1",
        { reason: "Support correction", facilityId: "fac-2" },
        "admin-1",
        ["MEDORA_SUPER_ADMIN"]
      )
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: D4C7K_REOPEN_CODES.FACILITY_SCOPE }),
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("requires an explicit facility context", async () => {
    const { svc } = build();
    await expect(
      svc.reopenEncounter("", "enc-1", { reason: "Support correction" }, "admin-1", [
        "MEDORA_SUPER_ADMIN",
      ])
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: D4C7K_REOPEN_CODES.FACILITY_SCOPE }),
    });
  });

  it("records platform support context in the reopen audit and timeline", async () => {
    const { svc, audit, lifecycleCreate } = build();
    await svc.reopenEncounter(
      "fac-1",
      "enc-1",
      { reason: "Platform support correction" },
      "platform-1",
      ["MEDORA_SUPER_ADMIN"],
      { platformPrincipal: true, hasFacilityMembership: false }
    );
    const meta = audit.log.mock.calls[0][2].metadata as Record<string, unknown>;
    expect(meta.platformPrincipal).toBe(true);
    expect(meta.crossFacilitySupportAction).toBe(true);
    expect(meta.facilityContextId).toBe("fac-1");
    expect(meta.supportPolicyOverride).toBe(true);
    const row = lifecycleCreate.mock.calls[0][0].data;
    expect(row.supportOverride).toBe(true);
    expect(row.metadataJson.crossFacilitySupportAction).toBe(true);
  });

  it("facility ADMIN reopen is not recorded as a platform support action", async () => {
    const { svc, audit } = build();
    await svc.reopenEncounter("fac-1", "enc-1", { reason: "Closed by mistake" }, "admin-1", [
      "ADMIN",
    ]);
    const meta = audit.log.mock.calls[0][2].metadata as Record<string, unknown>;
    expect(meta.platformPrincipal).toBe(false);
    expect(meta.crossFacilitySupportAction).toBe(false);
    expect(meta.supportPolicyOverride).toBe(false);
  });

  it("projects a reopened encounter as OPEN for care-setting worklists", async () => {
    const { svc } = build();
    const result = await svc.reopenEncounter(
      "fac-1",
      "enc-1",
      { reason: "Closed by mistake" },
      "admin-1",
      ["ADMIN"]
    );
    expect(result.status).toBe("OPEN");
    expect(result.careSetting).toBe("AMBULATORY");
    expect(result.workspaceTarget).toBe("/app/clinic-care");
    expect(result.projectionRestored).toBe(true);
  });
});
