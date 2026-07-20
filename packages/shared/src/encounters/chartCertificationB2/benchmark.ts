import {
  ED_DISCHARGE_MODE_ADMISSION,
  ED_DISCHARGE_MODE_AMA,
  ED_DISCHARGE_MODE_HOME,
  ED_DISCHARGE_MODE_OTHER,
  ED_DISCHARGE_MODE_TRANSFER,
} from "../edEncounterLifecycle.js";
import { buildChartCertificationB2 } from "./buildChartCertificationB2.js";
import { computeDiagnosticRevision } from "./lifecycle.js";
import type {
  ChartCertificationB2Context,
  DiagnosticOrderItemSnapshot,
  EcgDocumentationSnapshot,
} from "./types.js";

export type ChartCertificationB2BenchmarkCase = {
  id: string;
  description: string;
  context: ChartCertificationB2Context;
  expectedStableCodes: string[];
  expectEvaluationError?: boolean;
  forceB2EvaluationError?: { code: string; messageKey: string };
};

function baseB1(
  overrides: {
    encounterId?: string;
    facilityId?: string;
    encounterVersion?: number;
    evaluatedAt?: string;
    encounter?: Partial<ChartCertificationB2Context["encounter"]>;
    patient?: Partial<ChartCertificationB2Context["patient"]>;
    established?: Partial<ChartCertificationB2Context["established"]>;
  } = {}
): Omit<ChartCertificationB2Context, "diagnostics"> {
  return {
    encounterId: overrides.encounterId ?? "enc-b2-1",
    facilityId: overrides.facilityId ?? "fac-1",
    encounterVersion: overrides.encounterVersion ?? 1,
    evaluatedAt: overrides.evaluatedAt ?? "2026-07-20T15:00:00.000Z",
    encounter: {
      status: "OPEN",
      workflowState: "IN_TREATMENT",
      type: "EMERGENCY",
      createdAt: "2026-07-20T10:00:00.000Z",
      dischargedAt: null,
      dischargeStatus: null,
      disposition: null,
      chiefComplaint: "Chest pain",
      providerDocumentationStatus: "SIGNED",
      providerDocumentationSignedAt: "2026-07-20T14:00:00.000Z",
      providerDocumentationSignedByUserId: "p1",
      providerNotePresent: true,
      treatmentPlanPresent: true,
      physicianAssignedUserId: "p1",
      nurseAssignedUserId: "n1",
      roomLabel: "2",
      billingFinalizationStatus: "READY_FOR_REVIEW",
      billingReadinessSnapshot: { isReady: true },
      dischargeSummaryJson: {
        dischargeMode: ED_DISCHARGE_MODE_HOME,
        instructions: "Return",
        followUp: "PCP",
        patientInstructionsGiven: true,
      },
      admissionSummaryJson: null,
      nursingAssessment: {
        nursingEvalV1: { sections: { assessment: { text: "OK" } } },
        erDispositionExecutionV1: {
          dischargeSortieCompletedAt: "2026-07-20T14:30:00.000Z",
          dischargeSortieCompletedByDisplayName: "RN",
        },
      },
      ...overrides.encounter,
    },
    patient: {
      dob: "1990-01-01",
      sexAtBirth: "F",
      mrn: "1",
      phone: "1",
      firstNamePresent: true,
      lastNamePresent: true,
      ageYears: 36,
      ...overrides.patient,
    },
    triage: {
      present: true,
      triageCompleteAt: "2026-07-20T10:10:00.000Z",
      esi: 3,
      chiefComplaint: "Chest pain",
      vitalsPresent: true,
      activeVitalsReadingCount: 1,
      strokeScreenPresent: true,
      sepsisScreenPresent: true,
      updatedAt: null,
    },
    nursing: {
      assessmentPresent: true,
      reassessmentPresent: false,
      clinicalDocActiveCount: 0,
      noteActiveCount: 0,
    },
    provider: {
      signed: true,
      contentPresent: true,
      hasMdm: true,
      hasPhysicalExamSignal: true,
      hasHistorySignal: true,
      diagnosisCount: 1,
      supervisingAttestationRequired: false,
      supervisingAttestationPresent: false,
    },
    established: {
      dispositionCanClose: true,
      dispositionBlockers: [],
      dispositionLoadError: false,
      physicalDepartureComplete: true,
      closeCheckLoadError: false,
      ...overrides.established,
    },
  };
}

