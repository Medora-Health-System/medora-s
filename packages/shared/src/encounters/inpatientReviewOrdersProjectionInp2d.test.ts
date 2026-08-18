import { describe, expect, it } from "vitest";
import {
  classifyInpatientReviewOrderClinicalGroup,
  filterInpatientReviewOrderLines,
  inpatientReviewOrdersReuseEnterpriseEngine,
  inpatientReviewOrdersViewingDoesNotComplete,
  projectInpatientReviewOrders,
  resolveInpatientReviewOrderActions,
  summarizeInpatientReviewOrdersForOverview,
} from "./inpatientReviewOrdersProjectionInp2d.js";

function medOrder(overrides?: {
  item?: Record<string, unknown>;
  order?: Record<string, unknown>;
}) {
  return {
    id: "ord-med",
    type: "MEDICATION",
    status: "PLACED",
    priority: "ROUTINE",
    source: "PROVIDER_ORDER",
    orderedBy: "prov-1",
    orderedByDisplayFr: "Dr. Kay",
    createdAt: "2026-08-17T12:00:00.000Z",
    encounterId: "enc-ip",
    items: [
      {
        id: "item-med",
        catalogItemType: "MEDICATION",
        status: "PLACED",
        lifecycleState: "ORDERED",
        frequencyCode: "BID",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        medicationLifecycleStatus: "ACTIVE",
        displayLabelEn: "Ceftriaxone",
        displayLabelFr: "Ceftriaxone",
        ...(overrides?.item ?? {}),
      },
    ],
    ...(overrides?.order ?? {}),
  };
}

