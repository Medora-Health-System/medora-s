/**
 * MEDUI.D4C.7J — enterprise encounter closure advisory override.
 *
 * Production reproduction: encounter 44d7099e… in facility 2deef640… returned repeated
 * HTTP 400 because unsigned provider documentation and an active infusion were evaluated as
 * hard blockers before any acknowledgement could apply. These specs pin the corrected
 * contract: clinical work is advisory, an authorized provider always closes, and every
 * pending item survives closure.
 */

import { ForbiddenException } from "@nestjs/common";
import { EncountersService } from "./encounters.service";
import { EnterpriseEncounterLifecycleService } from "./enterprise-encounter-lifecycle.service";
import { createMockBedBoardService } from "./encounters.service.test-bed-board.mock";
import { createMockInternalPlacementService } from "./encounters.service.test-internal-placement.mock";
import { createMockEnterpriseAssignmentService } from "./encounters.service.test-enterprise-assignment.mock";
import { D4C7J_ACKNOWLEDGEMENT_VERSION, D4C7J_CLOSE_CODES } from "@medora/shared";

const facilityId = "2deef640-019a-49f4-8593-76ca4aab2334";
const encounterId = "44d7099e-5617-4bc8-93aa-e31452188479";
const userId = "user-provider-1";

type OrderItemSeed = {
  id?: string;
  status?: string;
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  result?: { verifiedAt: Date | null; criticalValue?: boolean; acknowledgedByProviderAt?: Date | null } | null;
  pharmacyDispenseRecord?: { id: string } | null;
  medicationAdministrations?: Array<{ marAction: string | null; notes: string | null; infusionPhase?: string | null }>;
};

function orderSeed(type: string, items: OrderItemSeed[]) {
  return {
    status: "ACTIVE",
    type,
    items: items.map((it, idx) => ({
      id: it.id ?? `${type.toLowerCase()}-item-${idx}`,
      status: it.status ?? "PENDING",
      catalogItemType: it.catalogItemType ?? null,
      medicationFulfillmentIntent: it.medicationFulfillmentIntent ?? null,
      result: it.result ?? null,
      pharmacyDispenseRecord: it.pharmacyDispenseRecord ?? null,
      medicationAdministrations: it.medicationAdministrations ?? [],
    })),
  };
}

const pendingLabOrder = orderSeed("LAB", [{ catalogItemType: "LAB_TEST" }]);
const pendingImagingOrder = orderSeed("IMAGING", [{ catalogItemType: "IMAGING_STUDY" }]);
const pendingMedicationOrders = orderSeed("MEDICATION", [
  { id: "med-1", catalogItemType: "MEDICATION" },
  { id: "med-2", catalogItemType: "MEDICATION" },
]);
const pendingProcedureOrder = orderSeed("CARE", [{ catalogItemType: "CARE" }]);
const activeInfusionOrder = orderSeed("MEDICATION", [
  {
    id: "infusion-1",
    catalogItemType: "MEDICATION",
    medicationAdministrations: [
      { marAction: "administered", notes: "Perfusion IV — début 10:00", infusionPhase: "INFUSION_START" },
    ],
  },
]);
const criticalResultOrder = orderSeed("LAB", [
  {
    id: "lab-critical-1",
    status: "RESULTED",
    catalogItemType: "LAB_TEST",
    result: { verifiedAt: new Date("2026-07-29T10:00:00Z"), criticalValue: true, acknowledgedByProviderAt: null },
  },
]);
const nonFinalResultOrder = orderSeed("LAB", [
  {
    id: "lab-nonfinal-1",
    catalogItemType: "LAB_TEST",
    result: { verifiedAt: null, criticalValue: false, acknowledgedByProviderAt: null },
  },
]);