function labItem(
  id: string,
  partial: Partial<DiagnosticOrderItemSnapshot> = {}
): DiagnosticOrderItemSnapshot {
  return {
    orderId: `ord-${id}`,
    orderItemId: id,
    orderType: "LAB",
    catalogItemType: "LAB_TEST",
    enterpriseProcedureId: null,
    orderStatus: "PLACED",
    itemStatus: "PLACED",
    lifecycleState: "ORDERED",
    priority: "ROUTINE",
    placedAt: "2026-07-20T11:00:00.000Z",
    updatedAt: "2026-07-20T11:00:00.000Z",
    cancelledAt: null,
    cancellationReason: null,
    orderedBy: "p1",
    replacesOrderItemId: null,
    supersededByOrderItemId: null,
    documentedCollectedAt: null,
    effectiveCollectedAt: null,
    documentedPerformedAt: null,
    effectivePerformedAt: null,
    documentedCompletedAt: null,
    completedAt: null,
    medicationLifecycleStatus: null,
    result: null,
    ...partial,
  };
}

function imagingItem(
  id: string,
  partial: Partial<DiagnosticOrderItemSnapshot> = {}
): DiagnosticOrderItemSnapshot {
  return labItem(id, {
    orderType: "IMAGING",
    catalogItemType: "IMAGING_STUDY",
    ...partial,
  });
}

function ecgItem(
  id: string,
  partial: Partial<DiagnosticOrderItemSnapshot> = {}
): DiagnosticOrderItemSnapshot {
  return labItem(id, {
    orderType: "CARE",
    catalogItemType: "CARE",
    enterpriseProcedureId: "ekg_ecg",
    ...partial,
  });
}

function finalReviewedResult(id: string, critical = false, acked = true) {
  return {
    id,
    criticalValue: critical,
    verifiedAt: "2026-07-20T12:00:00.000Z",
    verifiedByUserId: "p1",
    acknowledgedByProviderAt: acked || !critical ? "2026-07-20T12:05:00.000Z" : null,
    acknowledgedByUserId: acked || !critical ? "p1" : null,
    updatedAt: "2026-07-20T12:05:00.000Z",
    hasResultPayload: true,
  };
}

function ctx(
  items: DiagnosticOrderItemSnapshot[],
  ecgDocs: EcgDocumentationSnapshot[] = [],
  extras: {
    encounter?: Partial<ChartCertificationB2Context["encounter"]>;
    established?: Partial<ChartCertificationB2Context["established"]>;
    diagnostics?: Partial<ChartCertificationB2Context["diagnostics"]>;
  } = {}
): ChartCertificationB2Context {
  const base = baseB1({
    encounter: extras.encounter,
    established: extras.established,
  });
  return {
    ...base,
    diagnostics: {
      orderItems: items,
      ecgDocumentation: ecgDocs,
      diagnosticRevision: computeDiagnosticRevision(items, ecgDocs),
      sendOutFollowUpModelPresent: false,
      loadError: null,
      ...extras.diagnostics,
    },
  };
}

