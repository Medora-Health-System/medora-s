/**
 * D4A.2.7 — Enterprise Clinical Command Layer shared contract tests.
 */
import { describe, expect, it } from "vitest";
import {
  ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID,
  PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
  buildCapacityFromCensusSummary,
  buildTrackBoardRowFromCensusAndSynthesis,
  deriveAlertsFromTrackBoard,
  emptyEnterpriseCommandDocV1,
  enterpriseCommandMustConsumeClinicalSynthesis,
  enterpriseCommandMustNotDuplicateDomainEngines,
  enterpriseCommandMustNotEnablePlacement,
  enterpriseCommandMustNotOwnClinicalDocumentation,
  enterpriseDashboardsAreNotLegalRecords,
  filterEnterprisePatientList,
  mergeEnterpriseCommandIntoSummary,
  readEnterpriseCommandDoc,
  upsertEnterpriseEscalation,
  upsertEnterpriseTask,
  type EnterpriseTrackBoardRowV1,
  type HospitalCensusPatientRow,
} from "../index.js";

function censusRow(over: Partial<HospitalCensusPatientRow> = {}): HospitalCensusPatientRow {
  return {
    encounterId: "enc-1",
    clinicalContext: "INPATIENT",
    patientName: "Jean Test",
    mrn: "MRN1",
    ageSex: "40M",
    unitRoomBed: "MS-101-A",
    chiefComplaint: null,
    attendingName: "Dr A",
    nurseName: "RN B",
    admittedAt: "2026-07-20T10:00:00.000Z",
    losHours: 48,
    alerts: [{ code: "ISOLATION", severity: "warning" }],
    ...over,
  };
}

