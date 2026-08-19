/**
 * MEDUI.INP.2B.2D — Stage 6 is a projection of existing authorities.
 * Does not create a second handoff, order, code-status, or medication-reconciliation engine.
 *
 * Completion is NOT granted merely because fallback display strings are populated.
 */

import { INPATIENT_ADMISSION_CLINICAL_SECTIONS } from "./connectedInpatientAdmissionIntakeD4a0.js";
import { resolveAuthoritativeCodeStatus } from "./authoritativeDomainLinkageD4a26h.js";
import { projectInpatientReviewOrders } from "./inpatientReviewOrdersProjectionInp2d.js";
import type { InpatientClinicalOpsV1 } from "./inpatientClinicalOpsV1.js";
import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { computeAdmissionCompletionSummary } from "./medSurgNursingAdmissionD4a1.js";

const STAGE6_SECTION = "PROVIDER_ADMISSION" as const;

/** Pending handoff projections — never treat as a completed handoff. */
export const NURSING_ADMISSION_STAGE6_PENDING_HANDOFF = [
  "NOT_STARTED",
  "ORDERS_PENDING",
  "HP_PENDING",
] as const;

export type NursingAdmissionStage6Answers = {
  handoffStatus: string;
  providerNotifiedOfArrival: "YES" | "NO" | "UNKNOWN";
  admissionOrdersPresent: "YES" | "NO";
  codeStatusConfirmed: "YES" | "NO" | "UNKNOWN";
  medReconStatus: "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED";
};

export type NursingAdmissionStage6Projection = {
  answers: NursingAdmissionStage6Answers;
  sources: {
    handoff: "providerHandoff" | "assessmentNotify" | "pendingProjection";
    providerNotified: "nursingAdmissionAssessment" | "explicit" | "unknown";
    admissionOrders: "enterpriseOrderEngine";
    codeStatus: "inpatientClinicalOpsV1" | "NOT_DOCUMENTED";
    medicationReconciliation: "homeMedicationsReconComplete" | "clinicalOpsReconIncomplete" | "notStarted";
  };
  /** True only when nursing Stage-6 duties are actually met — not when placeholders are filled. */
  nursingResponsibilitiesSatisfied: boolean;
  providerHpRequired: false;
  handoffIsPendingProjection: boolean;
};

function yn(raw: unknown): "YES" | "NO" | "UNKNOWN" | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "YES" || v === "NO" || v === "UNKNOWN") return v;
  return null;
}

export function nursingAdmissionPriorNineteenResolved(
  doc: MedSurgNursingAdmissionDocV1 | null | undefined
): boolean {
  if (!doc) return false;
  return INPATIENT_ADMISSION_CLINICAL_SECTIONS.filter((id) => id !== STAGE6_SECTION).every((id) => {
    const st = doc.sections[id]?.completionState ?? "NOT_STARTED";
    return st === "COMPLETE" || st === "NOT_APPLICABLE" || st === "UNABLE_TO_COMPLETE";
  });
}

export function nursingAdmissionQualifyingOrdersPresent(orders: unknown[]): boolean {
  const projection = projectInpatientReviewOrders({
    encounterId: "stage6-order-projection",
    orders: orders ?? [],
  });
  return projection.lines.some((line) => {
    const buckets = line.buckets ?? [];
    if (buckets.includes("DISCONTINUED")) return false;
    return (
      buckets.includes("ACTIVE") ||
      buckets.includes("NEW_UNREVIEWED") ||
      buckets.includes("DUE") ||
      buckets.includes("OVERDUE") ||
      buckets.includes("SCHEDULED") ||
      buckets.includes("PRN") ||
      buckets.includes("STAT_URGENT") ||
      buckets.includes("PENDING_VERIFICATION") ||
      buckets.includes("HELD")
    );
  });
}

export function nursingAdmissionStage6HandoffIsPending(status: string | null | undefined): boolean {
  return (NURSING_ADMISSION_STAGE6_PENDING_HANDOFF as readonly string[]).includes(String(status ?? ""));
}

function homeMedReconAuthoritativelyComplete(doc: MedSurgNursingAdmissionDocV1): boolean {
  const homeMed = (doc.sections.HOME_MEDICATIONS?.answers ?? {}) as Record<string, unknown>;
  return String(homeMed.reconComplete ?? "").toUpperCase() === "YES";
}