describe("MEDUI.INP.2D inpatient Review Orders projection", () => {
  it("reuses the shared enterprise order engine (no inpatient fork)", () => {
    expect(inpatientReviewOrdersReuseEnterpriseEngine()).toBe(true);
    expect(inpatientReviewOrdersViewingDoesNotComplete()).toBe(true);
  });

  it("groups medication / lab / imaging / CARE catalog domains", () => {
    expect(
      classifyInpatientReviewOrderClinicalGroup({ orderType: "MEDICATION", catalogItemType: "MEDICATION" })
    ).toBe("MEDICATIONS");
    expect(classifyInpatientReviewOrderClinicalGroup({ orderType: "LAB", catalogItemType: "LAB_TEST" })).toBe(
      "LABORATORY"
    );
    expect(
      classifyInpatientReviewOrderClinicalGroup({ orderType: "IMAGING", catalogItemType: "IMAGING_STUDY" })
    ).toBe("IMAGING");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "fall_precautions",
      })
    ).toBe("PRECAUTIONS");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "npo_status",
      })
    ).toBe("DIET");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "ambulation_trial",
      })
    ).toBe("ACTIVITY");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "oxygen_therapy",
      })
    ).toBe("RESPIRATORY");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "cardiology_consult",
      })
    ).toBe("CONSULTS");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "glucose_check",
      })
    ).toBe("NURSING");
    expect(
      classifyInpatientReviewOrderClinicalGroup({
        orderType: "CARE",
        catalogItemType: "CARE",
        enterpriseProcedureId: "endotracheal_intubation",
      })
    ).toBe("PROCEDURES");
  });

  it("projects new/unreviewed, scheduled, STAT, PRN, held, discontinued, completed", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        medOrder(),
        {
          id: "ord-stat",
          type: "LAB",
          status: "PLACED",
          priority: "STAT",
          createdAt: "2026-08-17T12:05:00.000Z",
          items: [{ id: "item-stat", catalogItemType: "LAB_TEST", status: "PLACED", displayLabelEn: "Troponin" }],
        },
        {
          id: "ord-prn",
          type: "MEDICATION",
          status: "ACKNOWLEDGED",
          priority: "ROUTINE",
          items: [
            {
              id: "item-prn",
              catalogItemType: "MEDICATION",
              status: "ACKNOWLEDGED",
              frequencyCode: "PRN",
              medicationFulfillmentIntent: "ADMINISTER_CHART",
              medicationLifecycleStatus: "ACTIVE",
              displayLabelEn: "Morphine PRN",
            },
          ],
        },
        {
          id: "ord-hold",
          type: "MEDICATION",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-hold",
              catalogItemType: "MEDICATION",
              status: "ACKNOWLEDGED",
              medicationLifecycleStatus: "ON_HOLD",
              medicationFulfillmentIntent: "ADMINISTER_CHART",
              displayLabelEn: "Heparin",
            },
          ],
        },
        {
          id: "ord-dc",
          type: "MEDICATION",
          status: "CANCELLED",
          items: [
            {
              id: "item-dc",
              catalogItemType: "MEDICATION",
              status: "CANCELLED",
              medicationLifecycleStatus: "DISCONTINUED",
              displayLabelEn: "Stopped abx",
            },
          ],
        },
        {
          id: "ord-done",
          type: "LAB",
          status: "COMPLETED",
          items: [{ id: "item-done", catalogItemType: "LAB_TEST", status: "COMPLETED", completedAt: "2026-08-17T13:00:00.000Z" }],
        },
      ],
    });
    const byId = Object.fromEntries(projection.lines.map((l) => [l.orderItemId, l]));
    expect(byId["item-med"].buckets).toEqual(expect.arrayContaining(["NEW_UNREVIEWED", "SCHEDULED", "ACTIVE"]));
    expect(byId["item-stat"].buckets).toEqual(expect.arrayContaining(["STAT_URGENT", "NEW_UNREVIEWED"]));
    expect(byId["item-prn"].buckets).toContain("PRN");
    expect(byId["item-hold"].buckets).toContain("HELD");
    expect(byId["item-dc"].buckets).toContain("DISCONTINUED");
    expect(byId["item-done"].buckets).toContain("COMPLETED");
    expect(byId["item-done"].completedAtIso).toBe("2026-08-17T13:00:00.000Z");
    expect(projection.viewingDoesNotComplete).toBe(true);
  });

  it("does not invent due/overdue without explicit payload fields", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder({ item: { frequencyCode: "Q8H", status: "ACKNOWLEDGED" } })],
    });
    expect(projection.lines[0].buckets).not.toContain("DUE");
    expect(projection.lines[0].buckets).not.toContain("OVERDUE");
    expect(projection.lines[0].buckets).toContain("SCHEDULED");
  });

  it("projects due/overdue only from explicit fields", () => {
    const due = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        {
          id: "ord-due",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-due-flag",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              due: true,
            },
          ],
        },
      ],
    });
    const overdue = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        {
          id: "ord-overdue",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-overdue-flag",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              overdue: true,
            },
          ],
        },
      ],
    });
    expect(due.lines[0].buckets).toContain("DUE");
    expect(overdue.lines[0].buckets).toContain("OVERDUE");
  });

  it("marks changed lines from enterprise OrderEvent types without treating view as completion", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder({ item: { status: "ACKNOWLEDGED" } })],
      orderEvents: [
        {
          eventType: "MODIFIED",
          performedAt: "2026-08-17T14:00:00.000Z",
          metadata: { orderItemId: "item-med" },
        },
      ],
    });
    expect(projection.lines[0].changed).toBe(true);
    expect(projection.lines[0].lastChangedAtIso).toBe("2026-08-17T14:00:00.000Z");
    expect(projection.lines[0].buckets).not.toContain("COMPLETED");
    expect(projection.viewingDoesNotComplete).toBe(true);
  });

  it("projects pending pharmacy verification without making MAR the order store", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        medOrder({
          item: {
            status: "ACKNOWLEDGED",
            medicationSafetyGovernance: { pharmacyVerificationStatus: "PENDING" },
          },
        }),
      ],
    });
    expect(projection.lines[0].buckets).toContain("PENDING_VERIFICATION");
    expect(projection.lines[0].marManaged).toBe(true);
  });

  it("RN may acknowledge chart-admin meds and CARE nursing tasks, but not prescribe or MAR-complete", () => {
    const med = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    }).lines[0];
    const care = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        {
          id: "ord-care",
          type: "CARE",
          status: "PLACED",
          items: [
            {
              id: "item-care",
              catalogItemType: "CARE",
              status: "PLACED",
              enterpriseProcedureId: "glucose_check",
              manualLabel: "Glucose check",
            },
          ],
        },
      ],
    }).lines[0];
    const rnMed = resolveInpatientReviewOrderActions({
      roles: ["RN"],
      canPrescribe: false,
      encounterSigned: false,
      actorUserId: "rn-1",
      line: med,
    });
    const rnCare = resolveInpatientReviewOrderActions({
      roles: ["RN"],
      canPrescribe: false,
      encounterSigned: false,
      actorUserId: "rn-1",
      line: care,
    });
    expect(rnMed.canAcknowledge).toBe(true);
    expect(rnMed.canComplete).toBe(false);
    expect(rnMed.canHoldDiscontinue).toBe(false);
    expect(rnMed.canCancel).toBe(false);
    expect(rnMed.canCreateProviderOrder).toBe(false);
    expect(rnMed.canCreateRnVerbalOrProtocol).toBe(true);
    expect(rnMed.canOpenMar).toBe(true);
    expect(rnCare.canAcknowledge).toBe(true);
    expect(care.clinicalGroup).toBe("NURSING");
  });

  it("Provider may hold/discontinue medications and create orders; cannot departmental-ack chart meds", () => {
    const med = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    }).lines[0];
    const actions = resolveInpatientReviewOrderActions({
      roles: ["PROVIDER"],
      canPrescribe: true,
      encounterSigned: false,
      actorUserId: "prov-1",
      line: med,
    });
    expect(actions.canCreateProviderOrder).toBe(true);
    expect(actions.canHoldDiscontinue).toBe(true);
    expect(actions.canCancel).toBe(true);
    expect(actions.canAcknowledge).toBe(false);
    expect(actions.canCreateRnVerbalOrProtocol).toBe(false);
    expect(actions.canComplete).toBe(false);
  });

  it("PCT cannot gain order lifecycle or prescribing authority", () => {
    const med = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    }).lines[0];
    const actions = resolveInpatientReviewOrderActions({
      roles: ["PATIENT_CARE_TECH"],
      canPrescribe: false,
      encounterSigned: false,
      line: med,
    });
    expect(actions.canAcknowledge).toBe(false);
    expect(actions.canStart).toBe(false);
    expect(actions.canComplete).toBe(false);
    expect(actions.canHoldDiscontinue).toBe(false);
    expect(actions.canCancel).toBe(false);
    expect(actions.canCreateProviderOrder).toBe(false);
    expect(actions.canCreateRnVerbalOrProtocol).toBe(false);
    expect(actions.canOpenMar).toBe(false);
  });

  it("ADMIN does not become RN via this projection; signed encounters block mutations", () => {
    const med = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    }).lines[0];
    const signed = resolveInpatientReviewOrderActions({
      roles: ["ADMIN"],
      canPrescribe: true,
      encounterSigned: true,
      line: med,
    });
    expect(signed.canAcknowledge).toBe(false);
    expect(signed.canHoldDiscontinue).toBe(false);
    expect(signed.canCreateProviderOrder).toBe(false);
  });

  it("filters needs-action vs discontinued vs completed", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        medOrder(),
        {
          id: "ord-dc",
          type: "MEDICATION",
          status: "CANCELLED",
          items: [
            {
              id: "item-dc",
              catalogItemType: "MEDICATION",
              status: "CANCELLED",
              medicationLifecycleStatus: "DISCONTINUED",
            },
          ],
        },
      ],
    });
    const needs = filterInpatientReviewOrderLines(projection.lines, { bucket: "NEEDS_ACTION" });
    const dc = filterInpatientReviewOrderLines(projection.lines, { bucket: "DISCONTINUED" });
    expect(needs.map((l) => l.orderItemId)).toContain("item-med");
    expect(needs.map((l) => l.orderItemId)).not.toContain("item-dc");
    expect(dc.map((l) => l.orderItemId)).toEqual(["item-dc"]);
  });

  it("preserves ordering-provider attribution and clinical timestamps", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    });
    expect(projection.lines[0].orderedByUserId).toBe("prov-1");
    expect(projection.lines[0].orderedByDisplay).toBe("Dr. Kay");
    expect(projection.lines[0].orderedAtIso).toBe("2026-08-17T12:00:00.000Z");
  });

  it("does not treat JSON consults or MAR rows as the order authority", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        {
          id: "ord-consult",
          type: "CARE",
          status: "PLACED",
          items: [
            {
              id: "item-consult",
              catalogItemType: "CARE",
              status: "PLACED",
              enterpriseProcedureId: "cardiology_consult",
            },
          ],
        },
      ],
    });
    expect(projection.lines).toHaveLength(1);
    expect(projection.lines[0].clinicalGroup).toBe("CONSULTS");
    expect(projection.lines[0].marManaged).toBe(false);
  });

  it("RN does not receive provider cancel/hold on a provider-owned line; RN may cancel own ORDERED line", () => {
    const providerLine = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [medOrder()],
    }).lines[0];
    const rnOnProvider = resolveInpatientReviewOrderActions({
      roles: ["RN"],
      canPrescribe: false,
      encounterSigned: false,
      actorUserId: "rn-1",
      line: providerLine,
    });
    expect(rnOnProvider.canCancel).toBe(false);
    expect(rnOnProvider.canHoldDiscontinue).toBe(false);
    expect(rnOnProvider.canCreateProviderOrder).toBe(false);

    const ownCare = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      orders: [
        {
          id: "ord-own",
          type: "CARE",
          status: "PLACED",
          orderedBy: "rn-1",
          source: "NURSING_PROTOCOL",
          items: [
            {
              id: "item-own",
              catalogItemType: "CARE",
              status: "PLACED",
              lifecycleState: "ORDERED",
              enterpriseProcedureId: "glucose_check",
            },
          ],
        },
      ],
    }).lines[0];
    const rnOwn = resolveInpatientReviewOrderActions({
      roles: ["RN"],
      canPrescribe: false,
      encounterSigned: false,
      actorUserId: "rn-1",
      line: ownCare,
    });
    expect(rnOwn.canCancel).toBe(true);
  });

  it("Overview hint counts new/STAT/due nursing/held from the same projection", () => {
    const projection = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: "2026-08-18T15:00:00.000Z",
      orders: [
        {
          id: "ord-due",
          type: "CARE",
          status: "ACKNOWLEDGED",
          priority: "STAT",
          items: [
            {
              id: "item-due",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              due: true,
            },
          ],
        },
      ],
    });
    const hint = summarizeInpatientReviewOrdersForOverview(projection);
    expect(hint.statUrgent).toBe(1);
    expect(hint.dueNursingActionable).toBe(1);
    expect(hint.overdueNursingActionable).toBe(0);
    expect(hint.held).toBe(0);
  });

  it("projects due/overdue/scheduled from durable timestamps; MAR dose timing stays out of due buckets", () => {
    const now = "2026-08-18T15:00:00.000Z";
    const due = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: now,
      orders: [
        {
          id: "ord-due",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-due",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              lifecycleState: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              due: true,
            },
          ],
        },
      ],
    });
    const overdue = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: now,
      orders: [
        {
          id: "ord-over",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-over",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              lifecycleState: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              intendedAdministrationAt: "2026-08-18T12:00:00.000Z",
            },
          ],
        },
      ],
    });
    const scheduled = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: now,
      orders: [
        {
          id: "ord-sched",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-sched",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              lifecycleState: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
              intendedAdministrationAt: "2026-08-18T18:00:00.000Z",
            },
          ],
        },
      ],
    });
    const unscheduled = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: now,
      orders: [
        {
          id: "ord-unsched",
          type: "CARE",
          status: "ACKNOWLEDGED",
          items: [
            {
              id: "item-unsched",
              catalogItemType: "CARE",
              status: "ACKNOWLEDGED",
              lifecycleState: "ACKNOWLEDGED",
              enterpriseProcedureId: "glucose_check",
            },
          ],
        },
      ],
    });
    const mar = projectInpatientReviewOrders({
      encounterId: "enc-ip",
      nowIso: now,
      orders: [
        medOrder({
          item: {
            status: "ACKNOWLEDGED",
            intendedAdministrationAt: "2026-08-18T12:00:00.000Z",
            frequencyCode: "BID",
          },
        }),
      ],
    });
    expect(due.lines[0].buckets).toContain("DUE");
    expect(due.lines[0].dueClass).toBe("A_EXPLICIT");
    expect(overdue.lines[0].buckets).toContain("OVERDUE");
    expect(overdue.lines[0].dueClass).toBe("A_EXPLICIT");
    expect(scheduled.lines[0].buckets).toContain("SCHEDULED");
    expect(scheduled.lines[0].buckets).not.toContain("DUE");
    expect(scheduled.lines[0].buckets).not.toContain("OVERDUE");
    expect(unscheduled.lines[0].buckets).toContain("ACTIVE");
    expect(unscheduled.lines[0].buckets).not.toContain("DUE");
    expect(unscheduled.lines[0].dueClass).toBe("C_UNSCHEDULED");
    expect(mar.lines[0].marManaged).toBe(true);
    expect(mar.lines[0].dueClass).toBe("D_MAR_DOSE");
    expect(mar.lines[0].buckets).toContain("SCHEDULED");
    expect(mar.lines[0].buckets).not.toContain("DUE");
    expect(mar.lines[0].buckets).not.toContain("OVERDUE");
  });
});