describe("MEDUI.ENTERPRISE_COMMAND_LAYER.D4A2_7 shared", () => {
  it("exposes certification and architectural invariants", () => {
    expect(ENTERPRISE_COMMAND_LAYER_CERTIFICATION_ID).toBe(
      "MEDUI.ENTERPRISE_COMMAND_LAYER.D4A2_7"
    );
    expect(enterpriseCommandMustConsumeClinicalSynthesis()).toBe(true);
    expect(enterpriseCommandMustNotOwnClinicalDocumentation()).toBe(true);
    expect(enterpriseCommandMustNotEnablePlacement()).toBe(true);
    expect(enterpriseCommandMustNotDuplicateDomainEngines()).toBe(true);
    expect(enterpriseDashboardsAreNotLegalRecords()).toBe(true);
  });

  it("builds track board rows from census + synthesis without owning clinical docs", () => {
    const row = buildTrackBoardRowFromCensusAndSynthesis({
      census: censusRow(),
      synthesis: {
        certification: PROVIDER_LEGAL_RECORD_SYNTHESIS_CERTIFICATION_ID,
        encounterId: "enc-1",
        patientId: "p1",
        status: "ACTIVE",
        levelOfCare: "MED_SURG",
        lengthOfStayHours: 50,
        dischargeReadiness: {
          medicalReady: false,
          workflowState: "IN_PROGRESS",
          barrierCount: 1,
        },
        criticalUnacknowledgedCount: 2,
        pendingConsultCount: 1,
        pendingImagingCount: 3,
        attendingDisplayName: "Dr Synth",
        generatedAt: "2026-07-22T12:00:00.000Z",
        reusedClinicalSynthesisService: true,
      },
    });
    expect(row.unit).toBe("MS");
    expect(row.room).toBe("101");
    expect(row.bed).toBe("A");
    expect(row.provider).toBe("Dr Synth");
    expect(row.isolation).toBe(true);
    expect(row.pendingImaging).toBe(3);
    expect(row.pendingConsult).toBe(1);
    expect(row.criticalUnacknowledged).toBe(2);
    expect(row.source).toBe("CLINICAL_SYNTHESIS");
    expect(row.currentBarrier).toContain("barriers:1");
  });

  it("filters patient lists and derives alerts from track board", () => {
    const rows: EnterpriseTrackBoardRowV1[] = [
      {
        ...buildTrackBoardRowFromCensusAndSynthesis({ census: censusRow() }),
        criticalUnacknowledged: 1,
        dischargeReady: true,
        pendingImaging: 2,
        rapidResponse: true,
      },
      buildTrackBoardRowFromCensusAndSynthesis({
        census: censusRow({
          encounterId: "enc-2",
          clinicalContext: "OBSERVATION",
          patientName: "Obs",
          alerts: [],
        }),
      }),
    ];
    expect(filterEnterprisePatientList(rows, "OBSERVATION")).toHaveLength(1);
    expect(filterEnterprisePatientList(rows, "DISCHARGE_TODAY")).toHaveLength(1);
    expect(filterEnterprisePatientList(rows, "PENDING_IMAGING")).toHaveLength(1);
    expect(filterEnterprisePatientList(rows, "CRITICAL_RESULTS")).toHaveLength(1);
    expect(filterEnterprisePatientList(rows, "RAPID_RESPONSE")).toHaveLength(1);
    const alerts = deriveAlertsFromTrackBoard(rows);
    expect(alerts.some((a) => a.alertType === "CRITICAL_LAB")).toBe(true);
    expect(alerts.some((a) => a.alertType === "RAPID_RESPONSE")).toBe(true);
  });

  it("builds capacity without inferring or enabling placement", () => {
    const cap = buildCapacityFromCensusSummary({
      summary: {
        activeObservation: 2,
        activeInpatient: 8,
        activeHospitalPatients: 10,
        placementRequested: 1,
        awaitingBed: 1,
        readyForTransfer: 0,
        admissionsToday: 3,
        dischargesToday: 2,
        bedsTotal: 20,
        bedsAvailable: 5,
        bedsOccupied: 14,
        bedsCleaning: 1,
        bedsBlocked: 0,
      },
      operationalSnapshot: {
        scope: "ALL_HOSPITAL_CARE",
        active: 10,
        rnUnassigned: 0,
        physicianUnassigned: 0,
        reassessmentOverdue: 0,
        rnReassessmentOverdue: 0,
        physicianReassessmentOverdue: 0,
        vitalsStale: 0,
        pendingResults: 4,
        criticalResults: 1,
        los24hOrMore: 6,
        readyDischarge: 2,
        awaitingBed: 1,
      },
    });
    expect(cap.placementLogicEnabled).toBe(false);
    expect(cap.inferredCapacity).toBe(false);
    expect(cap.pendingPlacement).toBe(1);
    expect(cap.criticalResults).toBe(1);
  });

  it("upserts tasks/escalations with optimistic concurrency into admissionSummaryJson", () => {
    const doc = emptyEnterpriseCommandDocV1("2026-07-22T00:00:00.000Z");
    const taskOk = upsertEnterpriseTask({
      doc,
      task: {
        taskId: "t1",
        type: "TRANSPORT",
        title: "Transport to CT",
        priority: "URGENT",
        status: "OPEN",
        createdAt: "2026-07-22T00:00:00.000Z",
      },
      clientExpectedVersion: 0,
      actorUserId: "u1",
      atIso: "2026-07-22T01:00:00.000Z",
    });
    expect(taskOk.ok).toBe(true);
    if (!taskOk.ok) return;
    expect(taskOk.doc.expectedVersion).toBe(1);
    expect(taskOk.doc.tasks).toHaveLength(1);

    const stale = upsertEnterpriseTask({
      doc: taskOk.doc,
      task: { ...taskOk.doc.tasks[0]!, status: "COMPLETED" },
      clientExpectedVersion: 0,
      actorUserId: "u1",
    });
    expect(stale.ok).toBe(false);

    const esc = upsertEnterpriseEscalation({
      doc: taskOk.doc,
      escalation: {
        escalationId: "e1",
        alertType: "CRITICAL_LAB",
        status: "OPEN",
        summary: "K+ critical",
        createdAt: "2026-07-22T01:00:00.000Z",
        history: [{ at: "2026-07-22T01:00:00.000Z", status: "OPEN" }],
      },
      clientExpectedVersion: 1,
      actorUserId: "u1",
    });
    expect(esc.ok).toBe(true);
    if (!esc.ok) return;
    const merged = mergeEnterpriseCommandIntoSummary({ other: true }, esc.doc);
    expect(merged.other).toBe(true);
    expect(readEnterpriseCommandDoc(merged).escalations).toHaveLength(1);
  });
});