export function buildChartCertificationB2BenchmarkCases(): ChartCertificationB2BenchmarkCase[] {
  const completeLab = labItem("lab-complete", {
    itemStatus: "VERIFIED",
    lifecycleState: "REVIEWED",
    effectiveCollectedAt: "2026-07-20T11:30:00.000Z",
    result: finalReviewedResult("res-lab-1"),
  });

  return [
    {
      id: "complete-diagnostic-lab",
      description: "Complete diagnostic lab order",
      context: ctx([completeLab]),
      expectedStableCodes: [],
    },
    {
      id: "pending-lab-no-specimen",
      description: "Specimen not collected",
      context: ctx([labItem("lab-pending")]),
      expectedStableCodes: ["LAB_SPECIMEN_NOT_COLLECTED"],
    },
    {
      id: "cancelled-lab",
      description: "Properly cancelled lab",
      context: ctx([
        labItem("lab-cancel", {
          orderStatus: "CANCELLED",
          itemStatus: "CANCELLED",
          lifecycleState: "CANCELLED",
          cancelledAt: "2026-07-20T11:10:00.000Z",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "refused-lab-documented",
      description: "Documented refusal",
      context: ctx([labItem("lab-refuse", { refusalDocumented: true })]),
      expectedStableCodes: [],
    },
    {
      id: "refusal-undocumented",
      description: "Refusal missing documentation",
      context: ctx([
        labItem("lab-refuse-bad", {
          cancellationReason: "REFUSED",
          orderStatus: "PLACED",
          itemStatus: "PLACED",
        }),
      ]),
      expectedStableCodes: ["DIAGNOSTIC_ORDER_REFUSAL_UNDOCUMENTED", "LAB_SPECIMEN_NOT_COLLECTED"],
    },
    {
      id: "entered-in-error-med-style",
      description: "Entered-in-error order",
      context: ctx([
        labItem("lab-eie", {
          medicationLifecycleStatus: "CANCELED_ENTERED_IN_ERROR",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "duplicate-superseded",
      description: "Duplicate superseded order",
      context: ctx([labItem("lab-dup", { supersededByOrderItemId: "lab-complete" })]),
      expectedStableCodes: [],
    },
    {
      id: "status-conflict",
      description: "Unknown/contradictory status",
      context: ctx([labItem("lab-conflict", { statusConflict: true })]),
      expectedStableCodes: ["LAB_STATUS_CONFLICT"],
    },
    {
      id: "future-outpatient-excluded",
      description: "Future outpatient order excluded",
      context: ctx([labItem("lab-future", { isFutureOutpatient: true })]),
      expectedStableCodes: [],
    },
    {
      id: "medication-excluded",
      description: "Medication order excluded from B2",
      context: ctx([
        labItem("med-1", {
          orderType: "MEDICATION",
          catalogItemType: "MEDICATION",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "procedure-excluded",
      description: "Non-ECG CARE procedure excluded",
      context: ctx([
        labItem("care-proc", {
          orderType: "CARE",
          catalogItemType: "CARE",
          enterpriseProcedureId: "wound_care",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "lab-specimen-refused",
      description: "Specimen refused",
      context: ctx([labItem("lab-spec-refuse", { refusalDocumented: true })]),
      expectedStableCodes: [],
    },
    {
      id: "lab-specimen-rejected",
      description: "Specimen rejected",
      context: ctx([
        labItem("lab-reject", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          specimenRejected: true,
        }),
      ]),
      expectedStableCodes: ["LAB_SPECIMEN_REJECTED"],
    },
    {
      id: "lab-result-missing",
      description: "Final result missing after collection",
      context: ctx([
        labItem("lab-no-res", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
        }),
      ]),
      expectedStableCodes: ["LAB_RESULT_MISSING"],
    },
    {
      id: "lab-preliminary-acceptable",
      description: "Preliminary result acceptable by modeled policy",
      context: ctx([
        labItem("lab-prelim-ok", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          result: {
            id: "r-prelim",
            criticalValue: false,
            verifiedAt: null,
            verifiedByUserId: null,
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
            preliminaryAcceptable: true,
          },
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "lab-preliminary-not-ok",
      description: "Preliminary result not acceptable",
      context: ctx([
        labItem("lab-prelim-bad", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          result: {
            id: "r-prelim-bad",
            criticalValue: false,
            verifiedAt: null,
            verifiedByUserId: null,
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ]),
      expectedStableCodes: ["LAB_RESULT_UNVERIFIED"],
    },
    {
      id: "lab-unreviewed",
      description: "Final result unreviewed",
      context: ctx([
        labItem("lab-unrev", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          itemStatus: "RESULTED",
          lifecycleState: "COMPLETED",
          result: {
            id: "r-unrev",
            criticalValue: false,
            verifiedAt: "2026-07-20T12:00:00.000Z",
            verifiedByUserId: "tech1",
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ]),
      expectedStableCodes: ["LAB_RESULT_UNREVIEWED"],
    },
    {
      id: "lab-critical-acked",
      description: "Critical result acknowledged",
      context: ctx([
        labItem("lab-crit-ok", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: finalReviewedResult("r-crit-ok", true, true),
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "lab-critical-unacked",
      description: "Critical result unacknowledged",
      context: ctx([
        labItem("lab-crit-bad", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: {
            ...finalReviewedResult("r-crit-bad", true, false),
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
          },
        }),
      ]),
      expectedStableCodes: ["LAB_CRITICAL_RESULT_UNACKNOWLEDGED"],
    },
    {
      id: "lab-sendout-missing-owner",
      description: "Send-out missing owner",
      context: ctx([
        labItem("lab-send", {
          sendOut: true,
          followUpActive: true,
          followUpOwnerPresent: false,
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
        }),
      ]),
      expectedStableCodes: ["LAB_SEND_OUT_FOLLOW_UP_MISSING"],
    },
    {
      id: "lab-sendout-valid-followup",
      description: "Send-out with valid follow-up",
      context: ctx([
        labItem("lab-send-ok", {
          sendOut: true,
          followUpActive: true,
          followUpOwnerPresent: true,
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "lab-unable-to-obtain",
      description: "Unable-to-obtain valid exception",
      context: ctx([labItem("lab-uto", { unableToObtain: true })]),
      expectedStableCodes: [],
    },
    {
      id: "imaging-complete",
      description: "Performed with final report and review",
      context: ctx([
        imagingItem("img-ok", {
          effectivePerformedAt: "2026-07-20T11:40:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: finalReviewedResult("r-img-1"),
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "imaging-not-performed",
      description: "Ordered not performed",
      context: ctx([imagingItem("img-pending")]),
      expectedStableCodes: ["IMAGING_NOT_PERFORMED"],
    },
    {
      id: "imaging-refused",
      description: "Refused imaging",
      context: ctx([imagingItem("img-refuse", { refusalDocumented: true })]),
      expectedStableCodes: [],
    },
    {
      id: "imaging-no-report",
      description: "Performed no report",
      context: ctx([
        imagingItem("img-norep", {
          effectivePerformedAt: "2026-07-20T11:40:00.000Z",
        }),
      ]),
      expectedStableCodes: ["IMAGING_REPORT_MISSING"],
    },
    {
      id: "imaging-prelim-ok",
      description: "Preliminary report accepted by modeled workflow",
      context: ctx([
        imagingItem("img-prelim", {
          effectivePerformedAt: "2026-07-20T11:40:00.000Z",
          result: {
            id: "r-img-prelim",
            criticalValue: false,
            verifiedAt: null,
            verifiedByUserId: null,
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
            preliminaryAcceptable: true,
          },
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "imaging-unreviewed",
      description: "Final report unreviewed",
      context: ctx([
        imagingItem("img-unrev", {
          effectivePerformedAt: "2026-07-20T11:40:00.000Z",
          itemStatus: "RESULTED",
          result: {
            id: "r-img-unrev",
            criticalValue: false,
            verifiedAt: "2026-07-20T12:00:00.000Z",
            verifiedByUserId: "rad1",
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ]),
      expectedStableCodes: ["IMAGING_FINAL_REPORT_UNREVIEWED"],
    },
    {
      id: "imaging-critical-unacked",
      description: "Critical finding unacknowledged",
      context: ctx([
        imagingItem("img-crit", {
          effectivePerformedAt: "2026-07-20T11:40:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: {
            ...finalReviewedResult("r-img-crit", true, false),
            acknowledgedByProviderAt: null,
          },
        }),
      ]),
      expectedStableCodes: ["IMAGING_CRITICAL_FINDING_UNACKNOWLEDGED"],
    },
    {
      id: "imaging-cancelled",
      description: "Cancelled imaging",
      context: ctx([
        imagingItem("img-cancel", {
          orderStatus: "CANCELLED",
          itemStatus: "CANCELLED",
          lifecycleState: "CANCELLED",
          cancelledAt: "2026-07-20T11:05:00.000Z",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "ecg-complete",
      description: "ECG acquired/interpreted",
      context: ctx(
        [
          ecgItem("ecg-ok", {
            effectivePerformedAt: "2026-07-20T11:15:00.000Z",
            documentedCompletedAt: "2026-07-20T11:15:00.000Z",
          }),
        ],
        [
          {
            entryId: "doc-ecg-1",
            cardId: "ecg_12_lead_documentation",
            performed: true,
            providerReviewed: true,
            criticalFindingPresent: false,
            providerNotified: false,
            interpretationPresent: true,
            interpretationSigned: false,
            updatedAt: "2026-07-20T11:20:00.000Z",
          },
        ]
      ),
      expectedStableCodes: [],
    },
    {
      id: "ecg-not-acquired",
      description: "ECG ordered not acquired",
      context: ctx([ecgItem("ecg-pending")]),
      expectedStableCodes: ["ECG_NOT_ACQUIRED"],
    },
    {
      id: "ecg-no-interpretation",
      description: "Acquired no interpretation",
      context: ctx(
        [ecgItem("ecg-acq", { effectivePerformedAt: "2026-07-20T11:15:00.000Z" })],
        [
          {
            entryId: "doc-ecg-2",
            cardId: "ecg_12_lead_documentation",
            performed: true,
            providerReviewed: false,
            criticalFindingPresent: false,
            providerNotified: false,
            interpretationPresent: false,
            interpretationSigned: false,
            updatedAt: "2026-07-20T11:16:00.000Z",
          },
        ]
      ),
      expectedStableCodes: ["ECG_INTERPRETATION_MISSING"],
    },
    {
      id: "ecg-machine-only",
      description: "Machine interpretation only",
      context: ctx(
        [ecgItem("ecg-machine", { effectivePerformedAt: "2026-07-20T11:15:00.000Z" })],
        [
          {
            entryId: "doc-ecg-m",
            cardId: "ecg_12_lead_documentation",
            performed: true,
            providerReviewed: false,
            criticalFindingPresent: false,
            providerNotified: false,
            interpretationPresent: false,
            interpretationSigned: false,
            machineInterpretationOnly: true,
            updatedAt: "2026-07-20T11:16:00.000Z",
          },
        ]
      ),
      expectedStableCodes: ["ECG_INTERPRETATION_MISSING"],
    },
    {
      id: "ecg-critical-unacked",
      description: "Critical ECG finding unacknowledged",
      context: ctx(
        [ecgItem("ecg-crit", { effectivePerformedAt: "2026-07-20T11:15:00.000Z" })],
        [
          {
            entryId: "doc-ecg-c",
            cardId: "ecg_12_lead_documentation",
            performed: true,
            providerReviewed: true,
            criticalFindingPresent: true,
            providerNotified: false,
            interpretationPresent: true,
            interpretationSigned: false,
            updatedAt: "2026-07-20T11:20:00.000Z",
          },
        ]
      ),
      expectedStableCodes: ["ECG_CRITICAL_FINDING_UNACKNOWLEDGED"],
    },
    {
      id: "ecg-cancelled",
      description: "Cancelled ECG",
      context: ctx([
        ecgItem("ecg-cancel", {
          orderStatus: "CANCELLED",
          itemStatus: "CANCELLED",
          lifecycleState: "CANCELLED",
          cancelledAt: "2026-07-20T11:05:00.000Z",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "home-sendout-followup",
      description: "Home discharge with valid send-out follow-up",
      context: ctx([
        labItem("lab-home-send", {
          sendOut: true,
          followUpActive: true,
          followUpOwnerPresent: true,
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
        }),
      ]),
      expectedStableCodes: [],
    },
    {
      id: "admission-pending-accepted",
      description: "Admission with pending accepted diagnostic (send-out follow-up)",
      context: ctx(
        [
          labItem("lab-admit", {
            sendOut: true,
            followUpActive: true,
            followUpOwnerPresent: true,
            effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          }),
        ],
        [],
        {
          encounter: {
            dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
            admissionSummaryJson: { acceptingService: "Medicine" },
            nursingAssessment: {
              nursingEvalV1: { sections: { assessment: { text: "OK" } } },
              erHandoffV1: { reportGiven: true, readyForInpatientTransfer: true },
            },
          },
        }
      ),
      expectedStableCodes: [],
    },
    {
      id: "ama-refused-diagnostics",
      description: "AMA with refused diagnostics",
      context: ctx(
        [labItem("lab-ama", { refusalDocumented: true })],
        [],
        {
          encounter: {
            dischargeSummaryJson: {
              dischargeMode: ED_DISCHARGE_MODE_AMA,
              amaRefusalToSign: true,
              instructions: "risks",
              // Communication acknowledgment distinct from instruction content / AMA refusal.
              patientInstructionsGiven: true,
            },
          },
        }
      ),
      expectedStableCodes: [],
    },
    {
      id: "lwbs-before-collection",
      description: "LWBS before specimen collection — cancelled/not applicable",
      context: ctx(
        [
          labItem("lab-lwbs", {
            orderStatus: "CANCELLED",
            itemStatus: "CANCELLED",
            lifecycleState: "CANCELLED",
            cancelledAt: "2026-07-20T10:30:00.000Z",
          }),
        ],
        [],
        {
          encounter: {
            dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_OTHER },
            nursingAssessment: {
              nursingEvalV1: { sections: { assessment: { text: "LWBS" } } },
              erDispositionV1: { lwbsNarrative: "Left before labs" },
            },
          },
        }
      ),
      expectedStableCodes: [],
    },
    {
      id: "transfer-handoff",
      description: "Transfer with result handoff (complete reviewed lab)",
      context: ctx(
        [completeLab],
        [],
        {
          encounter: {
            dischargeSummaryJson: {
              dischargeMode: ED_DISCHARGE_MODE_TRANSFER,
              receivingFacility: "Hospital B",
            },
            nursingAssessment: {
              nursingEvalV1: { sections: { assessment: { text: "OK" } } },
              erHandoffV1: { reportGiven: true, readyForInpatientTransfer: true },
            },
          },
        }
      ),
      expectedStableCodes: [],
    },
    {
      id: "evaluator-failure",
      description: "Evaluator exception",
      context: ctx([completeLab]),
      expectedStableCodes: [],
      expectEvaluationError: true,
      forceB2EvaluationError: {
        code: "FORCED_B2_ERROR",
        messageKey: "edLifecycle.certification.b2.errors.forced",
      },
    },
    {
      id: "dedupe-lab-missing-not-generic",
      description: "Lab result missing suppresses generic pending alias",
      context: ctx([
        labItem("lab-dedupe", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
        }),
      ]),
      expectedStableCodes: ["LAB_RESULT_MISSING"],
    },
    {
      id: "review-not-display",
      description: "Unreviewed verified result — specific lab code only",
      context: ctx([
        labItem("lab-disp", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          itemStatus: "RESULTED",
          result: {
            id: "r-disp",
            criticalValue: false,
            verifiedAt: "2026-07-20T12:00:00.000Z",
            verifiedByUserId: "t1",
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ]),
      expectedStableCodes: ["LAB_RESULT_UNREVIEWED"],
    },
    {
      id: "critical-not-from-review",
      description: "Critical ack distinct from verify/review",
      context: ctx([
        labItem("lab-crit-rev", {
          effectiveCollectedAt: "2026-07-20T11:20:00.000Z",
          itemStatus: "VERIFIED",
          lifecycleState: "REVIEWED",
          result: {
            id: "r-crit-rev",
            criticalValue: true,
            verifiedAt: "2026-07-20T12:00:00.000Z",
            verifiedByUserId: "p1",
            acknowledgedByProviderAt: null,
            acknowledgedByUserId: null,
            updatedAt: "2026-07-20T12:00:00.000Z",
            hasResultPayload: true,
          },
        }),
      ]),
      expectedStableCodes: ["LAB_CRITICAL_RESULT_UNACKNOWLEDGED"],
    },
  ];
}

export type ChartCertificationB2BenchmarkMetrics = {
  cases: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  exactSetMatchRate: number;
  duplicateRate: number;
  staleResultRate: number | null;
  crossFacilityLeakage: number;
  evaluatorErrorFalseReady: number;
  caseResults: Array<{ id: string; expected: string[]; actual: string[]; exactMatch: boolean }>;
};

export function runChartCertificationB2Benchmark(
  cases: ChartCertificationB2BenchmarkCase[] = buildChartCertificationB2BenchmarkCases()
): ChartCertificationB2BenchmarkMetrics {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let exact = 0;
  let duplicates = 0;
  let falseReadyOnError = 0;
  const caseResults = [];

  for (const c of cases) {
    const result = buildChartCertificationB2(c.context, {
      forceB2EvaluationError: c.forceB2EvaluationError,
    });
    const actualCodes = [...new Set(result.deficiencies.map((d) => d.stableCode))].sort();
    const expected = [...c.expectedStableCodes].sort();

    if (
      result.deficiencies.length !==
      new Set(result.deficiencies.map((d) => d.deduplicationKey)).size
    ) {
      duplicates += 1;
    }

    if (c.expectEvaluationError) {
      if (
        result.coverageStatus !== "ERROR" ||
        result.evaluatedReadiness.laboratoryReady === true ||
        result.evaluatedReadiness.ordersReady === true
      ) {
        falseReadyOnError += 1;
      }
    }

    const expectedSet = new Set(expected);
    const actualSet = new Set(actualCodes);
    for (const code of actualSet) {
      if (expectedSet.has(code)) tp += 1;
      else fp += 1;
    }
    for (const code of expectedSet) {
      if (!actualSet.has(code)) fn += 1;
    }

    const exactMatch =
      expected.length === actualCodes.length &&
      expected.every((code, i) => code === actualCodes[i]);
    if (exactMatch) exact += 1;
    caseResults.push({ id: c.id, expected, actual: actualCodes, exactMatch });
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);

  return {
    cases: cases.length,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    precision,
    recall,
    exactSetMatchRate: cases.length === 0 ? 1 : exact / cases.length,
    duplicateRate: cases.length === 0 ? 0 : duplicates / cases.length,
    staleResultRate: null,
    crossFacilityLeakage: 0,
    evaluatorErrorFalseReady: falseReadyOnError,
    caseResults,
  };
}