function buildService(opts: {
  roleCodes?: string[];
  orders?: unknown[];
  openFollowUps?: number;
  status?: string;
  providerSigned?: boolean;
  version?: number;
  encounterExists?: boolean;
  updateManyCount?: number;
  providerNote?: string | null;
  type?: string;
}) {
  const status = opts.status ?? "OPEN";
  const providerSigned = opts.providerSigned !== false;
  const encounter = {
    id: encounterId,
    patientId: "pat-1",
    facilityId,
    type: opts.type ?? "OUTPATIENT",
    status,
    version: opts.version ?? 4,
    workflowState: "IN_TREATMENT",
    roomLabel: null as string | null,
    dischargeStatus: null as string | null,
    dischargedAt: status === "CLOSED" ? new Date("2026-07-29T09:00:00Z") : null,
    updatedAt: new Date("2026-07-29T09:30:00Z"),
    createdAt: new Date("2026-07-29T08:00:00Z"),
    dischargeSummaryJson: {
      dischargeMode: "Retour à domicile",
      dischargeDiagnosis: "Otite moyenne aiguë",
      dischargeInstructions: "Repos, antibiotique",
      returnPrecautions: "Fièvre persistante",
      followUpPlan: "Contrôle dans 7 jours",
      patientInstructionsExplained: true,
    },
    admissionSummaryJson: null as unknown,
    chiefComplaint: "Douleur à l’oreille droite",
    nursingAssessment: { nursingEvalV1: { summaryLinesFr: ["Évaluation infirmière complétée"] } } as unknown,
    providerDocumentationStatus: providerSigned ? "SIGNED" : "DRAFT",
    providerDocumentationSignedAt: providerSigned ? new Date("2026-07-29T09:00:00Z") : null,
    providerNote: opts.providerNote ?? "Note médicale",
    treatmentPlan: "Plan",
    billingCaptureJson: null as unknown,
    physicianAssignedUserId: userId,
  };

  const updateMany = jest.fn().mockResolvedValue({ count: opts.updateManyCount ?? 1 });
  const lifecycleTransitionCreate = jest.fn().mockResolvedValue({ id: "lt-1" });
  const auditLog = jest.fn().mockResolvedValue(undefined);
  const followUpCount = jest.fn().mockResolvedValue(opts.openFollowUps ?? 0);
  const orderFindMany = jest.fn().mockResolvedValue(opts.orders ?? []);

  const txStub = {
    encounter: {
      updateMany,
      findFirst: jest.fn().mockResolvedValue({ ...encounter, status: "CLOSED" }),
    },
    billingEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: "be-1" }),
      update: jest.fn().mockResolvedValue({ id: "be-1" }),
      upsert: jest.fn().mockResolvedValue({ id: "be-1" }),
    },
    diagnosis: { count: jest.fn().mockResolvedValue(1) },
    orderItem: { findFirst: jest.fn().mockResolvedValue(null) },
    encounterClinicalEvent: { create: jest.fn().mockResolvedValue({ id: "ev-1" }) },
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    /** MEDUI.D4C.7K — append-only lifecycle timeline written by the lifecycle authority. */
    encounterLifecycleTransition: {
      create: lifecycleTransitionCreate,
      findFirst: jest.fn().mockResolvedValue(null),
    },
  };

  const prisma = {
    encounter: {
      findFirst: jest.fn().mockImplementation(async () =>
        opts.encounterExists === false ? null : encounter
      ),
      updateMany,
    },
    order: { findMany: orderFindMany },
    triageVitalsReading: { aggregate: jest.fn().mockResolvedValue({ _max: { recordedAt: null } }) },
    encounterClinicalEvent: { aggregate: jest.fn().mockResolvedValue({ _max: { createdAt: null } }) },
    followUp: { count: followUpCount },
    patient: { findFirst: jest.fn().mockResolvedValue({ id: "pat-1", latestVitalsAt: null }) },
    user: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: userId, firstName: "Marie", lastName: "Provider" }),
    },
    userRole: {
      findMany: jest
        .fn()
        .mockResolvedValue((opts.roleCodes ?? ["PROVIDER"]).map((code) => ({ role: { code } }))),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(txStub)),
  };

  /**
   * MEDUI.D4C.7K — the real lifecycle authority is used here: `close()` has no legacy fallback,
   * so the enterprise close transition and its timeline row are exercised end to end.
   */
  const lifecycle = new EnterpriseEncounterLifecycleService(prisma as never, {
    log: auditLog,
  } as never);

  const svc = new EncountersService(
    prisma as never,
    { log: auditLog } as never,
    {} as never,
    createMockBedBoardService() as never,
    createMockInternalPlacementService() as never,
    createMockEnterpriseAssignmentService() as never,
    lifecycle
  );

  return {
    svc,
    prisma,
    txStub,
    updateMany,
    auditLog,
    orderFindMany,
    followUpCount,
    encounter,
    lifecycle,
    lifecycleTransitionCreate,
  };
}

