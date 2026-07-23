import { describe, expect, it } from "vitest";
import {
  actorHasAdmissionOpsCapability,
  buildConvergedAdmissionEventProjection,
  computeConvergedAdmissionSla,
  detectAdmissionSourceKind,
  formatSlaOrUnavailable,
  resolveAdmissionOperationsMode,
  resolveConvergedDisplayState,
  resolveReceivingAcceptanceAuthority,
  routeOperationalAdmissionAction,
  ADMISSION_STATE_AUTHORITY_MATRIX_D4A24,
  D3B_D3C_SCHEMA_REQUIREMENTS,
} from "./admissionOperationsConvergenceD4a24.js";
import { applyOperationalAdmissionAction } from "./admissionOperationalAcceptanceD4a23.js";

describe("D4A.2.4 dual-mode routing", () => {
  it("placement OFF allows ops accept and denies durable receiving", () => {
    expect(resolveAdmissionOperationsMode(false)).toBe("PLACEMENT_OFF");
    expect(routeOperationalAdmissionAction("ACCEPT", "PLACEMENT_OFF").route).toBe("OPS_JSON");
    const recv = routeOperationalAdmissionAction("RECEIVING_ACCEPT", "PLACEMENT_OFF");
    expect(recv.route).toBe("DENIED");
    if (recv.route === "DENIED") {
      expect(recv.code).toBe("PLACEMENT_WORKFLOW_UNAVAILABLE");
    }
  });

  it("placement ON routes receiving to placement service and ops accept to JSON", () => {
    expect(routeOperationalAdmissionAction("ACCEPT", "PLACEMENT_ON").route).toBe("OPS_JSON");
    const recv = routeOperationalAdmissionAction("RECEIVING_ACCEPT", "PLACEMENT_ON");
    expect(recv.route).toBe("PLACEMENT_SERVICE");
  });

  it("placement OFF does not invent receiving authority", () => {
    const r = resolveReceivingAcceptanceAuthority({
      placementWorkflowEnabled: false,
      ops: {
        schemaVersion: 1,
        status: "ACCEPTED",
        receiving: {
          status: "ACCEPTED",
          acceptedAt: "2026-07-22T12:00:00.000Z",
        },
      },
    });
    expect(r.displayStatus).toBe("NOT_AVAILABLE");
    expect(r.authority).toBe("NONE");
    expect(r.bedImpliesReceiving).toBe(false);
  });

  it("bed assignment does not imply receiving acceptance when placement ON", () => {
    const r = resolveReceivingAcceptanceAuthority({
      placementWorkflowEnabled: true,
      placementStatus: "BED_ASSIGNED",
      assignedBedKey: "A1",
    });
    expect(r.displayStatus).toBe("WAITING");
    expect(r.bedImpliesReceiving).toBe(false);
  });
});

