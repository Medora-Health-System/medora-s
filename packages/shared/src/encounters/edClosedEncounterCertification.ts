/**
 * MEDUI.ED.LIFECYCLE.6 — Closed encounter certification (read-only projection).
 *
 * Stage A authority: ADVISORY only.
 * - ESTABLISHED_WORKFLOW findings may inform authoritative readiness (disposition/departure).
 * - STAGE_A_ADVISORY findings never independently block closure, discharge, signing, or billing.
 */

import type { DispositionSafetyReadinessResponse } from "../schemas/patient.js";
import {
  chartCertificationDedupeKey,
  mergeChartCertificationDeficiencyFlags,
} from "./chartCertificationDedupe.js";
import {
  EdEncounterLifecycleState,
  evaluateEdEncounterDocumentationDeficiencies,
  isEdPhysicalDepartureCompleted,
  isEdProviderDocumentationSigned,
  resolveEdEncounterLifecycleState,
  type EdEncounterLifecycleEncounterSnapshot,
} from "./edEncounterLifecycle.js";

/** Stage A certification engine version (advisory shared projection). */
export const ED_CHART_CERTIFICATION_ENGINE_VERSION =
  "ed-chart-certification-engine-stage-a-1.1.0-advisory";

export const ED_CHART_CERTIFICATION_STAGE = "A" as const;

export const EdChartCertificationAuthority = {
  ADVISORY: "ADVISORY",
  AUTHORITATIVE: "AUTHORITATIVE",
} as const;

export type EdChartCertificationAuthority =
  (typeof EdChartCertificationAuthority)[keyof typeof EdChartCertificationAuthority];

export const EdChartCertificationCoverageStatus = {
  PARTIAL: "PARTIAL",
  FULL: "FULL",
} as const;

export type EdChartCertificationCoverageStatus =
  (typeof EdChartCertificationCoverageStatus)[keyof typeof EdChartCertificationCoverageStatus];

export const EdChartCertificationSourceAuthority = {
  ESTABLISHED_WORKFLOW: "ESTABLISHED_WORKFLOW",
  STAGE_A_ADVISORY: "STAGE_A_ADVISORY",
} as const;

export type EdChartCertificationSourceAuthority =
  (typeof EdChartCertificationSourceAuthority)[keyof typeof EdChartCertificationSourceAuthority];

export const STAGE_A_EVALUATED_MODULES = [
  "lifecycle_snapshot_documentation",
  "provider_signature_status",
  "physical_departure",
  "disposition_readiness_projection",
  "trackboard_ops_overlay",
  "billing_snapshot_projection",
  "demographics_overlay",
  "semantic_dedupe",
] as const;

export const STAGE_A_UNEVALUATED_MODULES = [
  "orders_results_lifecycle",
  "laboratory_result_lifecycle",
  "imaging_lifecycle",
  "ecg_lifecycle",
  "mar_intelligence",
  "procedures",
  "clinical_pathways",
  "contextual_vitals",
  "mutation_wide_freshness",
] as const;

export const STAGE_A_BENCHMARK_STATUS =
  "STAGE_A_SYNTHETIC_INSUFFICIENT_PRECISION_0_40" as const;

export const EdClosedEncounterCertificationStatus = {
  INCOMPLETE: "INCOMPLETE",
  READY_FOR_CLOSURE: "READY_FOR_CLOSURE",
  READY_FOR_BILLING: "READY_FOR_BILLING",
  CERTIFIED_CLOSED: "CERTIFIED_CLOSED",
} as const;

export type EdClosedEncounterCertificationStatus =
  (typeof EdClosedEncounterCertificationStatus)[keyof typeof EdClosedEncounterCertificationStatus];

export const EdClosedEncounterCertificationCategory = {
  PROVIDER_DOCUMENTATION: "PROVIDER_DOCUMENTATION",
  NURSING_DOCUMENTATION: "NURSING_DOCUMENTATION",
  DISPOSITION: "DISPOSITION",
  DIAGNOSIS: "DIAGNOSIS",
  MEDICATION_RECONCILIATION: "MEDICATION_RECONCILIATION",
  ORDER_RECONCILIATION: "ORDER_RECONCILIATION",
  RESULTS_ACKNOWLEDGEMENT: "RESULTS_ACKNOWLEDGEMENT",
  BILLING_CODING: "BILLING_CODING",
  DEMOGRAPHICS: "DEMOGRAPHICS",
  TIMESTAMPS: "TIMESTAMPS",
} as const;

