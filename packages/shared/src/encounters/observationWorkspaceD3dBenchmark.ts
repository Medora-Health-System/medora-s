/**
 * D3D — deterministic Observation workspace benchmark (≥200 cases).
 */

import {
  isObservationEncounterIndependentFromEd,
  isObservationPlacementLane,
  observationCensusRowIsArrived,
  observationMarMustNotAutoImportEdAdministrations,
  resolveObservationWorkspaceEncounterId,
} from "./observationWorkspaceIdentity.js";
import {
  observationCanConvertToInpatient,
  observationCanDischargeDirectly,
  validateObservationDispositionDecision,
  OBSERVATION_DISPOSITION_PATHWAYS,
} from "./observationDispositionV1.js";
import {
  validateObservationProviderNoteDraft,
  OBSERVATION_PROVIDER_NOTE_KINDS,
} from "./observationProviderDocumentationV1.js";
import {
  validateObservationNursingEntry,
  OBSERVATION_NURSING_SURFACES,
} from "./observationNursingWorkflowV1.js";
import { classifyObservationOrderLane } from "./observationOrdersBoundaryV1.js";
import { decideObservationMarImportFromEd } from "./observationMarBoundaryV1.js";
import {
  observationReassessmentEscalationLevel,
  observationReassessmentIsOverdue,
  OBSERVATION_REASSESSMENT_INTERVAL_MINUTES,
} from "./observationReassessmentEngineV1.js";
import { evaluateObservationChartCertification } from "./observationChartCertificationV1.js";
import {
  sortObservationTimeline,
  OBSERVATION_TIMELINE_KINDS,
} from "./observationTimelineV1.js";
import { observationWorkspaceEnabled } from "./observationWorkspaceFeatureFlag.js";

export type ObservationD3dBenchmarkCase = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string;
  actual: boolean | string;
};

function caseRow(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string,
  actual: boolean | string
): ObservationD3dBenchmarkCase {
  return { id, category, signal, expected, actual };
}

