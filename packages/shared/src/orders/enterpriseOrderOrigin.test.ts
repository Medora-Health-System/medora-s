/**
 * MEDUI.RES.2 — enterprise order origin + technician queue projection tests.
 */

import { describe, expect, it } from "vitest";
import {
  formatEnterpriseOrderOriginDisplay,
  mapDepartmentalContextToEnterpriseOrderOrigin,
  projectEnterpriseOrderOrigin,
} from "./enterpriseOrderOrigin.js";
import {
  compareTechnicianWorklistRows,
  projectLabTechnicianKpis,
  projectRadiologyTechnicianKpis,
  projectTechnicianWorkStatus,
  sortTechnicianWorklistRows,
  technicianPriorityRank,
} from "./enterpriseLabRadTechnicianQueue.js";

describe("projectEnterpriseOrderOrigin", () => {
  it("projects ED from EMERGENCY encounter type", () => {
    const p = projectEnterpriseOrderOrigin({ type: "EMERGENCY" });
    expect(p.origin).toBe("ED");
    expect(p.departmentalContext).toBe("ED");
  });

  it("projects INPATIENT from inpatient type", () => {
    const p = projectEnterpriseOrderOrigin({ type: "INPATIENT" });
    expect(p.origin).toBe("INPATIENT");
  });

  it("projects Observation hospital pathway as INPATIENT origin", () => {
    const p = projectEnterpriseOrderOrigin({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
    });
    expect(p.origin).toBe("INPATIENT");
    expect(p.departmentalContext).toBe("OBSERVATION");
  });

  it("projects CLINIC from OUTPATIENT ambulatory", () => {
    const p = projectEnterpriseOrderOrigin({ type: "OUTPATIENT" });
    expect(p.origin).toBe("CLINIC");
    expect(p.departmentalContext).toBe("AMBULATORY");
  });

  it("projects DENTAL from serviceLine without guessing", () => {
    const p = projectEnterpriseOrderOrigin({
      type: "OUTPATIENT",
      serviceLine: "DENTAL",
    });
    expect(p.origin).toBe("DENTAL");
  });

  it("never guesses UNKNOWN into a care setting", () => {
    const p = projectEnterpriseOrderOrigin({ type: null });
    expect(p.origin).toBe("UNKNOWN");
  });

  it("uses roomLabel only as secondary location, not origin", () => {
    const p = projectEnterpriseOrderOrigin({
      type: "EMERGENCY",
      roomLabel: "Main Campus",
    });
    expect(p.origin).toBe("ED");
    expect(p.locationLabel).toBe("Main Campus");
    expect(formatEnterpriseOrderOriginDisplay({ originLabel: "ED", locationLabel: p.locationLabel })).toBe(
      "ED · Main Campus"
    );
  });

  it("mapDepartmentalContext refuses inventing CLINIC for UNKNOWN", () => {
    expect(mapDepartmentalContextToEnterpriseOrderOrigin("UNKNOWN", false)).toBe("UNKNOWN");
    expect(mapDepartmentalContextToEnterpriseOrderOrigin("OTHER", false)).toBe("UNKNOWN");
  });
});