export type EdClosedEncounterCertificationCategory =
  (typeof EdClosedEncounterCertificationCategory)[keyof typeof EdClosedEncounterCertificationCategory];

export const EdClosedEncounterCertificationSeverity = {
  INFO: "INFO",
  WARNING: "WARNING",
  BLOCKER: "BLOCKER",
} as const;

export type EdClosedEncounterCertificationSeverity =
  (typeof EdClosedEncounterCertificationSeverity)[keyof typeof EdClosedEncounterCertificationSeverity];

export const EdClosedEncounterCertificationResponsibleRole = {
  PROVIDER: "PROVIDER",
  NURSE: "NURSE",
  BILLING: "BILLING",
  CODING: "CODING",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;

export type EdClosedEncounterCertificationResponsibleRole =
  (typeof EdClosedEncounterCertificationResponsibleRole)[keyof typeof EdClosedEncounterCertificationResponsibleRole];

export type EdClosedEncounterCertificationDeficiency = {
  id: string;
  /** Stable machine code for i18n / analytics (not primary UI title). */
  stableCode?: string;
  /** Root-cause collapse key (semantic dedupe across engines). */
  deduplicationKey?: string;
  category: EdClosedEncounterCertificationCategory;
  severity: EdClosedEncounterCertificationSeverity;
  title: string;
  description: string;
  responsibleRole: EdClosedEncounterCertificationResponsibleRole;
  /**
   * Authoritative action block — true only for ESTABLISHED_WORKFLOW sources in Stage A.
   * STAGE_A_ADVISORY findings must keep this false.
   */
  blockingClosure: boolean;
  /**
   * Authoritative billing block — true only for ESTABLISHED_WORKFLOW sources in Stage A.
   * STAGE_A_ADVISORY findings must keep this false.
   */
  blockingBilling: boolean;
  /** Advisory review suggestion (Stage A). Never an action gate by itself. */
  suggestsClosureReview?: boolean;
  /** Advisory billing review suggestion (Stage A). Never an action gate by itself. */
  suggestsBillingReview?: boolean;
  sourceAuthority: EdChartCertificationSourceAuthority;
  source: string;
  remediationHint?: string;
};

export type EdChartCertificationAuthoritativeReadiness = {
  clinicalClosureReady: boolean;
  billingReady: boolean;
  dispositionReady: boolean;
};

export type EdChartCertificationAdvisoryReadiness = {
  providerReviewSuggested: boolean;
  nursingReviewSuggested: boolean;
  documentationReviewSuggested: boolean;
  clinicalClosureReviewSuggested: boolean;
  billingReviewSuggested: boolean;
};

export type EdClosedEncounterCertificationTrackboardOps = {
  resultsPendingCount?: number;
  criticalResultUnacknowledged?: boolean;
  openOrderCount?: number;
};

export type EdClosedEncounterCertificationDemographics = {
  dob?: string | null;
  sexAtBirth?: string | null;
  mrn?: string | null;
  phone?: string | null;
};

export type EdClosedEncounterCertificationInput = {
  lifecycleSnapshot: EdEncounterLifecycleEncounterSnapshot;
  dispositionReadiness?: DispositionSafetyReadinessResponse | null;
  trackboardOps?: EdClosedEncounterCertificationTrackboardOps | null;
  billingReadinessSnapshot?: Record<string, unknown> | null;
  demographics?: EdClosedEncounterCertificationDemographics | null;
  diagnosisCount?: number | null;
};

export type EdClosedEncounterCertificationResult = {
  status: EdClosedEncounterCertificationStatus;
  lifecycleState: EdEncounterLifecycleState;
  certificationVersion: string;
  certificationStage: typeof ED_CHART_CERTIFICATION_STAGE;
  certificationAuthority: EdChartCertificationAuthority;
  coverageStatus: EdChartCertificationCoverageStatus;
  evaluatedModules: readonly string[];
  unevaluatedModules: readonly string[];
  benchmarkStatus: typeof STAGE_A_BENCHMARK_STATUS;
  /** ISO timestamp when this projection was built (panel freshness). */
  evaluatedAt: string;
  /**
   * Stage A advisory aliases of authoritative readiness.
   * Do not use as action gates — prefer authoritativeReadiness.
   */
  closureReady: boolean;
  /** @deprecated Stage A — use authoritativeReadiness.clinicalClosureReady */
  clinicalClosureReady: boolean;
  /** @deprecated Stage A — use authoritativeReadiness.billingReady */
  billingReady: boolean;
  /** @deprecated Stage A — advisory; use advisoryReadiness.providerReviewSuggested */
  providerReady: boolean;
  /** @deprecated Stage A — advisory; use advisoryReadiness.nursingReviewSuggested */
  nursingReady: boolean;
  /** @deprecated Stage A — use authoritativeReadiness.dispositionReady */
  dispositionReady: boolean;
  authoritativeReadiness: EdChartCertificationAuthoritativeReadiness;
  advisoryReadiness: EdChartCertificationAdvisoryReadiness;
  certifiedClosed: boolean;
  allEncountersEligible: boolean;
  deficiencies: EdClosedEncounterCertificationDeficiency[];
  /** ESTABLISHED_WORKFLOW closure blockers only (may inform established gates). */
  closureBlockers: EdClosedEncounterCertificationDeficiency[];
  /** ESTABLISHED_WORKFLOW billing blockers only. */
  billingBlockers: EdClosedEncounterCertificationDeficiency[];
  /** Stage A advisory findings (non-blocking). */
  advisoryFindings: EdClosedEncounterCertificationDeficiency[];
  establishedFindings: EdClosedEncounterCertificationDeficiency[];
  providerDeficiencies: EdClosedEncounterCertificationDeficiency[];
  nursingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  billingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  codingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  summary: {
    closureLabel: "READY" | "NOT_READY";
    billingLabel: "READY" | "NOT_READY";
    providerLabel: "READY" | "NOT_READY";
    nursingLabel: "READY" | "NOT_READY";
    dispositionLabel: "READY" | "NOT_READY";
    advisoryChartReviewLabel: "CLEAR" | "FINDINGS_PRESENT";
    deficiencyCount: number;
    closureBlockerCount: number;
    billingBlockerCount: number;
    advisoryFindingCount: number;
  };
};

const DOC_CODE_CATEGORY: Record<
  string,
  { category: EdClosedEncounterCertificationCategory; role: EdClosedEncounterCertificationResponsibleRole }
> = {
  CHIEF_COMPLAINT: {
    category: EdClosedEncounterCertificationCategory.DIAGNOSIS,
    role: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
  },
  PROVIDER_DOCUMENTATION: {
    category: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
    role: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
  },
  NURSING_ASSESSMENT: {
    category: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
    role: EdClosedEncounterCertificationResponsibleRole.NURSE,
  },
  DISCHARGE_SUMMARY: {
    category: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
    role: EdClosedEncounterCertificationResponsibleRole.NURSE,
  },
  ADMISSION_SUMMARY: {
    category: EdClosedEncounterCertificationCategory.DISPOSITION,
    role: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
  },
};

const DISPOSITION_BLOCKER_CATEGORY: Record<
  string,
  EdClosedEncounterCertificationCategory
> = {
  ACTIVE_ORDERS_UNRESOLVED: EdClosedEncounterCertificationCategory.ORDER_RECONCILIATION,
  CRITICAL_RESULT_UNACKNOWLEDGED: EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT,
  MEDICATION_ADMINISTRATION_INCOMPLETE: EdClosedEncounterCertificationCategory.MEDICATION_RECONCILIATION,
  DISCHARGE_INSTRUCTIONS_INCOMPLETE: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  DISCHARGE_INSTRUCTIONS_MISSING: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  DISCHARGE_INSTRUCTIONS_NOT_GIVEN: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  DISCHARGE_FOLLOW_UP_MISSING: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  DISCHARGE_RETURN_PRECAUTIONS_MISSING: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  PROVIDER_DOCUMENTATION_UNSIGNED: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
  VITALS_STALE: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
  VITALS_MISSING: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
};

/** Prefer clinical semantics over raw code title-casing (content vs communication). */
const DISPOSITION_BLOCKER_TITLES: Record<string, string> = {
  DISCHARGE_INSTRUCTIONS_MISSING: "Discharge Instructions Content Missing",
  DISCHARGE_INSTRUCTIONS_NOT_GIVEN: "Discharge Instruction Communication Not Documented",
  DISCHARGE_FOLLOW_UP_MISSING: "Discharge Follow-Up Missing",
  DISCHARGE_RETURN_PRECAUTIONS_MISSING: "Discharge Return Precautions Missing",
  PROVIDER_DOCUMENTATION_UNSIGNED: "Provider Note Unsigned",
};

function deficiencyTitleForCode(code: string): string {
  if (DISPOSITION_BLOCKER_TITLES[code]) return DISPOSITION_BLOCKER_TITLES[code]!;
  return code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function pushDeficiency(
  list: EdClosedEncounterCertificationDeficiency[],
  seen: Set<string>,
  deficiency: EdClosedEncounterCertificationDeficiency
): void {
  const dedupeKey =
    deficiency.deduplicationKey ??
    chartCertificationDedupeKey({
      id: deficiency.id,
      stableCode: deficiency.stableCode,
    });
  const enriched = { ...deficiency, deduplicationKey: dedupeKey, stableCode: deficiency.stableCode ?? deficiency.id };
  const existingIndex = list.findIndex((d) => (d.deduplicationKey ?? d.id) === dedupeKey);
  if (existingIndex >= 0) {
    list[existingIndex] = mergeChartCertificationDeficiencyFlags(list[existingIndex]!, enriched);
    return;
  }
  if (seen.has(dedupeKey) || seen.has(deficiency.id)) return;
  seen.add(dedupeKey);
  seen.add(deficiency.id);
  list.push(enriched);
}

function mapDocumentationDeficiencies(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): EdClosedEncounterCertificationDeficiency[] {
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();
  const { deficiencies } = evaluateEdEncounterDocumentationDeficiencies(snapshot);
  const providerContentMissing = deficiencies.some((d) => d.code === "PROVIDER_DOCUMENTATION");
  for (const d of deficiencies) {
    const mapped = DOC_CODE_CATEGORY[d.code] ?? {
      category: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
      role: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
    };
    const suggestsBilling =
      mapped.category === EdClosedEncounterCertificationCategory.DIAGNOSIS;
    pushDeficiency(out, seen, {
      id: `doc:${d.code}`,
      stableCode: d.code,
      category: mapped.category,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: deficiencyTitleForCode(d.code),
      description: `Documentation deficiency: ${d.code}`,
      responsibleRole: mapped.role,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: true,
      suggestsBillingReview: suggestsBilling,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "evaluateEdEncounterDocumentationDeficiencies",
    });
  }
  // Unsigned signature only when provider content exists (avoid duplicate with missing-doc).
  if (!providerContentMissing && !isEdProviderDocumentationSigned(snapshot)) {
    pushDeficiency(out, seen, {
      id: "provider:unsigned",
      stableCode: "PROVIDER_NOTE_UNSIGNED",
      category: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Provider Note Unsigned",
      description: "Provider documentation exists but is not signed.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: true,
      suggestsBillingReview: true,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "providerDocumentationStatus",
      remediationHint: "Open provider documentation and sign the note.",
    });
  }
  return out;
}

function mapDispositionDeficiencies(
  snapshot: EdEncounterLifecycleEncounterSnapshot,
  dispositionReadiness?: DispositionSafetyReadinessResponse | null
): EdClosedEncounterCertificationDeficiency[] {
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();

  if (!isEdPhysicalDepartureCompleted(snapshot)) {
    pushDeficiency(out, seen, {
      id: "disposition:departure-incomplete",
      category: EdClosedEncounterCertificationCategory.DISPOSITION,
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Physical Departure Incomplete",
      description: "Disposition execution or handoff is not complete.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.NURSE,
      blockingClosure: true,
      blockingBilling: false,
      suggestsClosureReview: true,
      suggestsBillingReview: false,
      sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
      source: "isEdPhysicalDepartureCompleted",
    });
  }

  if (!snapshot.dischargedAt && isEdPhysicalDepartureCompleted(snapshot)) {
    pushDeficiency(out, seen, {
      id: "timestamps:departure-missing",
      category: EdClosedEncounterCertificationCategory.TIMESTAMPS,
      severity: EdClosedEncounterCertificationSeverity.INFO,
      title: "Departure Time Missing",
      description: "Encounter dischargedAt is not recorded.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.SYSTEM,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: false,
      suggestsBillingReview: false,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "dischargedAt",
    });
  }

  if (dispositionReadiness) {
    for (const blocker of dispositionReadiness.blockers) {
      const category =
        DISPOSITION_BLOCKER_CATEGORY[blocker.code] ??
        EdClosedEncounterCertificationCategory.DISPOSITION;
      const role =
        category === EdClosedEncounterCertificationCategory.ORDER_RECONCILIATION
          ? EdClosedEncounterCertificationResponsibleRole.PROVIDER
          : category === EdClosedEncounterCertificationCategory.MEDICATION_RECONCILIATION
            ? EdClosedEncounterCertificationResponsibleRole.NURSE
            : category === EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT
              ? EdClosedEncounterCertificationResponsibleRole.PROVIDER
              : EdClosedEncounterCertificationResponsibleRole.NURSE;
      const blocksBilling =
        blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED" ||
        category === EdClosedEncounterCertificationCategory.ORDER_RECONCILIATION;
      if (blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED") {
        const missingDoc = out.find(
          (d) => d.deduplicationKey === "PROVIDER_DOCUMENTATION_MISSING"
        );
        if (missingDoc) {
          // Promote advisory missing-doc to established when disposition reports unsigned.
          pushDeficiency(out, seen, {
            ...missingDoc,
            blockingClosure: true,
            blockingBilling: true,
            suggestsClosureReview: true,
            suggestsBillingReview: true,
            severity: EdClosedEncounterCertificationSeverity.BLOCKER,
            sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
            source: `${missingDoc.source}+dispositionReadiness`,
          });
          continue;
        }
      }
      pushDeficiency(out, seen, {
        id: `disposition:${blocker.code}`,
        stableCode: blocker.code,
        category,
        severity: EdClosedEncounterCertificationSeverity.BLOCKER,
        title:
          blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
            ? "Provider Note Unsigned"
            : deficiencyTitleForCode(blocker.code),
        description: blocker.message,
        responsibleRole:
          blocker.code === "PROVIDER_DOCUMENTATION_UNSIGNED"
            ? EdClosedEncounterCertificationResponsibleRole.PROVIDER
            : role,
        blockingClosure: true,
        blockingBilling: blocksBilling,
        suggestsClosureReview: true,
        suggestsBillingReview: blocksBilling,
        sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
        source: "dispositionReadiness",
      });
    }
  }

  return out;
}

function mapTrackboardOpsDeficiencies(
  ops?: EdClosedEncounterCertificationTrackboardOps | null
): EdClosedEncounterCertificationDeficiency[] {
  if (!ops) return [];
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();

  if ((ops.openOrderCount ?? 0) > 0) {
    pushDeficiency(out, seen, {
      id: "orders:open",
      category: EdClosedEncounterCertificationCategory.ORDER_RECONCILIATION,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Orders Not Reconciled",
      description: `${ops.openOrderCount} open order line(s) remain on the encounter.`,
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: true,
      suggestsBillingReview: true,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "trackboardOps.openOrderCount",
    });
  }

  if (ops.criticalResultUnacknowledged) {
    pushDeficiency(out, seen, {
      id: "results:critical-unacked",
      category: EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Critical Result Acknowledgement Needed",
      description: "A critical result requires provider acknowledgement.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: true,
      suggestsBillingReview: false,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "trackboardOps.criticalResultUnacknowledged",
    });
  }

  if ((ops.resultsPendingCount ?? 0) > 0) {
    pushDeficiency(out, seen, {
      id: "results:pending",
      category: EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT,
      severity: EdClosedEncounterCertificationSeverity.INFO,
      title: "Pending Results",
      description: `${ops.resultsPendingCount} result(s) still pending verification.`,
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: false,
      suggestsBillingReview: false,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "trackboardOps.resultsPendingCount",
    });
  }

  return out;
}

function mapBillingDeficiencies(
  snapshot: EdEncounterLifecycleEncounterSnapshot,
  billingReadinessSnapshot?: Record<string, unknown> | null,
  diagnosisCount?: number | null
): EdClosedEncounterCertificationDeficiency[] {
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();

  if (diagnosisCount != null && diagnosisCount <= 0) {
    pushDeficiency(out, seen, {
      id: "billing:diagnosis-missing",
      category: EdClosedEncounterCertificationCategory.BILLING_CODING,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Diagnosis Missing",
      description: "No encounter diagnoses are recorded for coding.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.CODING,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: false,
      suggestsBillingReview: true,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "diagnosisCount",
    });
  }

  const finalization = (snapshot.billingFinalizationStatus ?? "").trim();
  if (finalization === "NOT_READY") {
    pushDeficiency(out, seen, {
      id: "billing:not-ready",
      category: EdClosedEncounterCertificationCategory.BILLING_CODING,
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Billing Not Ready",
      description: "Billing finalization status is NOT_READY.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.BILLING,
      blockingClosure: false,
      blockingBilling: true,
      suggestsClosureReview: false,
      suggestsBillingReview: true,
      sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
      source: "billingFinalizationStatus",
    });
  }

  if (billingReadinessSnapshot && typeof billingReadinessSnapshot === "object") {
    const isReady = billingReadinessSnapshot.isReady === true;
    const requiresManual = billingReadinessSnapshot.requiresManualReview === true;
    if (!isReady) {
      pushDeficiency(out, seen, {
        id: "billing:snapshot-not-ready",
        category: EdClosedEncounterCertificationCategory.BILLING_CODING,
        severity: EdClosedEncounterCertificationSeverity.BLOCKER,
        title: "Billing Readiness Not Ready",
        description: "Billing readiness snapshot indicates the encounter is not ready.",
        responsibleRole: EdClosedEncounterCertificationResponsibleRole.BILLING,
        blockingClosure: false,
        blockingBilling: true,
        suggestsClosureReview: false,
        suggestsBillingReview: true,
        sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
        source: "billingReadinessSnapshotJson",
      });
    } else if (requiresManual) {
      pushDeficiency(out, seen, {
        id: "billing:manual-review",
        category: EdClosedEncounterCertificationCategory.BILLING_CODING,
        severity: EdClosedEncounterCertificationSeverity.WARNING,
        title: "Manual Billing Review Required",
        description: "Billing readiness requires manual review before claim assembly.",
        responsibleRole: EdClosedEncounterCertificationResponsibleRole.BILLING,
        blockingClosure: false,
        blockingBilling: true,
        suggestsClosureReview: false,
        suggestsBillingReview: true,
        sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
        source: "billingReadinessSnapshotJson",
      });
    }
    const reasons = billingReadinessSnapshot.reasons;
    if (Array.isArray(reasons)) {
      for (const reason of reasons) {
        if (typeof reason !== "string") continue;
        if (reason.includes("MISSING_PAYER") || reason.includes("PAYER")) {
          pushDeficiency(out, seen, {
            id: `billing:${reason}`,
            category: EdClosedEncounterCertificationCategory.BILLING_CODING,
            severity: EdClosedEncounterCertificationSeverity.WARNING,
            title: "Payer / Insurance Missing",
            description: `Billing readiness reason: ${reason}`,
            responsibleRole: EdClosedEncounterCertificationResponsibleRole.BILLING,
            blockingClosure: false,
            blockingBilling: true,
            suggestsClosureReview: false,
            suggestsBillingReview: true,
            sourceAuthority: EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW,
            source: "billingReadinessSnapshotJson",
          });
        }
      }
    }
  }

  return out;
}

function mapDemographicsDeficiencies(
  demographics?: EdClosedEncounterCertificationDemographics | null
): EdClosedEncounterCertificationDeficiency[] {
  if (!demographics) return [];
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();

  if (!demographics.dob?.trim()) {
    pushDeficiency(out, seen, {
      id: "demographics:dob",
      category: EdClosedEncounterCertificationCategory.DEMOGRAPHICS,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Date Of Birth Missing",
      description: "Patient date of birth is required for billing workflows.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.ADMIN,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: false,
      suggestsBillingReview: true,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "demographics.dob",
    });
  }

  if (!demographics.sexAtBirth?.trim()) {
    pushDeficiency(out, seen, {
      id: "demographics:sex",
      category: EdClosedEncounterCertificationCategory.DEMOGRAPHICS,
      severity: EdClosedEncounterCertificationSeverity.INFO,
      title: "Sex At Birth Missing",
      description: "Patient sex at birth may be required for billing export.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.ADMIN,
      blockingClosure: false,
      blockingBilling: false,
      suggestsClosureReview: false,
      suggestsBillingReview: false,
      sourceAuthority: EdChartCertificationSourceAuthority.STAGE_A_ADVISORY,
      source: "demographics.sexAtBirth",
    });
  }

  return out;
}

function partitionDeficiencies(deficiencies: EdClosedEncounterCertificationDeficiency[]) {
  const establishedFindings = deficiencies.filter(
    (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW
  );
  const advisoryFindings = deficiencies.filter(
    (d) => d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY
  );
  return {
    closureBlockers: establishedFindings.filter((d) => d.blockingClosure),
    billingBlockers: establishedFindings.filter((d) => d.blockingBilling),
    establishedFindings,
    advisoryFindings,
    providerDeficiencies: deficiencies.filter(
      (d) => d.responsibleRole === EdClosedEncounterCertificationResponsibleRole.PROVIDER
    ),
    nursingDeficiencies: deficiencies.filter(
      (d) => d.responsibleRole === EdClosedEncounterCertificationResponsibleRole.NURSE
    ),
    billingDeficiencies: deficiencies.filter(
      (d) =>
        d.responsibleRole === EdClosedEncounterCertificationResponsibleRole.BILLING ||
        d.category === EdClosedEncounterCertificationCategory.BILLING_CODING
    ),
    codingDeficiencies: deficiencies.filter(
      (d) => d.responsibleRole === EdClosedEncounterCertificationResponsibleRole.CODING
    ),
  };
}

function resolveCertificationStatus(args: {
  snapshot: EdEncounterLifecycleEncounterSnapshot;
  closureBlockers: EdClosedEncounterCertificationDeficiency[];
  billingBlockers: EdClosedEncounterCertificationDeficiency[];
}): EdClosedEncounterCertificationStatus {
  const { snapshot, closureBlockers, billingBlockers } = args;
  const isClosed = (snapshot.status ?? "").trim() === "CLOSED";
  const signed = isEdProviderDocumentationSigned(snapshot);

  if (isClosed && signed && closureBlockers.length === 0 && billingBlockers.length === 0) {
    return EdClosedEncounterCertificationStatus.CERTIFIED_CLOSED;
  }

  if (closureBlockers.length > 0) {
    return EdClosedEncounterCertificationStatus.INCOMPLETE;
  }

  if (!isClosed) {
    return EdClosedEncounterCertificationStatus.READY_FOR_CLOSURE;
  }

  if (billingBlockers.length === 0) {
    return EdClosedEncounterCertificationStatus.READY_FOR_BILLING;
  }

  return EdClosedEncounterCertificationStatus.INCOMPLETE;
}

/** All Encounters archive eligibility (LIFECYCLE.6 prep — billing finalization not required). */
export function isEdAllEncountersEligible(
  certification: Pick<
    EdClosedEncounterCertificationResult,
    "certifiedClosed" | "allEncountersEligible"
  >
): boolean {
  return certification.allEncountersEligible;
}

/** Stage A never authorizes action blocking from advisory findings alone. */
export function stageAAdvisoryDeficiencyCanBlockActions(
  deficiency: Pick<EdClosedEncounterCertificationDeficiency, "sourceAuthority" | "blockingClosure" | "blockingBilling">
): boolean {
  if (deficiency.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY) {
    return false;
  }
  return deficiency.blockingClosure || deficiency.blockingBilling;
}

export function buildEdClosedEncounterCertification(
  input: EdClosedEncounterCertificationInput
): EdClosedEncounterCertificationResult {
  const snapshot = input.lifecycleSnapshot;
  const lifecycleState = resolveEdEncounterLifecycleState(snapshot);
  const evaluatedAt = new Date().toISOString();

  const merged: EdClosedEncounterCertificationDeficiency[] = [];
  const mergeSeen = new Set<string>();
  for (const d of [
    ...mapDocumentationDeficiencies(snapshot),
    ...mapDispositionDeficiencies(snapshot, input.dispositionReadiness),
    ...mapTrackboardOpsDeficiencies(input.trackboardOps),
    ...mapBillingDeficiencies(snapshot, input.billingReadinessSnapshot, input.diagnosisCount),
    ...mapDemographicsDeficiencies(input.demographics),
  ]) {
    pushDeficiency(merged, mergeSeen, d);
  }
  const deficiencies = merged;

  const partitioned = partitionDeficiencies(deficiencies);

  const authoritativeClinicalClosureReady = partitioned.closureBlockers.length === 0;
  const authoritativeBillingReady = partitioned.billingBlockers.length === 0;
  const authoritativeDispositionReady =
    input.dispositionReadiness != null
      ? input.dispositionReadiness.canClose === true
      : !partitioned.establishedFindings.some(
          (d) =>
            d.blockingClosure &&
            (d.category === EdClosedEncounterCertificationCategory.DISPOSITION ||
              d.id.startsWith("disposition:"))
        );

  const authoritativeReadiness: EdChartCertificationAuthoritativeReadiness = {
    clinicalClosureReady: authoritativeClinicalClosureReady,
    billingReady: authoritativeBillingReady,
    dispositionReady: authoritativeDispositionReady,
  };

  const advisoryClinicalClosureReviewSuggested = deficiencies.some(
    (d) => d.suggestsClosureReview === true
  );
  const advisoryBillingReviewSuggested = deficiencies.some(
    (d) => d.suggestsBillingReview === true
  );
  const advisoryReadiness: EdChartCertificationAdvisoryReadiness = {
    providerReviewSuggested: partitioned.providerDeficiencies.some(
      (d) =>
        d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY &&
        (d.suggestsClosureReview || d.suggestsBillingReview)
    ),
    nursingReviewSuggested: partitioned.nursingDeficiencies.some(
      (d) =>
        d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY &&
        (d.suggestsClosureReview || d.suggestsBillingReview)
    ),
    documentationReviewSuggested: deficiencies.some(
      (d) =>
        d.sourceAuthority === EdChartCertificationSourceAuthority.STAGE_A_ADVISORY &&
        (d.category === EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION ||
          d.category === EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION) &&
        (d.suggestsClosureReview || d.suggestsBillingReview)
    ),
    clinicalClosureReviewSuggested: advisoryClinicalClosureReviewSuggested,
    billingReviewSuggested: advisoryBillingReviewSuggested,
  };

  // Stage A: legacy readiness fields mirror authoritative readiness only (never advisory FP gates).
  const closureReady = authoritativeReadiness.clinicalClosureReady;
  const billingReady = authoritativeReadiness.billingReady;
  const dispositionReady = authoritativeReadiness.dispositionReady;
  const providerReady = !partitioned.providerDeficiencies.some(
    (d) =>
      d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW &&
      d.blockingClosure
  );
  const nursingReady = !partitioned.nursingDeficiencies.some(
    (d) =>
      d.sourceAuthority === EdChartCertificationSourceAuthority.ESTABLISHED_WORKFLOW &&
      d.blockingClosure
  );

  const isClosed = (snapshot.status ?? "").trim() === "CLOSED";
  const signed = isEdProviderDocumentationSigned(snapshot);

  // Archive eligibility uses established closure + established billing readiness only.
  const certifiedClosed =
    isClosed &&
    signed &&
    authoritativeReadiness.clinicalClosureReady &&
    authoritativeReadiness.billingReady;
  const allEncountersEligible = certifiedClosed;

  const status = resolveCertificationStatus({
    snapshot,
    closureBlockers: partitioned.closureBlockers,
    billingBlockers: partitioned.billingBlockers,
  });

  return {
    status,
    lifecycleState,
    certificationVersion: ED_CHART_CERTIFICATION_ENGINE_VERSION,
    certificationStage: ED_CHART_CERTIFICATION_STAGE,
    certificationAuthority: EdChartCertificationAuthority.ADVISORY,
    coverageStatus: EdChartCertificationCoverageStatus.PARTIAL,
    evaluatedModules: STAGE_A_EVALUATED_MODULES,
    unevaluatedModules: STAGE_A_UNEVALUATED_MODULES,
    benchmarkStatus: STAGE_A_BENCHMARK_STATUS,
    evaluatedAt,
    closureReady,
    clinicalClosureReady: closureReady,
    billingReady,
    providerReady,
    nursingReady,
    dispositionReady,
    authoritativeReadiness,
    advisoryReadiness,
    certifiedClosed,
    allEncountersEligible,
    deficiencies,
    ...partitioned,
    summary: {
      closureLabel: authoritativeReadiness.clinicalClosureReady ? "READY" : "NOT_READY",
      billingLabel: authoritativeReadiness.billingReady ? "READY" : "NOT_READY",
      providerLabel: providerReady ? "READY" : "NOT_READY",
      nursingLabel: nursingReady ? "READY" : "NOT_READY",
      dispositionLabel: authoritativeReadiness.dispositionReady ? "READY" : "NOT_READY",
      advisoryChartReviewLabel: partitioned.advisoryFindings.some(
        (d) => d.suggestsClosureReview || d.suggestsBillingReview
      )
        ? "FINDINGS_PRESENT"
        : "CLEAR",
      deficiencyCount: deficiencies.length,
      closureBlockerCount: partitioned.closureBlockers.length,
      billingBlockerCount: partitioned.billingBlockers.length,
      advisoryFindingCount: partitioned.advisoryFindings.length,
    },
  };
}