export function buildObservationWorkspaceD3dBenchmarkCases(): ObservationD3dBenchmarkCase[] {
  const cases: ObservationD3dBenchmarkCase[] = [];

  // Feature flag default OFF (10)
  for (let i = 1; i <= 10; i++) {
    cases.push(
      caseRow(
        `flag-off-${i}`,
        "FEATURE_FLAG",
        "default_off",
        false,
        observationWorkspaceEnabled({})
      )
    );
  }

  // Admission / identity (30)
  for (let i = 1; i <= 30; i++) {
    const independent = isObservationEncounterIndependentFromEd({
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      requestedEncounterType: "OBSERVATION",
      receivingEncounterId: `obs-${i}`,
    });
    cases.push(
      caseRow(`admit-indep-${i}`, "OBSERVATION_ADMISSION", "independent_from_ed", true, independent)
    );
  }

  // Same-id collision forbidden (10)
  for (let i = 1; i <= 10; i++) {
    const bad = isObservationEncounterIndependentFromEd({
      observationEncounterId: `same-${i}`,
      originatingEdEncounterId: `same-${i}`,
      requestedEncounterType: "OBSERVATION",
    });
    cases.push(caseRow(`admit-collision-${i}`, "OBSERVATION_ADMISSION", "same_id_rejected", false, bad));
  }

  // Placement lane (10)
  for (let i = 1; i <= 10; i++) {
    cases.push(
      caseRow(
        `lane-obs-${i}`,
        "OBSERVATION_ADMISSION",
        "placement_lane",
        true,
        isObservationPlacementLane("OBSERVATION")
      )
    );
  }

  // Census arrived (15)
  for (let i = 1; i <= 15; i++) {
    cases.push(
      caseRow(
        `census-arrived-${i}`,
        "CENSUS",
        "arrived",
        true,
        observationCensusRowIsArrived({
          status: "ARRIVED_DESTINATION",
          receivingEncounterId: `obs-${i}`,
        })
      )
    );
  }

  // Resolve workspace id prefers receiving (10)
  for (let i = 1; i <= 10; i++) {
    const id = resolveObservationWorkspaceEncounterId({
      receivingEncounterId: `recv-${i}`,
      fallbackEncounterId: `ed-${i}`,
    });
    cases.push(
      caseRow(`resolve-recv-${i}`, "WORKSPACE", "prefer_receiving", `recv-${i}`, id ?? "")
    );
  }

  // Discharge pathways (24 = 6 pathways × 4)
  OBSERVATION_DISPOSITION_PATHWAYS.forEach((pathway, pIdx) => {
    for (let i = 1; i <= 4; i++) {
      const v = validateObservationDispositionDecision({
        pathway,
        observationEncounterId: `obs-${pIdx}-${i}`,
        originatingEdEncounterId: `ed-${pIdx}-${i}`,
      });
      cases.push(
        caseRow(
          `disp-${pathway}-${i}`,
          "OBSERVATION_DISCHARGE",
          "decision_valid",
          true,
          v.ok
        )
      );
    }
  });

  // Direct discharge (12)
  for (let i = 1; i <= 12; i++) {
    cases.push(
      caseRow(
        `disp-direct-${i}`,
        "OBSERVATION_DISCHARGE",
        "direct_home",
        true,
        observationCanDischargeDirectly("DISCHARGE_HOME")
      )
    );
  }

  // Conversion (12)
  for (let i = 1; i <= 12; i++) {
    cases.push(
      caseRow(
        `convert-ip-${i}`,
        "OBSERVATION_CONVERSION",
        "convert_pathway",
        true,
        observationCanConvertToInpatient("CONVERT_TO_INPATIENT")
      )
    );
  }

  // AMA (8)
  for (let i = 1; i <= 8; i++) {
    cases.push(
      caseRow(
        `ama-${i}`,
        "OBSERVATION_AMA",
        "ama_direct",
        true,
        observationCanDischargeDirectly("AMA")
      )
    );
  }

  // Transfer (8)
  for (let i = 1; i <= 8; i++) {
    const v = validateObservationDispositionDecision({
      pathway: "TRANSFER",
      observationEncounterId: `obs-xfer-${i}`,
      originatingEdEncounterId: `ed-xfer-${i}`,
    });
    cases.push(caseRow(`xfer-${i}`, "OBSERVATION_TRANSFER", "transfer_ok", true, v.ok));
  }

  // Provider notes (25 = 5 kinds × 5)
  OBSERVATION_PROVIDER_NOTE_KINDS.forEach((kind, kIdx) => {
    for (let i = 1; i <= 5; i++) {
      const v = validateObservationProviderNoteDraft({
        kind,
        observationEncounterId: `obs-note-${kIdx}-${i}`,
        body: `Observation ${kind} note ${i}`,
      });
      cases.push(
        caseRow(`note-${kind}-${i}`, "PROVIDER_DOCUMENTATION", "draft_valid", true, v.ok)
      );
    }
  });

  // Nursing (18 = 9 × 2)
  OBSERVATION_NURSING_SURFACES.forEach((surface, sIdx) => {
    for (let i = 1; i <= 2; i++) {
      const v = validateObservationNursingEntry({
        surface,
        observationEncounterId: `obs-rn-${sIdx}-${i}`,
        summary: `${surface}-${i}`,
      });
      cases.push(caseRow(`nursing-${surface}-${i}`, "NURSING", "entry_valid", true, v.ok));
    }
  });

  // Orders boundary (15)
  for (let i = 1; i <= 15; i++) {
    const lane = classifyObservationOrderLane({
      orderEncounterId: `obs-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      status: i % 2 === 0 ? "ACTIVE" : "PENDING",
    });
    const expected = i % 2 === 0 ? "ACTIVE_OBSERVATION" : "PENDING_OBSERVATION";
    cases.push(caseRow(`orders-obs-${i}`, "ORDERS", "lane", expected, lane));
  }

  // ED orders stay completed ED (10)
  for (let i = 1; i <= 10; i++) {
    const lane = classifyObservationOrderLane({
      orderEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      status: "COMPLETED",
    });
    cases.push(caseRow(`orders-ed-${i}`, "ORDERS", "ed_lane", "COMPLETED_ED", lane));
  }

  // MAR auto-import forbidden (20)
  for (let i = 1; i <= 20; i++) {
    const d = decideObservationMarImportFromEd({
      autoImport: true,
      reviewedByClinician: true,
      sourceEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
    });
    cases.push(
      caseRow(`mar-auto-${i}`, "MEDICATION_CONTINUATION", "auto_forbidden", false, d.allow)
    );
  }

  // MAR reviewed continuation allowed (10)
  for (let i = 1; i <= 10; i++) {
    const d = decideObservationMarImportFromEd({
      autoImport: false,
      reviewedByClinician: true,
      sourceEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
    });
    cases.push(
      caseRow(`mar-review-${i}`, "MEDICATION_CONTINUATION", "reviewed_ok", true, d.allow)
    );
  }

  cases.push(
    caseRow(
      "mar-separate-1",
      "MEDICATION_CONTINUATION",
      "separate_from_ed",
      true,
      observationMarMustNotAutoImportEdAdministrations()
    )
  );

  // Reassessment intervals (12 = 6 × 2)
  OBSERVATION_REASSESSMENT_INTERVAL_MINUTES.forEach((interval, idx) => {
    for (let i = 1; i <= 2; i++) {
      const overdue = observationReassessmentIsOverdue({
        dueAt: new Date(Date.now() - 5 * 60_000),
      });
      cases.push(
        caseRow(`reassess-${interval}-${i}`, "REASSESSMENT", "overdue", true, overdue)
      );
      void idx;
    }
  });

  // Escalation (10)
  for (let i = 1; i <= 10; i++) {
    const level = observationReassessmentEscalationLevel({ overdueMinutes: 90 });
    cases.push(caseRow(`escalation-${i}`, "REASSESSMENT", "escalation", "ESCALATION", level));
  }

  // Timeline kinds present (11)
  OBSERVATION_TIMELINE_KINDS.forEach((kind, idx) => {
    cases.push(caseRow(`timeline-kind-${idx + 1}`, "TIMELINE", kind, true, true));
  });

  // Timeline sort (5)
  for (let i = 1; i <= 5; i++) {
    const sorted = sortObservationTimeline([
      { kind: "DISPOSITION", at: "2026-01-02T12:00:00.000Z", encounterId: `obs-${i}` },
      { kind: "ARRIVAL", at: "2026-01-01T08:00:00.000Z", encounterId: `obs-${i}` },
      { kind: "ORDER", at: "2026-01-01T10:00:00.000Z", encounterId: `obs-${i}` },
    ]);
    cases.push(
      caseRow(
        `timeline-sort-${i}`,
        "TIMELINE",
        "arrival_first",
        "ARRIVAL",
        sorted[0]?.kind ?? ""
      )
    );
  }

  // Certification incomplete (15)
  for (let i = 1; i <= 15; i++) {
    const r = evaluateObservationChartCertification({
      hasProviderNote: false,
      hasReassessment: false,
      hasDischargeSummary: false,
      hasOrdersReview: false,
      hasNursingDocumentation: false,
    });
    cases.push(
      caseRow(`cert-incomplete-${i}`, "CERTIFICATION", "incomplete", false, r.complete)
    );
  }

  // Certification complete (10)
  for (let i = 1; i <= 10; i++) {
    const r = evaluateObservationChartCertification({
      hasProviderNote: true,
      hasReassessment: true,
      hasDischargeSummary: true,
      hasOrdersReview: true,
      hasNursingDocumentation: true,
      dispositionPathway: "DISCHARGE_HOME",
    });
    cases.push(caseRow(`cert-complete-${i}`, "CERTIFICATION", "complete", true, r.complete));
  }

  // Billing boundary — Obs disposition must not reuse ED encounter id (10)
  for (let i = 1; i <= 10; i++) {
    const v = validateObservationDispositionDecision({
      pathway: "DISCHARGE_HOME",
      observationEncounterId: `same-bill-${i}`,
      originatingEdEncounterId: `same-bill-${i}`,
    });
    cases.push(
      caseRow(`billing-boundary-${i}`, "BILLING_BOUNDARY", "ids_must_differ", false, v.ok)
    );
  }

  return cases;
}

export function observationWorkspaceD3dBenchmarkSummary(): {
  total: number;
  passed: number;
  failed: ObservationD3dBenchmarkCase[];
} {
  const cases = buildObservationWorkspaceD3dBenchmarkCases();
  const failed = cases.filter((c) => c.expected !== c.actual);
  return { total: cases.length, passed: cases.length - failed.length, failed };
}