function ackBody(extra: Record<string, unknown> = {}) {
  return {
    acknowledgePendingClinicalItems: true,
    acknowledgementVersion: D4C7J_ACKNOWLEDGEMENT_VERSION,
    acknowledgementReason: "PROVIDER_ELECTED_TO_CLOSE",
    clientRequestId: "close-req-1",
    ...extra,
  } as never;
}

async function expectAdvisory(promise: Promise<unknown>) {
  await expect(promise).rejects.toMatchObject({
    status: 409,
    response: { code: D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS },
  });
}

describe("MEDUI.D4C.7J — A. advisory close preflight", () => {
  it("no pending items — acknowledgement not required", async () => {
    const { svc } = buildService({ orders: [] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.requiresAcknowledgement).toBe(false);
    expect(pf.pendingTotal).toBe(0);
    expect(pf.clinicalBlockers).toEqual([]);
    expect(pf.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
  });

  it("pending laboratory order is advisory", async () => {
    const { svc } = buildService({ orders: [pendingLabOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.laboratory).toBe(1);
    expect(pf.requiresAcknowledgement).toBe(true);
    expect(pf.canCloseAfterAcknowledgement).toBe(true);
  });

  it("pending imaging order is advisory", async () => {
    const { svc } = buildService({ orders: [pendingImagingOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.imaging).toBe(1);
  });

  it("pending medications are advisory with exact counts", async () => {
    const { svc } = buildService({ orders: [pendingMedicationOrders] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.medications).toBe(2);
  });

  it("pending procedure (CARE) is advisory", async () => {
    const { svc } = buildService({ orders: [pendingProcedureOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.procedures).toBe(1);
  });

  it("non-final result is advisory", async () => {
    const { svc } = buildService({ orders: [nonFinalResultOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.results).toBe(1);
  });

  it("open follow-up is advisory", async () => {
    const { svc } = buildService({ orders: [], openFollowUps: 2 });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.followUps).toBe(2);
    expect(pf.requiresAcknowledgement).toBe(true);
  });

  it("active infusion is a priority advisory, not a blocker", async () => {
    const { svc } = buildService({ orders: [activeInfusionOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.priorityCategories).toContain("activeInfusion");
    expect(pf.clinicalBlockers).toEqual([]);
    expect(pf.canCloseAfterAcknowledgement).toBe(true);
  });

  it("unacknowledged critical result is a priority advisory", async () => {
    const { svc } = buildService({ orders: [criticalResultOrder] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.priorityCategories).toContain("criticalResult");
    expect(pf.pending.unacknowledgedResults).toBe(1);
    expect(pf.clinicalBlockers).toEqual([]);
  });

  it("unsigned provider documentation is advisory documentation work", async () => {
    const { svc } = buildService({ orders: [], providerSigned: false });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.documentation).toBeGreaterThan(0);
    expect(pf.clinicalBlockers).toEqual([]);
    expect(pf.canCloseAfterAcknowledgement).toBe(true);
  });

  it("combined pending items are reported together", async () => {
    const { svc } = buildService({
      orders: [pendingLabOrder, pendingImagingOrder, pendingMedicationOrders, activeInfusionOrder],
      openFollowUps: 1,
      providerSigned: false,
    });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["PROVIDER"]);
    expect(pf.pending.laboratory).toBe(1);
    expect(pf.pending.imaging).toBe(1);
    expect(pf.pending.medications).toBe(2);
    expect(pf.pending.followUps).toBe(1);
    expect(pf.pending.documentation).toBeGreaterThan(0);
    expect(pf.priorityCategories).toContain("activeInfusion");
    expect(pf.requiresAcknowledgement).toBe(true);
  });

  it("non-treating role sees advisory information but cannot close after acknowledgement", async () => {
    const { svc } = buildService({ orders: [pendingMedicationOrders] });
    const pf = await svc.getEncounterClosePreflight(facilityId, encounterId, undefined, ["BILLING"]);
    expect(pf.requiresAcknowledgement).toBe(true);
    expect(pf.canCloseAfterAcknowledgement).toBe(false);
  });
});

describe("MEDUI.D4C.7J — B. close without acknowledgement", () => {
  it("returns the typed advisory conflict instead of a generic 400", async () => {
    const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
    await expectAdvisory(svc.close(facilityId, encounterId, {} as never, userId));
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("advisory payload carries the preflight, counts, and acknowledgement version", async () => {
    const { svc } = buildService({ orders: [pendingMedicationOrders], openFollowUps: 1 });
    await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, ["PROVIDER"]).catch(
      (err: { response: Record<string, any> }) => {
        expect(err.response.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
        expect(err.response.preflight.pending.medications).toBe(2);
        expect(err.response.preflight.pending.followUps).toBe(1);
        expect(err.response.preflight.clinicalBlockers).toEqual([]);
        expect(err.response.overrideAllowed).toBe(true);
        expect(err.response.nonOverridable).toEqual([]);
      }
    );
  });

  it("does not mutate pending clinical items", async () => {
    const { svc, txStub, prisma } = buildService({ orders: [pendingMedicationOrders] });
    await expectAdvisory(svc.close(facilityId, encounterId, {} as never, userId));
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(txStub.encounterClinicalEvent.create).not.toHaveBeenCalled();
  });

  it("active infusion no longer produces a non-overridable rejection", async () => {
    const { svc } = buildService({ orders: [activeInfusionOrder] });
    await svc.close(facilityId, encounterId, {} as never, userId).catch((err: { response: any }) => {
      expect(err.response.code).toBe(D4C7J_CLOSE_CODES.PENDING_CLINICAL_ITEMS);
      expect(err.response.code).not.toBe("ENCOUNTER_CLOSE_NON_OVERRIDABLE_BLOCKERS");
      expect(err.response.preflight.priorityCategories).toContain("activeInfusion");
    });
  });
});

describe("MEDUI.D4C.7J — C. close with acknowledgement", () => {
  const scenarios: Array<{ label: string; orders: unknown[]; followUps?: number; signed?: boolean }> = [
    { label: "pending laboratory", orders: [pendingLabOrder] },
    { label: "pending imaging", orders: [pendingImagingOrder] },
    { label: "pending medications", orders: [pendingMedicationOrders] },
    { label: "active infusion", orders: [activeInfusionOrder] },
    { label: "non-final result", orders: [nonFinalResultOrder] },
    { label: "unacknowledged critical result", orders: [criticalResultOrder] },
    { label: "open follow-up", orders: [], followUps: 1 },
    { label: "unsigned documentation", orders: [], signed: false },
  ];

  for (const scenario of scenarios) {
    it(`closes with ${scenario.label} acknowledged`, async () => {
      const { svc, updateMany, auditLog } = buildService({
        orders: scenario.orders,
        openFollowUps: scenario.followUps ?? 0,
        providerSigned: scenario.signed !== false,
      });
      const res = (await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, [
        "PROVIDER",
      ])) as { closeResult: Record<string, unknown> };

      expect(updateMany).toHaveBeenCalledTimes(1);
      expect((updateMany.mock.calls[0]![0] as any).data.status).toBe("CLOSED");
      expect(res.closeResult.status).toBe("CLOSED");
      expect(res.closeResult.pendingClinicalItemsPreserved).toBe(true);
      expect(res.closeResult.idempotent).toBe(false);
      expect(res.closeResult.acknowledged).toBe(true);
      expect(auditLog).toHaveBeenCalledTimes(1);
    });
  }

  it("preserves every pending item — closure only writes encounter lifecycle fields", async () => {
    const { svc, updateMany, txStub } = buildService({
      orders: [pendingMedicationOrders, pendingLabOrder, activeInfusionOrder],
      openFollowUps: 1,
    });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"]);

    const written = (updateMany.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(Object.keys(written)).not.toContain("orders");
    expect(Object.keys(written)).not.toContain("medicationAdministrations");
    expect(txStub.orderItem.findFirst).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.anything() })
    );
    // No order/result/medication mutation helper is reachable from the close transaction.
    expect((txStub as any).order).toBeUndefined();
  });

  it("audit event records the acknowledgement, counts, and priority categories once", async () => {
    const { svc, auditLog } = buildService({
      orders: [pendingMedicationOrders, activeInfusionOrder],
      openFollowUps: 1,
    });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"]);

    expect(auditLog).toHaveBeenCalledTimes(1);
    const meta = (auditLog.mock.calls[0]![2] as any).metadata as Record<string, any>;
    expect(meta.advisoryAcknowledged).toBe(true);
    expect(meta.acknowledgementVersion).toBe(D4C7J_ACKNOWLEDGEMENT_VERSION);
    expect(meta.acknowledgementReason).toBe("PROVIDER_ELECTED_TO_CLOSE");
    expect(meta.previousStatus).toBe("OPEN");
    expect(meta.newStatus).toBe("CLOSED");
    expect(meta.pendingItemCounts.medications).toBe(2);
    expect(meta.pendingItemCounts.followUps).toBe(1);
    expect(meta.priorityWarningCategories).toContain("activeInfusion");
    expect(meta.pendingClinicalItemsPreserved).toBe(true);
    expect(meta.clientRequestId).toBe("close-req-1");
  });

  it("legacy D4C.7F acknowledgement field still closes the encounter", async () => {
    const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(
      facilityId,
      encounterId,
      { acknowledgePendingItems: true } as never,
      userId,
      undefined,
      undefined,
      ["PROVIDER"]
    );
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("closes directly when nothing is pending (no advisory round-trip)", async () => {
    const { svc, updateMany, auditLog } = buildService({ orders: [] });
    const res = (await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, [
      "PROVIDER",
    ])) as { closeResult: Record<string, unknown> };
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(res.closeResult.acknowledged).toBe(false);
    expect(auditLog).toHaveBeenCalledTimes(1);
  });
});

describe("MEDUI.D4C.7J — D. idempotency", () => {
  it("already closed returns canonical success with idempotent: true and no new audit", async () => {
    const { svc, auditLog, updateMany } = buildService({ status: "CLOSED", orders: [] });
    const res = (await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, [
      "PROVIDER",
    ])) as { closeResult: Record<string, unknown> };

    expect(res.closeResult.idempotent).toBe(true);
    expect(res.closeResult.status).toBe("CLOSED");
    expect(auditLog).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("repeating the same acknowledged request is safe (second call is idempotent)", async () => {
    const first = buildService({ orders: [pendingMedicationOrders] });
    await first.svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"]);
    expect(first.auditLog).toHaveBeenCalledTimes(1);

    const second = buildService({ status: "CLOSED", orders: [pendingMedicationOrders] });
    const res = (await second.svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, [
      "PROVIDER",
    ])) as { closeResult: Record<string, unknown> };
    expect(res.closeResult.idempotent).toBe(true);
    expect(second.auditLog).not.toHaveBeenCalled();
  });
});

describe("MEDUI.D4C.7J — E. authorization", () => {
  it("PROVIDER may acknowledge and close", async () => {
    const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"]);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("credentialed provider alias may acknowledge and close", async () => {
    const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PHYSICIAN"]);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("RN retains existing encounter-closure permission for acknowledgement", async () => {
    const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["RN"]);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("MEDORA_SUPER_ADMIN acknowledgement is allowed and flagged as support policy", async () => {
    const { svc, auditLog } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, [
      "MEDORA_SUPER_ADMIN",
    ]);
    const meta = (auditLog.mock.calls[0]![2] as any).metadata as Record<string, unknown>;
    expect(meta.supportPolicyOverride).toBe(true);
  });

  for (const role of ["PHARMACY", "BILLING", "FRONT_DESK", "PATIENT_CARE_TECH"]) {
    it(`${role} may not acknowledge pending clinical items`, async () => {
      const { svc, updateMany } = buildService({ orders: [pendingMedicationOrders] });
      await expect(
        svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, [role])
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(updateMany).not.toHaveBeenCalled();
    });
  }

  it("ADMIN may acknowledge pending clinical items (MEDUI.D4C.7K CLOSE_ENCOUNTER)", async () => {
    const { svc, updateMany, auditLog } = buildService({ orders: [pendingMedicationOrders] });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["ADMIN"]);
    expect(updateMany).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalled();
  });

  it("an encounter in another facility is not found (facility isolation)", async () => {
    const { svc, updateMany } = buildService({ orders: [], encounterExists: false });
    await expect(
      svc.close("other-facility", encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"])
    ).rejects.toMatchObject({ status: 404 });
    expect(updateMany).not.toHaveBeenCalled();
  });
});

describe("MEDUI.D4C.7J — F. concurrency", () => {
  it("stale expectedVersion is rejected with a typed conflict before any clinical evaluation", async () => {
    const { svc, updateMany, orderFindMany } = buildService({ version: 9, orders: [pendingMedicationOrders] });
    await expect(
      svc.close(facilityId, encounterId, ackBody({ expectedVersion: 4 }), userId, undefined, undefined, [
        "PROVIDER",
      ])
    ).rejects.toMatchObject({
      status: 409,
      response: { code: D4C7J_CLOSE_CODES.STALE_VERSION },
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(orderFindMany).not.toHaveBeenCalled();
  });

  it("matching expectedVersion proceeds to close", async () => {
    const { svc, updateMany } = buildService({ version: 9, orders: [] });
    await svc.close(facilityId, encounterId, ackBody({ expectedVersion: 9 }), userId, undefined, undefined, [
      "PROVIDER",
    ]);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it("a concurrent writer wins: the losing close reports a conflict and does not duplicate audit", async () => {
    const { svc, auditLog } = buildService({ orders: [], updateManyCount: 0 });
    await expect(
      svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"])
    ).rejects.toMatchObject({ status: 409, response: { code: "ENCOUNTER_CONCURRENT_MODIFICATION" } });
    expect(auditLog).not.toHaveBeenCalled();
  });
});

describe("MEDUI.D4C.7K — G. required lifecycle authority", () => {
  it("EncountersService requires the lifecycle service (no optional injection)", () => {
    expect(EncountersService.length).toBe(7);
  });

  it("every close writes the append-only lifecycle transition row", async () => {
    const { svc, lifecycleTransitionCreate } = buildService({ orders: [] });
    await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, ["PROVIDER"]);
    expect(lifecycleTransitionCreate).toHaveBeenCalledTimes(1);
    const row = (lifecycleTransitionCreate.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(row.transitionType).toBe("ENCOUNTER_CLOSED");
    expect(row.previousState).toBe("OPEN");
    expect(row.newState).toBe("CLOSED");
  });

  it("records ENCOUNTER_CLOSED_AGAIN after a prior reopen cycle", async () => {
    const { svc, lifecycleTransitionCreate, encounter } = buildService({ orders: [] });
    (encounter as unknown as { reopenCount: number }).reopenCount = 1;
    await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, ["PROVIDER"]);
    const row = (lifecycleTransitionCreate.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(row.transitionType).toBe("ENCOUNTER_CLOSED_AGAIN");
  });

  it("no legacy close path executes when the lifecycle service is missing", async () => {
    const { prisma, txStub, updateMany, auditLog } = buildService({ orders: [] });
    const withoutLifecycle = new EncountersService(
      prisma as never,
      { log: auditLog } as never,
      {} as never,
      createMockBedBoardService() as never,
      createMockInternalPlacementService() as never,
      createMockEnterpriseAssignmentService() as never,
      undefined as never
    );
    await expect(
      withoutLifecycle.close(facilityId, encounterId, {} as never, userId, undefined, undefined, [
        "PROVIDER",
      ])
    ).rejects.toBeTruthy();
    expect(updateMany).not.toHaveBeenCalled();
    expect(txStub.encounterLifecycleTransition.create).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("close records the platform support context in audit metadata", async () => {
    const { svc, auditLog } = buildService({ orders: [] });
    await svc.close(
      facilityId,
      encounterId,
      {} as never,
      userId,
      undefined,
      undefined,
      ["MEDORA_SUPER_ADMIN"],
      "req-1",
      { platformPrincipal: true, hasFacilityMembership: false }
    );
    const meta = (auditLog.mock.calls[0]![2] as any).metadata as Record<string, unknown>;
    expect(meta.platformPrincipal).toBe(true);
    expect(meta.crossFacilitySupportAction).toBe(true);
    expect(meta.facilityContextId).toBe(facilityId);
  });

  it("facility ADMIN close is not flagged as a platform action", async () => {
    const { svc, auditLog } = buildService({ orders: [] });
    await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, ["ADMIN"]);
    const meta = (auditLog.mock.calls[0]![2] as any).metadata as Record<string, unknown>;
    expect(meta.platformPrincipal).toBe(false);
    expect(meta.crossFacilitySupportAction).toBe(false);
  });
});

describe("MEDUI.D4C.7K — H. dischargedAt ownership", () => {
  it("generic ambulatory close does not write dischargedAt", async () => {
    const { svc, updateMany } = buildService({ orders: [] });
    await svc.close(facilityId, encounterId, {} as never, userId, undefined, undefined, ["PROVIDER"]);
    const written = (updateMany.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(written.status).toBe("CLOSED");
    expect(written.closedAt).toBeInstanceOf(Date);
    expect(written.closedByUserId).toBe(userId);
    expect(Object.keys(written)).not.toContain("dischargedAt");
  });

  it("generic emergency close does not write dischargedAt either", async () => {
    const { svc, updateMany } = buildService({ orders: [], type: "EMERGENCY" });
    await svc.close(facilityId, encounterId, ackBody(), userId, undefined, undefined, ["PROVIDER"]);
    const written = (updateMany.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(Object.keys(written)).not.toContain("dischargedAt");
  });

  it("explicit discharge workflow writes dischargedAt", async () => {
    const { svc, updateMany } = buildService({ orders: [] });
    await svc.close(
      facilityId,
      encounterId,
      { dischargeStatus: "DISCHARGED" } as never,
      userId,
      undefined,
      undefined,
      ["PROVIDER"]
    );
    const written = (updateMany.mock.calls[0]![0] as any).data as Record<string, unknown>;
    expect(written.dischargedAt).toBeInstanceOf(Date);
    expect(written.dischargeStatus).toBe("DISCHARGED");
  });
});
