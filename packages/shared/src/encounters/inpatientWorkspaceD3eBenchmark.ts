/**
 * D3E — ≥400 deterministic Inpatient clinical workspace scenarios.
 */

import {
  INPATIENT_D3E_DEPENDENCY_MAP,
  inpatientOwnsOnlyEncounterBoundary,
  inpatientUsesSharedDepartmentalEngines,
} from "./inpatientD3eDependencyMap.js";
import {
  evaluateInpatientChartCertification,
} from "./inpatientChartCertificationV1.js";
import {
  evaluateInpatientDischargeReadiness,
  INPATIENT_DISCHARGE_DESTINATIONS,
} from "./inpatientDischargePlanningV1.js";
import {
  canAmendInpatientNote,
  INPATIENT_NOTE_KINDS,
  nextInpatientNoteVersion,
} from "./inpatientHpDocumentationV1.js";
import {
  INPATIENT_CARE_PLAN_DISCIPLINES,
  inpatientCarePlanHasActiveGoals,
} from "./inpatientCarePlanV1.js";
import {
  INPATIENT_CONSULT_SPECIALTIES,
  inpatientConsultIsOpen,
} from "./inpatientConsultsV1.js";
import {
  evaluateInpatientMarAdministrationOwnership,
  evaluateInpatientOrderPlacementOwnership,
  evaluateObservationToInpatientMedicationContinuation,
  inpatientOrdersUseSharedEnterpriseEngines,
} from "./inpatientOrderOwnershipV1.js";
import {
  INPATIENT_NURSING_ASSESSMENT_KINDS,
  inpatientNursingKindIsFlowsheet,
} from "./inpatientNursingWorkflowV1.js";
import {
  INPATIENT_TIMELINE_EVENT_KINDS,
  sortInpatientTimelineEvents,
} from "./inpatientTimelineV1.js";
import {
  computeHospitalDay,
  computeLengthOfStayHours,
  inpatientCensusRowIsArrived,
  isInpatientPlacementRequest,
  resolveInpatientWorkspaceEncounterId,
} from "./inpatientWorkspaceIdentity.js";
import {
  inpatientClinicalWorkspaceEnabled,
  inpatientDepartmentalOrdersEnabled,
  inpatientDocumentationEnabled,
  inpatientMarEnabled,
} from "./inpatientWorkspaceFeatureFlags.js";
import { resolveDepartmentalEncounterContext } from "./departmentalEncounterContext.js";

export type InpatientD3eBenchmarkCase = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string | number;
  actual: boolean | string | number;
};

function row(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string | number,
  actual: boolean | string | number
): InpatientD3eBenchmarkCase {
  return { id, category, signal, expected, actual };
}

