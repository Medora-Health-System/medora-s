/**
 * MEDUI.ED.LIFECYCLE.6 — Closed encounter certification (read-only projection).
 * Connects lifecycle closure readiness with billing/coding readiness signals.
 */

import type { DispositionSafetyReadinessResponse } from "../schemas/patient.js";
import {
  EdEncounterLifecycleState,
  evaluateEdEncounterDocumentationDeficiencies,
  isEdPhysicalDepartureCompleted,
  isEdProviderDocumentationSigned,
  resolveEdEncounterLifecycleState,
  type EdEncounterLifecycleEncounterSnapshot,
} from "./edEncounterLifecycle.js";

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
  category: EdClosedEncounterCertificationCategory;
  severity: EdClosedEncounterCertificationSeverity;
  title: string;
  description: string;
  responsibleRole: EdClosedEncounterCertificationResponsibleRole;
  blockingClosure: boolean;
  blockingBilling: boolean;
  source: string;
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
  closureReady: boolean;
  billingReady: boolean;
  certifiedClosed: boolean;
  allEncountersEligible: boolean;
  deficiencies: EdClosedEncounterCertificationDeficiency[];
  closureBlockers: EdClosedEncounterCertificationDeficiency[];
  billingBlockers: EdClosedEncounterCertificationDeficiency[];
  providerDeficiencies: EdClosedEncounterCertificationDeficiency[];
  nursingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  billingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  codingDeficiencies: EdClosedEncounterCertificationDeficiency[];
  summary: {
    closureLabel: "READY" | "NOT_READY";
    billingLabel: "READY" | "NOT_READY";
    deficiencyCount: number;
    closureBlockerCount: number;
    billingBlockerCount: number;
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
  PROVIDER_DOCUMENTATION_UNSIGNED: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
  VITALS_STALE: EdClosedEncounterCertificationCategory.NURSING_DOCUMENTATION,
};