export function projectNursingAdmissionStage6(input: {
  doc: MedSurgNursingAdmissionDocV1;
  ops: InpatientClinicalOpsV1 | null | undefined;
  orders: unknown[];
}): NursingAdmissionStage6Projection {
  const assessment = (input.doc.sections.NURSING_ADMISSION_ASSESSMENT?.answers ?? {}) as Record<
    string,
    unknown
  >;
  const existing = (input.doc.sections.PROVIDER_ADMISSION?.answers ?? {}) as Record<string, unknown>;
  const notifiedFromAssessment = yn(assessment.providerNotified);
  const notifiedExplicit = yn(existing.providerNotifiedOfArrival);
  // Never infer notification from orders or from unrelated urgent-concern flags.
  const providerNotifiedOfArrival: "YES" | "NO" | "UNKNOWN" =
    notifiedFromAssessment ?? notifiedExplicit ?? "UNKNOWN";

  const ordersPresent = nursingAdmissionQualifyingOrdersPresent(input.orders);
  const admissionOrdersPresent: "YES" | "NO" = ordersPresent ? "YES" : "NO";

  const code = resolveAuthoritativeCodeStatus(input.ops);
  const codeStatusConfirmed: "YES" | "NO" | "UNKNOWN" = code.documented ? "YES" : "UNKNOWN";

  const reconComplete = homeMedReconAuthoritativelyComplete(input.doc);
  const opsReconRows = Array.isArray(input.ops?.medicationReconciliation)
    ? input.ops!.medicationReconciliation!.length > 0
    : false;
  const medReconStatus: "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED" = reconComplete
    ? "COMPLETE"
    : opsReconRows
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  let handoffStatus = "ORDERS_PENDING";
  let handoffSource: NursingAdmissionStage6Projection["sources"]["handoff"] = "pendingProjection";
  if (input.doc.providerHandoff) {
    const raw = String(input.doc.providerHandoff.status ?? "").toUpperCase();
    handoffStatus = raw === "COMPLETE" || raw === "ACKNOWLEDGED" ? "PROVIDER_NOTIFIED" : "ORDERS_PENDING";
    handoffSource = "providerHandoff";
  } else if (providerNotifiedOfArrival === "YES") {
    handoffStatus = "PROVIDER_NOTIFIED";
    handoffSource = "assessmentNotify";
  } else {
    handoffStatus = "ORDERS_PENDING";
    handoffSource = "pendingProjection";
  }

  const answers: NursingAdmissionStage6Answers = {
    handoffStatus,
    providerNotifiedOfArrival,
    admissionOrdersPresent,
    codeStatusConfirmed,
    medReconStatus,
  };

  const prior19 = nursingAdmissionPriorNineteenResolved(input.doc);
  const notifyDocumented = providerNotifiedOfArrival === "YES";
  const handoffIsPendingProjection =
    handoffSource === "pendingProjection" || nursingAdmissionStage6HandoffIsPending(handoffStatus);
  const nursingResponsibilitiesSatisfied =
    prior19 &&
    notifyDocumented &&
    reconComplete &&
    !nursingAdmissionStage6HandoffIsPending(handoffStatus);

  return {
    answers,
    sources: {
      handoff: handoffSource,
      providerNotified: notifiedFromAssessment
        ? "nursingAdmissionAssessment"
        : notifiedExplicit
          ? "explicit"
          : "unknown",
      admissionOrders: "enterpriseOrderEngine",
      codeStatus: code.source,
      medicationReconciliation: reconComplete
        ? "homeMedicationsReconComplete"
        : opsReconRows
          ? "clinicalOpsReconIncomplete"
          : "notStarted",
    },
    nursingResponsibilitiesSatisfied,
    providerHpRequired: false,
    handoffIsPendingProjection,
  };
}

export function applyStage6ProjectionAnswers(
  doc: MedSurgNursingAdmissionDocV1,
  projection: NursingAdmissionStage6Projection
): MedSurgNursingAdmissionDocV1 {
  const prior = doc.sections.PROVIDER_ADMISSION;
  return {
    ...doc,
    sections: {
      ...doc.sections,
      PROVIDER_ADMISSION: {
        ...prior,
        sectionId: "PROVIDER_ADMISSION",
        completionState: projection.nursingResponsibilitiesSatisfied
          ? "COMPLETE"
          : prior?.completionState === "COMPLETE"
            ? "IN_PROGRESS"
            : prior?.completionState ?? "IN_PROGRESS",
        expectedVersion: prior?.expectedVersion ?? doc.expectedVersion,
        answers: {
          ...(prior?.answers ?? {}),
          ...projection.answers,
        },
      },
    },
  };
}

export function nursingAdmissionMayCompleteAndSign(input: {
  doc: MedSurgNursingAdmissionDocV1;
  ops: InpatientClinicalOpsV1 | null | undefined;
  orders: unknown[];
}): boolean {
  if (input.doc.nurseSignature?.signed) return false;
  const projection = projectNursingAdmissionStage6(input);
  if (!projection.nursingResponsibilitiesSatisfied) return false;
  const projected = applyStage6ProjectionAnswers(input.doc, projection);
  return computeAdmissionCompletionSummary(projected).allRequiredComplete;
}