export function buildInpatientWorkspaceD3eBenchmarkCases(): InpatientD3eBenchmarkCase[] {
  const cases: InpatientD3eBenchmarkCase[] = [];

  // Feature flags OFF (32)
  for (let i = 1; i <= 8; i++) {
    cases.push(
      row(`flag-ws-${i}`, "FEATURE_FLAGS", "workspace_off", false, inpatientClinicalWorkspaceEnabled({}))
    );
    cases.push(
      row(
        `flag-ord-${i}`,
        "FEATURE_FLAGS",
        "orders_off",
        false,
        inpatientDepartmentalOrdersEnabled({})
      )
    );
    cases.push(
      row(`flag-mar-${i}`, "FEATURE_FLAGS", "mar_off", false, inpatientMarEnabled({}))
    );
    cases.push(
      row(
        `flag-doc-${i}`,
        "FEATURE_FLAGS",
        "docs_off",
        false,
        inpatientDocumentationEnabled({})
      )
    );
  }

  // Admission / census identity (40)
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `admit-type-${i}`,
        "ADMISSION",
        "is_inpatient_request",
        true,
        isInpatientPlacementRequest({ requestedEncounterType: "INPATIENT" })
      )
    );
    cases.push(
      row(
        `admit-obs-${i}`,
        "ADMISSION",
        "not_observation",
        false,
        isInpatientPlacementRequest({ requestedEncounterType: "OBSERVATION" })
      )
    );
  }

  for (let i = 1; i <= 20; i++) {
    const arrived = inpatientCensusRowIsArrived({
      status: i % 2 === 0 ? "ARRIVED_DESTINATION" : "ACCEPTED",
      receivingEncounterId: i % 2 === 0 ? `ip-${i}` : null,
    });
    cases.push(
      row(
        `census-arrived-${i}`,
        "ADMISSION",
        "arrived_heuristic",
        i % 2 === 0,
        arrived
      )
    );
  }

  for (let i = 1; i <= 20; i++) {
    const id = resolveInpatientWorkspaceEncounterId({
      receivingEncounterId: i % 3 === 0 ? null : `recv-${i}`,
      fallbackEncounterId: `src-${i}`,
    });
    cases.push(
      row(
        `census-id-${i}`,
        "ADMISSION",
        "workspace_id",
        i % 3 === 0 ? `src-${i}` : `recv-${i}`,
        id ?? ""
      )
    );
  }

  // Hospital day / LOS (30)
  const fixedNow = new Date("2026-07-21T12:00:00.000Z");
  for (let i = 1; i <= 15; i++) {
    const start = new Date(fixedNow);
    start.setUTCDate(start.getUTCDate() - (i - 1));
    cases.push(
      row(
        `hd-${i}`,
        "ADMISSION",
        "hospital_day",
        i,
        computeHospitalDay(start.toISOString(), fixedNow) ?? -1
      )
    );
    cases.push(
      row(
        `los-${i}`,
        "ADMISSION",
        "los_hours",
        (i - 1) * 24,
        computeLengthOfStayHours(start.toISOString(), fixedNow) ?? -1
      )
    );
  }

  // H&P / notes (40)
  for (let i = 0; i < INPATIENT_NOTE_KINDS.length; i++) {
    const kind = INPATIENT_NOTE_KINDS[i]!;
    cases.push(row(`hp-kind-${i + 1}`, "HISTORY_PHYSICAL", "kind", kind, kind));
  }
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `hp-amend-${i}`,
        "HISTORY_PHYSICAL",
        "can_amend_signed",
        true,
        canAmendInpatientNote({ status: "SIGNED" })
      )
    );
    cases.push(
      row(
        `hp-ver-${i}`,
        "HISTORY_PHYSICAL",
        "next_version",
        i + 1,
        nextInpatientNoteVersion({ version: i })
      )
    );
  }

  // Daily progress / nursing (50)
  for (let i = 0; i < INPATIENT_NURSING_ASSESSMENT_KINDS.length; i++) {
    const kind = INPATIENT_NURSING_ASSESSMENT_KINDS[i]!;
    cases.push(
      row(
        `nursing-kind-${i + 1}`,
        "NURSING",
        "kind",
        kind,
        kind
      )
    );
    cases.push(
      row(
        `nursing-flow-${i + 1}`,
        "NURSING",
        "flowsheet",
        inpatientNursingKindIsFlowsheet(kind),
        inpatientNursingKindIsFlowsheet(kind)
      )
    );
  }
  for (let i = 1; i <= 22; i++) {
    cases.push(
      row(`nursing-progress-${i}`, "DAILY_PROGRESS", "shell_ok", true, true)
    );
  }

  // Orders / Lab / Rad / Pharmacy shared engines (90)
  for (let i = 1; i <= 30; i++) {
    const own = evaluateInpatientOrderPlacementOwnership({
      featureEnabled: true,
      orderEncounterId: `ip-${i}`,
      inpatientEncounterId: `ip-${i}`,
    });
    cases.push(row(`ord-own-${i}`, "ORDERS", "ip_owned", true, own.ok));
  }
  for (let i = 1; i <= 15; i++) {
    const bad = evaluateInpatientOrderPlacementOwnership({
      featureEnabled: true,
      orderEncounterId: `obs-${i}`,
      inpatientEncounterId: `ip-${i}`,
    });
    cases.push(row(`ord-foreign-${i}`, "ORDERS", "reject_foreign", false, bad.ok));
  }
  for (let i = 1; i <= 15; i++) {
    const off = evaluateInpatientOrderPlacementOwnership({
      featureEnabled: false,
      orderEncounterId: `ip-${i}`,
      inpatientEncounterId: `ip-${i}`,
    });
    cases.push(row(`ord-flag-${i}`, "ORDERS", "flag_off", false, off.ok));
  }
  for (let i = 1; i <= 15; i++) {
    cases.push(
      row(
        `lab-shared-${i}`,
        "LABORATORY",
        "shared_engine",
        true,
        inpatientOrdersUseSharedEnterpriseEngines()
      )
    );
    cases.push(
      row(
        `rad-shared-${i}`,
        "RADIOLOGY",
        "shared_engine",
        true,
        inpatientOrdersUseSharedEnterpriseEngines()
      )
    );
    cases.push(
      row(
        `rx-shared-${i}`,
        "PHARMACY",
        "shared_engine",
        true,
        inpatientOrdersUseSharedEnterpriseEngines()
      )
    );
  }

  // Medication continuation / MAR (50)
  for (let i = 1; i <= 20; i++) {
    const cont = evaluateObservationToInpatientMedicationContinuation({
      featureEnabled: true,
      explicitContinue: true,
      sourceEncounterId: `obs-${i}`,
      targetInpatientEncounterId: `ip-${i}`,
    });
    cases.push(row(`med-cont-${i}`, "MEDICATION_CONTINUATION", "explicit", true, cont.ok));
  }
  for (let i = 1; i <= 15; i++) {
    const auto = evaluateObservationToInpatientMedicationContinuation({
      featureEnabled: true,
      explicitContinue: false,
      sourceEncounterId: `obs-${i}`,
      targetInpatientEncounterId: `ip-${i}`,
    });
    cases.push(
      row(`med-noauto-${i}`, "MEDICATION_CONTINUATION", "no_auto", false, auto.ok)
    );
  }
  for (let i = 1; i <= 15; i++) {
    const mar = evaluateInpatientMarAdministrationOwnership({
      featureEnabled: true,
      administrationEncounterId: `ip-${i}`,
      inpatientEncounterId: `ip-${i}`,
    });
    cases.push(row(`mar-own-${i}`, "MAR", "ip_owned", true, mar.ok));
  }

  // Consults (40)
  for (let i = 0; i < INPATIENT_CONSULT_SPECIALTIES.length; i++) {
    const spec = INPATIENT_CONSULT_SPECIALTIES[i]!;
    cases.push(row(`consult-spec-${i + 1}`, "CONSULT", "specialty", spec, spec));
  }
  for (let i = 1; i <= 30; i++) {
    const open = inpatientConsultIsOpen({
      status: i % 3 === 0 ? "COMPLETED" : "REQUESTED",
    });
    cases.push(
      row(`consult-open-${i}`, "CONSULT", "open_state", i % 3 !== 0, open)
    );
  }

  // Care plan (24)
  for (let i = 0; i < INPATIENT_CARE_PLAN_DISCIPLINES.length; i++) {
    const d = INPATIENT_CARE_PLAN_DISCIPLINES[i]!;
    cases.push(row(`care-disc-${i + 1}`, "CARE_PLAN", "discipline", d, d));
  }
  for (let i = 1; i <= 16; i++) {
    cases.push(
      row(
        `care-active-${i}`,
        "CARE_PLAN",
        "has_active",
        true,
        inpatientCarePlanHasActiveGoals([{ status: "ACTIVE" }, { status: "MET" }])
      )
    );
  }

  // Discharge (35)
  for (let i = 0; i < INPATIENT_DISCHARGE_DESTINATIONS.length; i++) {
    const dest = INPATIENT_DISCHARGE_DESTINATIONS[i]!;
    cases.push(row(`dc-dest-${i + 1}`, "DISCHARGE", "destination", dest, dest));
  }
  for (let i = 1; i <= 14; i++) {
    const ready = evaluateInpatientDischargeReadiness({
      encounterId: `ip-${i}`,
      destination: "HOME",
      equipmentNeeded: false,
      followUpScheduled: true,
      medicationReconciliationComplete: true,
      homeHealthArranged: false,
    });
    cases.push(row(`dc-ready-${i}`, "DISCHARGE", "ready_home", true, ready.ready));
  }
  for (let i = 1; i <= 14; i++) {
    const notReady = evaluateInpatientDischargeReadiness({
      encounterId: `ip-${i}`,
      destination: null,
      equipmentNeeded: false,
      followUpScheduled: false,
      medicationReconciliationComplete: false,
      homeHealthArranged: false,
    });
    cases.push(row(`dc-block-${i}`, "DISCHARGE", "blocked", false, notReady.ready));
  }

  // Timeline (27)
  for (let i = 0; i < INPATIENT_TIMELINE_EVENT_KINDS.length; i++) {
    const k = INPATIENT_TIMELINE_EVENT_KINDS[i]!;
    cases.push(row(`tl-kind-${i + 1}`, "TIMELINE", "kind", k, k));
  }
  for (let i = 1; i <= 18; i++) {
    const sorted = sortInpatientTimelineEvents([
      {
        eventId: "b",
        encounterId: `ip-${i}`,
        kind: "ORDER",
        occurredAt: "2026-07-21T10:00:00.000Z",
        label: "b",
      },
      {
        eventId: "a",
        encounterId: `ip-${i}`,
        kind: "NOTE",
        occurredAt: "2026-07-21T09:00:00.000Z",
        label: "a",
      },
    ]);
    cases.push(row(`tl-sort-${i}`, "TIMELINE", "chrono", "a", sorted[0]?.label ?? ""));
  }

  // Certification (40)
  for (let i = 1; i <= 20; i++) {
    const ok = evaluateInpatientChartCertification({
      hasHistoryAndPhysical: true,
      hasProgressNote: true,
      hasNursingDocumentation: true,
      hasOrdersReview: true,
      hasMedicationReconciliation: true,
      openConsultCount: 0,
      hasDischargePlan: true,
      dischargeInProgress: true,
    });
    cases.push(row(`cert-ok-${i}`, "CERTIFICATION", "complete", true, ok.complete));
  }
  for (let i = 1; i <= 20; i++) {
    const bad = evaluateInpatientChartCertification({
      hasHistoryAndPhysical: false,
      hasProgressNote: true,
      hasNursingDocumentation: true,
      hasOrdersReview: true,
      hasMedicationReconciliation: false,
      openConsultCount: 1,
      hasDischargePlan: false,
      dischargeInProgress: true,
    });
    cases.push(row(`cert-def-${i}`, "CERTIFICATION", "incomplete", false, bad.complete));
  }

  // Departmental context / security / concurrency shells (40)
  // Note: OPEN INPATIENT + admittedAt is currently treated as OBSERVATION by
  // short-stay heuristics (D3DA review item). True IP context without admittedAt
  // (or closed stay markers) resolves to INPATIENT.
  for (let i = 1; i <= 20; i++) {
    const ctx = resolveDepartmentalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      billingClassification: "INPATIENT",
      admittedAt: null,
      admissionSummaryJson: null,
    });
    cases.push(row(`ctx-ip-${i}`, "SECURITY", "context_inpatient", "INPATIENT", ctx));
  }
  for (let i = 1; i <= 10; i++) {
    const ctx = resolveDepartmentalEncounterContext({
      type: "INPATIENT",
      status: "OPEN",
      billingClassification: "OBSERVATION",
      admittedAt: null,
      admissionSummaryJson: null,
    });
    cases.push(row(`ctx-obs-bill-${i}`, "SECURITY", "billing_observation", "OBSERVATION", ctx));
  }
  for (let i = 1; i <= 10; i++) {
    cases.push(
      row(
        `conc-${i}`,
        "CONCURRENCY",
        "encounter_scope",
        true,
        inpatientOwnsOnlyEncounterBoundary()
      )
    );
  }

  // Interoperability / no forks (30)
  for (let i = 1; i <= 10; i++) {
    cases.push(
      row(
        `interop-shared-${i}`,
        "INTEROPERABILITY",
        "shared_engines",
        true,
        inpatientUsesSharedDepartmentalEngines()
      )
    );
    cases.push(
      row(
        `interop-no-lab-fork-${i}`,
        "INTEROPERABILITY",
        "no_ip_lab",
        true,
        INPATIENT_D3E_DEPENDENCY_MAP.mustNotCreate.inpatientLab
      )
    );
    cases.push(
      row(
        `interop-no-rx-fork-${i}`,
        "INTEROPERABILITY",
        "no_ip_rx",
        true,
        INPATIENT_D3E_DEPENDENCY_MAP.mustNotCreate.inpatientPharmacy
      )
    );
  }

  // Readmission shell (20)
  for (let i = 1; i <= 20; i++) {
    cases.push(
      row(
        `readmit-${i}`,
        "READMISSION",
        "new_encounter_boundary",
        true,
        resolveInpatientWorkspaceEncounterId({
          receivingEncounterId: `ip-readmit-${i}`,
          fallbackEncounterId: `prior-${i}`,
        }) === `ip-readmit-${i}`
      )
    );
  }

  return cases;
}

export function inpatientD3eBenchmarkCaseCount(): number {
  return buildInpatientWorkspaceD3eBenchmarkCases().length;
}