function deficiencyTitleForCode(code: string): string {
  return code.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function pushDeficiency(
  list: EdClosedEncounterCertificationDeficiency[],
  seen: Set<string>,
  deficiency: EdClosedEncounterCertificationDeficiency
): void {
  if (seen.has(deficiency.id)) return;
  seen.add(deficiency.id);
  list.push(deficiency);
}

function mapDocumentationDeficiencies(
  snapshot: EdEncounterLifecycleEncounterSnapshot
): EdClosedEncounterCertificationDeficiency[] {
  const out: EdClosedEncounterCertificationDeficiency[] = [];
  const seen = new Set<string>();
  const { deficiencies } = evaluateEdEncounterDocumentationDeficiencies(snapshot);
  for (const d of deficiencies) {
    const mapped = DOC_CODE_CATEGORY[d.code] ?? {
      category: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
      role: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
    };
    pushDeficiency(out, seen, {
      id: `doc:${d.code}`,
      category: mapped.category,
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: deficiencyTitleForCode(d.code),
      description: `Documentation deficiency: ${d.code}`,
      responsibleRole: mapped.role,
      blockingClosure: true,
      blockingBilling: mapped.category === EdClosedEncounterCertificationCategory.DIAGNOSIS,
      source: "evaluateEdEncounterDocumentationDeficiencies",
    });
  }
  if (!isEdProviderDocumentationSigned(snapshot)) {
    pushDeficiency(out, seen, {
      id: "provider:unsigned",
      category: EdClosedEncounterCertificationCategory.PROVIDER_DOCUMENTATION,
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Provider Signature Needed",
      description: "Provider documentation is not signed.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: true,
      blockingBilling: true,
      source: "providerDocumentationStatus",
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
      source: "isEdPhysicalDepartureCompleted",
    });
  }

  if (!snapshot.dischargedAt && isEdPhysicalDepartureCompleted(snapshot)) {
    pushDeficiency(out, seen, {
      id: "timestamps:departure-missing",
      category: EdClosedEncounterCertificationCategory.TIMESTAMPS,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Departure Time Missing",
      description: "Encounter dischargedAt is not recorded.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.SYSTEM,
      blockingClosure: false,
      blockingBilling: false,
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
      pushDeficiency(out, seen, {
        id: `disposition:${blocker.code}`,
        category,
        severity: EdClosedEncounterCertificationSeverity.BLOCKER,
        title: deficiencyTitleForCode(blocker.code),
        description: blocker.message,
        responsibleRole: role,
        blockingClosure: true,
        blockingBilling: category === EdClosedEncounterCertificationCategory.ORDER_RECONCILIATION,
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
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Orders Not Reconciled",
      description: `${ops.openOrderCount} open order line(s) remain on the encounter.`,
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: true,
      blockingBilling: true,
      source: "trackboardOps.openOrderCount",
    });
  }

  if (ops.criticalResultUnacknowledged) {
    pushDeficiency(out, seen, {
      id: "results:critical-unacked",
      category: EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT,
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Critical Result Acknowledgement Needed",
      description: "A critical result requires provider acknowledgement.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: true,
      blockingBilling: false,
      source: "trackboardOps.criticalResultUnacknowledged",
    });
  }

  if ((ops.resultsPendingCount ?? 0) > 0) {
    pushDeficiency(out, seen, {
      id: "results:pending",
      category: EdClosedEncounterCertificationCategory.RESULTS_ACKNOWLEDGEMENT,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Pending Results",
      description: `${ops.resultsPendingCount} result(s) still pending verification.`,
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.PROVIDER,
      blockingClosure: false,
      blockingBilling: false,
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
      severity: EdClosedEncounterCertificationSeverity.BLOCKER,
      title: "Diagnosis Missing",
      description: "No encounter diagnoses are recorded for coding.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.CODING,
      blockingClosure: false,
      blockingBilling: true,
      source: "diagnosisCount",
    });
  }

  const finalization = (snapshot.billingFinalizationStatus ?? "").trim();
  if (finalization === "NOT_READY") {
    pushDeficiency(out, seen, {
      id: "billing:not-ready",
      category: EdClosedEncounterCertificationCategory.BILLING_CODING,
      severity: EdClosedEncounterCertificationSeverity.WARNING,
      title: "Billing Not Ready",
      description: "Billing finalization status is NOT_READY.",
      responsibleRole: EdClosedEncounterCertificationResponsibleRole.BILLING,
      blockingClosure: false,
      blockingBilling: true,
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
      blockingBilling: true,
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
      source: "demographics.sexAtBirth",
    });
  }

  return out;
}

function partitionDeficiencies(deficiencies: EdClosedEncounterCertificationDeficiency[]) {
  return {
    closureBlockers: deficiencies.filter((d) => d.blockingClosure),
    billingBlockers: deficiencies.filter((d) => d.blockingBilling),
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

export function buildEdClosedEncounterCertification(
  input: EdClosedEncounterCertificationInput
): EdClosedEncounterCertificationResult {
  const snapshot = input.lifecycleSnapshot;
  const lifecycleState = resolveEdEncounterLifecycleState(snapshot);

  const deficiencies = [
    ...mapDocumentationDeficiencies(snapshot),
    ...mapDispositionDeficiencies(snapshot, input.dispositionReadiness),
    ...mapTrackboardOpsDeficiencies(input.trackboardOps),
    ...mapBillingDeficiencies(snapshot, input.billingReadinessSnapshot, input.diagnosisCount),
    ...mapDemographicsDeficiencies(input.demographics),
  ];

  const partitioned = partitionDeficiencies(deficiencies);
  const closureReady = partitioned.closureBlockers.length === 0;
  const billingReady = partitioned.billingBlockers.length === 0;
  const isClosed = (snapshot.status ?? "").trim() === "CLOSED";
  const signed = isEdProviderDocumentationSigned(snapshot);

  const certifiedClosed = isClosed && signed && closureReady && billingReady;

  const allEncountersEligible = certifiedClosed;

  const status = resolveCertificationStatus({
    snapshot,
    closureBlockers: partitioned.closureBlockers,
    billingBlockers: partitioned.billingBlockers,
  });

  return {
    status,
    lifecycleState,
    closureReady,
    billingReady,
    certifiedClosed,
    allEncountersEligible,
    deficiencies,
    ...partitioned,
    summary: {
      closureLabel: closureReady ? "READY" : "NOT_READY",
      billingLabel: billingReady ? "READY" : "NOT_READY",
      deficiencyCount: deficiencies.length,
      closureBlockerCount: partitioned.closureBlockers.length,
      billingBlockerCount: partitioned.billingBlockers.length,
    },
  };
}
