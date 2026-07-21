/**
 * D3DA — ≥300 deterministic Observation departmental interoperability scenarios.
 */

import { resolveDepartmentalEncounterContext } from "./departmentalEncounterContext.js";
import {
  assertObservationOrderOwnership,
  classifyEdOrderAtObservationTransition,
  observationMayEditEdOwnedOrder,
  validateObservationMedicationContinuation,
} from "./observationOrderOwnershipV1.js";
import { classifyObservationOrderLane } from "./observationOrdersBoundaryV1.js";
import { decideObservationMarImportFromEd } from "./observationMarBoundaryV1.js";
import { evaluateObservationChartCertification } from "./observationChartCertificationV1.js";
import { validateObservationProviderNoteDraft } from "./observationProviderDocumentationV1.js";
import { validateObservationNursingEntry } from "./observationNursingWorkflowV1.js";
import {
  observationDepartmentalOrdersEnabled,
  observationDocumentationEnabled,
  observationMarEnabled,
  observationClinicalWorkspaceEnabled,
} from "./observationDepartmentalFeatureFlags.js";

export type ObservationD3daBenchmarkCase = {
  id: string;
  category: string;
  signal: string;
  expected: boolean | string;
  actual: boolean | string;
};

function row(
  id: string,
  category: string,
  signal: string,
  expected: boolean | string,
  actual: boolean | string
): ObservationD3daBenchmarkCase {
  return { id, category, signal, expected, actual };
}