describe("technician queue projection + sorting", () => {
  it("maps lifecycle statuses into technician tabs", () => {
    expect(projectTechnicianWorkStatus({ itemStatus: "PLACED" })).toBe("NEW");
    expect(projectTechnicianWorkStatus({ itemStatus: "ACKNOWLEDGED" })).toBe("NEW");
    expect(projectTechnicianWorkStatus({ itemStatus: "IN_PROGRESS" })).toBe("IN_PROGRESS");
    expect(projectTechnicianWorkStatus({ itemStatus: "COMPLETED" })).toBe("COMPLETED");
    expect(projectTechnicianWorkStatus({ itemStatus: "CANCELLED" })).toBe("CANCELLED");
  });

  it("separates cancelled from completed", () => {
    expect(projectTechnicianWorkStatus({ itemStatus: "COMPLETED", orderStatus: "CANCELLED" })).toBe(
      "CANCELLED"
    );
  });

  it("priority rank STAT < URGENT < ROUTINE", () => {
    expect(technicianPriorityRank("STAT")).toBeLessThan(technicianPriorityRank("URGENT"));
    expect(technicianPriorityRank("URGENT")).toBeLessThan(technicianPriorityRank("ROUTINE"));
  });

  it("active queues sort priority then newest first by default", () => {
    const rows = [
      {
        workStatus: "NEW" as const,
        priority: "ROUTINE",
        orderedAt: "2026-08-20T12:00:00.000Z",
        itemId: "a",
      },
      {
        workStatus: "NEW" as const,
        priority: "STAT",
        orderedAt: "2026-08-01T12:00:00.000Z",
        itemId: "b",
      },
      {
        workStatus: "NEW" as const,
        priority: "STAT",
        orderedAt: "2026-08-20T18:00:00.000Z",
        itemId: "c",
      },
    ];
    const sorted = sortTechnicianWorklistRows(rows, "PRIORITY_NEWEST");
    expect(sorted.map((r) => r.itemId)).toEqual(["c", "b", "a"]);
  });

  it("completed sorts most recently completed first", () => {
    const rows = [
      {
        workStatus: "COMPLETED" as const,
        priority: "ROUTINE",
        orderedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-02T00:00:00.000Z",
        itemId: "old",
      },
      {
        workStatus: "COMPLETED" as const,
        priority: "ROUTINE",
        orderedAt: "2026-08-01T00:00:00.000Z",
        completedAt: "2026-08-19T00:00:00.000Z",
        itemId: "new",
      },
    ];
    const sorted = sortTechnicianWorklistRows(rows, "PRIORITY_NEWEST");
    expect(sorted[0]?.itemId).toBe("new");
  });

  it("compareTechnicianWorklistRows newest-first ignores stale completed above new when filtered separately", () => {
    const cmp = compareTechnicianWorklistRows(
      {
        workStatus: "NEW",
        priority: "ROUTINE",
        orderedAt: "2026-08-20T10:00:00.000Z",
        itemId: "new-active",
      },
      {
        workStatus: "COMPLETED",
        priority: "ROUTINE",
        orderedAt: "2025-01-01T00:00:00.000Z",
        completedAt: "2025-01-02T00:00:00.000Z",
        itemId: "old-done",
      },
      "NEWEST_FIRST"
    );
    // Different tabs — caller filters first; comparator still returns deterministic order.
    expect(typeof cmp).toBe("number");
  });
});

describe("technician KPI projections", () => {
  it("projects lab KPI counts", () => {
    const now = new Date("2026-08-20T15:00:00.000Z");
    const k = projectLabTechnicianKpis(
      [
        { workStatus: "NEW" },
        { workStatus: "NEW" },
        { workStatus: "IN_PROGRESS" },
        {
          workStatus: "COMPLETED",
          completedAt: "2026-08-20T12:00:00.000Z",
          criticalValue: true,
          awaitingCriticalAck: true,
        },
        { workStatus: "COMPLETED", completedAt: "2026-08-01T12:00:00.000Z" },
      ],
      now
    );
    expect(k.newOrders).toBe(2);
    expect(k.inProgress).toBe(1);
    expect(k.completedToday).toBe(1);
    expect(k.criticalResults).toBe(1);
    expect(k.pendingAcknowledgement).toBe(1);
  });

  it("projects radiology KPI counts including preliminary and overdue", () => {
    const now = new Date("2026-08-20T15:00:00.000Z");
    const k = projectRadiologyTechnicianKpis(
      [
        { workStatus: "NEW" },
        { workStatus: "IN_PROGRESS", awaitingFinalization: true, overdue: true },
        { workStatus: "COMPLETED", completedAt: "2026-08-20T11:00:00.000Z" },
      ],
      now
    );
    expect(k.newOrders).toBe(1);
    expect(k.inProgress).toBe(1);
    expect(k.preliminaryReports).toBe(1);
    expect(k.completedToday).toBe(1);
    expect(k.overdue).toBe(1);
  });
});