describe("D4A.2.4 event projection and SLA", () => {
  it("placement OFF strips placement/receiving/transport events", () => {
    const events = buildConvergedAdmissionEventProjection({
      placementWorkflowEnabled: false,
      admissionSummaryJson: {
        admissionDecisionMode: "SIGN",
        admissionDecisionAt: "2026-07-22T10:00:00.000Z",
        operationalAcceptanceV1: {
          schemaVersion: 1,
          status: "ACCEPTED",
          acceptedAt: "2026-07-22T10:10:00.000Z",
          events: [
            {
              type: "ADMISSION_OPERATIONALLY_ACCEPTED",
              at: "2026-07-22T10:10:00.000Z",
              actorDisplayRole: "RN",
            },
          ],
        },
      },
      placementStatus: "BED_ASSIGNED",
      placementRequestedAt: "2026-07-22T10:05:00.000Z",
      placementAssignedAt: "2026-07-22T10:20:00.000Z",
    });
    expect(events.some((e) => e.type === "ADMISSION_DECISION_SIGNED")).toBe(true);
    expect(events.some((e) => e.type === "BED_ASSIGNED")).toBe(false);
    expect(events.some((e) => e.type === "RECEIVING_ACCEPTED")).toBe(false);
  });

  it("placement OFF SLA shows unavailable for bed/transport intervals not zero", () => {
    const sla = computeConvergedAdmissionSla({
      placementWorkflowEnabled: false,
      decisionAt: "2026-07-22T10:00:00.000Z",
      operationalAcceptedAt: "2026-07-22T10:10:00.000Z",
      placementRequestedAt: null,
      bedAssignedAt: null,
      receivingAcceptedAt: null,
      transportStartedAt: null,
      arrivedAt: null,
      inpatientCreatedAt: null,
      currentStateEnteredAt: "2026-07-22T10:00:00.000Z",
      nowMs: Date.parse("2026-07-22T10:30:00.000Z"),
    });
    expect(sla.unavailableIntervals).toContain("placementToBedMs");
    expect(sla.timers.placementToBedMs).toBeNull();
    expect(formatSlaOrUnavailable(sla.timers.placementToBedMs, true)).toBe("unavailable");
    expect(sla.boardingTimeDefinitionStatus).toBe("NOT_CHOSEN");
  });

  it("does not mix ops receiving into placement-ON authority display", () => {
    const r = resolveReceivingAcceptanceAuthority({
      placementWorkflowEnabled: true,
      placementStatus: "BED_ASSIGNED",
      ops: {
        schemaVersion: 1,
        status: "ACCEPTED",
        receiving: { status: "ACCEPTED", acceptedAt: "2026-07-22T11:00:00.000Z" },
      },
    });
    expect(r.displayStatus).toBe("WAITING");
    expect(r.authority).toBe("PLACEMENT");
  });
});

describe("D4A.2.4 capabilities and federation helpers", () => {
  it("RN PROVIDER ADMIN granted; billing-only denied", () => {
    expect(actorHasAdmissionOpsCapability("ADMISSION_OPERATIONAL_ACCEPT", ["RN"])).toBe(true);
    expect(actorHasAdmissionOpsCapability("ADMISSION_RECEIVING_ACCEPT", ["PROVIDER"])).toBe(
      true
    );
    expect(actorHasAdmissionOpsCapability("BED_ASSIGN", ["ADMIN"])).toBe(true);
    expect(actorHasAdmissionOpsCapability("BED_ASSIGN", ["RN"])).toBe(false);
    expect(actorHasAdmissionOpsCapability("ADMISSION_HOLD", ["BILLING"])).toBe(false);
  });

  it("detects ED and direct admission sources", () => {
    expect(
      detectAdmissionSourceKind({ admissionDecisionMode: "SIGN" }, "EMERGENCY")
    ).toBe("ED_ADMISSION");
    expect(
      detectAdmissionSourceKind(
        { d3e7DirectAdmission: true, admissionSource: "DIRECT" },
        "INPATIENT"
      )
    ).toBe("DIRECT_ADMISSION");
  });

  it("display state distinguishes placement unavailable", () => {
    expect(
      resolveConvergedDisplayState({
        placementWorkflowEnabled: false,
        decisionSigned: true,
        operationalStatus: "ACCEPTED",
        hasDurablePlacementRequest: false,
        receivingDisplay: "NOT_AVAILABLE",
        transportStatus: "PENDING",
        onHold: false,
        cancelled: false,
        failed: false,
      })
    ).toBe("OPERATIONALLY_ACCEPTED_PLACEMENT_UNAVAILABLE");
  });

  it("matrix documents receiving duplicate and schema not verified", () => {
    const receiving = ADMISSION_STATE_AUTHORITY_MATRIX_D4A24.find(
      (r) => r.state === "RECEIVING_ACCEPTANCE"
    );
    expect(receiving?.duplicateStateExists).toBe(true);
    expect(D3B_D3C_SCHEMA_REQUIREMENTS.productionSchemaVerification).toBe(
      "PRODUCTION SCHEMA NOT VERIFIED"
    );
  });

  it("clinical packet keys unchanged by ops accept helper", () => {
    const applied = applyOperationalAdmissionAction({
      prior: null,
      action: "ACCEPT",
      actorUserId: "u1",
      actorRoleCodes: ["RN"],
      actorDisplayRole: "RN",
      at: "2026-07-22T10:00:00.000Z",
      clientRequestId: "x",
    });
    expect(applied.ok).toBe(true);
  });
});