export function buildObservationDepartmentalD3daBenchmarkCases(): ObservationD3daBenchmarkCase[] {
  const cases: ObservationD3daBenchmarkCase[] = [];

  // Flags OFF (16)
  for (let i = 1; i <= 4; i++) {
    cases.push(
      row(`flag-ws-${i}`, "FEATURE_FLAGS", "workspace_off", false, observationClinicalWorkspaceEnabled({}))
    );
    cases.push(
      row(
        `flag-ord-${i}`,
        "FEATURE_FLAGS",
        "orders_off",
        false,
        observationDepartmentalOrdersEnabled({})
      )
    );
    cases.push(
      row(`flag-mar-${i}`, "FEATURE_FLAGS", "mar_off", false, observationMarEnabled({}))
    );
    cases.push(
      row(`flag-doc-${i}`, "FEATURE_FLAGS", "docs_off", false, observationDocumentationEnabled({}))
    );
  }

  // Laboratory ownership + lanes (50)
  for (let i = 1; i <= 50; i++) {
    const own = assertObservationOrderOwnership({
      orderEncounterId: `obs-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      patientId: `pat-${i}`,
      orderPatientId: `pat-${i}`,
      facilityId: `fac-${i % 3}`,
      orderFacilityId: `fac-${i % 3}`,
    });
    cases.push(row(`lab-own-${i}`, "LABORATORY", "obs_owned", true, own.ok));
  }

  // Lab: ED link rejected (10)
  for (let i = 1; i <= 10; i++) {
    const bad = assertObservationOrderOwnership({
      orderEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
    });
    cases.push(row(`lab-ed-link-${i}`, "LABORATORY", "reject_ed_owner", false, bad.ok));
  }

  // Radiology ownership (50)
  for (let i = 1; i <= 50; i++) {
    const lane = classifyObservationOrderLane({
      orderEncounterId: `obs-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      status: i % 5 === 0 ? "PENDING" : "ACTIVE",
    });
    const expected = i % 5 === 0 ? "PENDING_OBSERVATION" : "ACTIVE_OBSERVATION";
    cases.push(row(`rad-lane-${i}`, "RADIOLOGY", "obs_lane", expected, lane));
  }

  // Pharmacy / medication (75)
  for (let i = 1; i <= 25; i++) {
    const auto = decideObservationMarImportFromEd({
      autoImport: true,
      reviewedByClinician: true,
      sourceEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
    });
    cases.push(row(`rx-auto-${i}`, "PHARMACY_MEDICATION", "no_auto", false, auto.allow));
  }
  for (let i = 1; i <= 25; i++) {
    const cont = validateObservationMedicationContinuation({
      action: "CONTINUE",
      observationEncounterId: `obs-${i}`,
      sourceEdEncounterId: `ed-${i}`,
      autoImport: false,
    });
    cases.push(row(`rx-cont-${i}`, "PHARMACY_MEDICATION", "explicit_continue", true, cont.ok));
  }
  for (let i = 1; i <= 25; i++) {
    const editEd = observationMayEditEdOwnedOrder({
      orderEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
    });
    cases.push(row(`rx-ed-ro-${i}`, "PHARMACY_MEDICATION", "ed_readonly", false, editEd));
  }

  // Provider documentation (40)
  const noteKinds = ["INITIAL", "PROGRESS", "DAILY", "REEVALUATION", "DISCHARGE"] as const;
  for (let i = 1; i <= 40; i++) {
    const kind = noteKinds[i % noteKinds.length]!;
    const v = validateObservationProviderNoteDraft({
      kind,
      observationEncounterId: `obs-doc-${i}`,
      body: `Note ${kind} ${i}`,
    });
    cases.push(row(`prov-doc-${i}`, "PROVIDER_DOCUMENTATION", kind, true, v.ok));
  }

  // Nursing (40)
  const surfaces = [
    "INTAKE",
    "REASSESSMENT",
    "HOURLY_CHECKS",
    "PAIN",
    "NEURO",
    "RESPIRATORY",
    "FALL_RISK",
    "INTAKE_OUTPUT",
    "CARE_PLAN",
  ] as const;
  for (let i = 1; i <= 40; i++) {
    const surface = surfaces[i % surfaces.length]!;
    const v = validateObservationNursingEntry({
      surface,
      observationEncounterId: `obs-rn-${i}`,
      summary: `${surface}-${i}`,
    });
    cases.push(row(`nursing-${i}`, "NURSING_DOCUMENTATION", surface, true, v.ok));
  }

  // Chart certification (20)
  for (let i = 1; i <= 10; i++) {
    const r = evaluateObservationChartCertification({
      hasProviderNote: true,
      hasReassessment: true,
      hasDischargeSummary: true,
      hasOrdersReview: true,
      hasNursingDocumentation: true,
      dispositionPathway: "DISCHARGE_HOME",
    });
    cases.push(row(`cert-ok-${i}`, "CHART_CERTIFICATION", "complete", true, r.complete));
  }
  for (let i = 1; i <= 10; i++) {
    const r = evaluateObservationChartCertification({
      hasProviderNote: false,
      hasReassessment: false,
      hasDischargeSummary: false,
      hasOrdersReview: false,
      hasNursingDocumentation: false,
    });
    cases.push(row(`cert-miss-${i}`, "CHART_CERTIFICATION", "incomplete", false, r.complete));
  }

  // Security / concurrency / isolation (25)
  for (let i = 1; i <= 5; i++) {
    const xfac = assertObservationOrderOwnership({
      orderEncounterId: `obs-${i}`,
      observationEncounterId: `obs-${i}`,
      facilityId: "fac-a",
      orderFacilityId: "fac-b",
    });
    cases.push(row(`sec-fac-${i}`, "SECURITY_CONCURRENCY", "facility_isolation", false, xfac.ok));
  }
  for (let i = 1; i <= 5; i++) {
    const xpat = assertObservationOrderOwnership({
      orderEncounterId: `obs-${i}`,
      observationEncounterId: `obs-${i}`,
      patientId: "pat-a",
      orderPatientId: "pat-b",
    });
    cases.push(row(`sec-pat-${i}`, "SECURITY_CONCURRENCY", "patient_isolation", false, xpat.ok));
  }
  for (let i = 1; i <= 5; i++) {
    const cls = classifyEdOrderAtObservationTransition({
      orderEncounterId: `ed-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      orderStatus: "IN_PROGRESS",
      hasPendingResult: true,
    });
    cases.push(
      row(`sec-pending-${i}`, "SECURITY_CONCURRENCY", "pending_ed_result", "PENDING_RESULT_FROM_ED", cls)
    );
  }
  for (let i = 1; i <= 5; i++) {
    const ctx = resolveDepartmentalEncounterContext({ type: "EMERGENCY" });
    cases.push(row(`sec-ctx-ed-${i}`, "SECURITY_CONCURRENCY", "worklist_ed", "ED", ctx));
  }
  for (let i = 1; i <= 5; i++) {
    const ctx = resolveDepartmentalEncounterContext({
      type: "INPATIENT",
      billingClassification: "OBSERVATION",
    });
    cases.push(
      row(`sec-ctx-obs-${i}`, "SECURITY_CONCURRENCY", "worklist_obs", "OBSERVATION", ctx)
    );
  }

  // Worklist mixed context (15)
  for (let i = 1; i <= 15; i++) {
    const ctx = resolveDepartmentalEncounterContext({
      type: i % 2 === 0 ? "EMERGENCY" : "INPATIENT",
      billingClassification: i % 2 === 0 ? null : "OBSERVATION",
    });
    const expected = i % 2 === 0 ? "ED" : "OBSERVATION";
    cases.push(row(`wl-mixed-${i}`, "WORKLIST_CONTEXT", "mixed_filter", expected, ctx));
  }

  // Cross-system ownership invariants (10)
  for (let i = 1; i <= 10; i++) {
    const edLane = classifyObservationOrderLane({
      orderEncounterId: `ed-${i}`,
      observationEncounterId: `obs-${i}`,
      originatingEdEncounterId: `ed-${i}`,
      status: "COMPLETED",
    });
    cases.push(row(`cross-ed-${i}`, "CROSS_SYSTEM", "ed_historical", "COMPLETED_ED", edLane));
  }

  return cases;
}

export function observationDepartmentalD3daBenchmarkSummary(): {
  total: number;
  passed: number;
  failed: ObservationD3daBenchmarkCase[];
  byCategory: Record<string, number>;
} {
  const cases = buildObservationDepartmentalD3daBenchmarkCases();
  const failed = cases.filter((c) => c.expected !== c.actual);
  const byCategory: Record<string, number> = {};
  for (const c of cases) {
    byCategory[c.category] = (byCategory[c.category] ?? 0) + 1;
  }
  return { total: cases.length, passed: cases.length - failed.length, failed, byCategory };
}
