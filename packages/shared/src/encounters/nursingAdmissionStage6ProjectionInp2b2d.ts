/**
 * MEDUI.INP.2B.2D — Stage 6 is a projection of existing authorities.
 * Does not create a second handoff, order, code-status, or medication-reconciliation engine.
 */

import { INPATIENT_ADMISSION_CLINICAL_SECTIONS } from "./connectedInpatientAdmissionIntakeD4a0.js";
import { resolveAuthoritativeCodeStatus } from "./authoritativeDomainLinkageD4a26h.js";
import { projectInpatientReviewOrders } from "./inpatientReviewOrdersProjectionInp2d.js";
import type { InpatientClinicalOpsV1 } from "./inpatientClinicalOpsV1.js";
import type { MedSurgNursingAdmissionDocV1 } from "./medSurgNursingAdmissionD4a1.js";
import { computeAdmissionCompletionSummary } from "./medSurgNursingAdmissionD4a1.js";

const STAGE6_SECTION = "PROVIDER_ADMISSION" as const;

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
    handoff: "providerHandoff" | "assessmentNotify" | "admissionOrders" | "nursingReady";
    providerNotified: "nursingAdmissionAssessment" | "explicit" | "unknown";
    admissionOrders: "enterpriseOrderEngine";
    codeStatus: "inpatientClinicalOpsV1" | "NOT_DOCUMENTED";
    medicationReconciliation: "homeMedicationsSection" | "clinicalOpsRecon" | "notStarted";
  };
  nursingResponsibilitiesSatisfied: boolean;
  providerHpRequired: false;
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
  const notifiedFromAssessment =
    yn(assessment.providerNotified) ?? yn(assessment.urgentProviderNotification);
  const notifiedExplicit = yn(existing.providerNotifiedOfArrival);
  const providerNotifiedOfArrival: "YES" | "NO" | "UNKNOWN" =
    notifiedFromAssessment ?? notifiedExplicit ?? "UNKNOWN";

  const ordersPresent = nursingAdmissionQualifyingOrdersPresent(input.orders);
  const admissionOrdersPresent: "YES" | "NO" = ordersPresent ? "YES" : "NO";

  const code = resolveAuthoritativeCodeStatus(input.ops);
  const codeStatusConfirmed: "YES" | "NO" | "UNKNOWN" = code.documented ? "YES" : "UNKNOWN";

  const homeMed = (input.doc.sections.HOME_MEDICATIONS?.answers ?? {}) as Record<string, unknown>;
  const homeComplete =
    input.doc.sections.HOME_MEDICATIONS?.completionState === "COMPLETE" ||
    String(homeMed.reconComplete ?? "") === "YES";
  const opsRecon = Array.isArray(input.ops?.medicationReconciliation)
    ? input.ops!.medicationReconciliation!.length > 0
    : false;
  const medReconStatus: "COMPLETE" | "IN_PROGRESS" | "NOT_STARTED" = homeComplete
    ? "COMPLETE"
    : opsRecon
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  let handoffStatus = "PROVIDER_NOTIFIED";
  let handoffSource: NursingAdmissionStage6Projection["sources"]["handoff"] = "nursingReady";
  if (input.doc.providerHandoff) {
    handoffStatus = "PROVIDER_NOTIFIED";
    handoffSource = "providerHandoff";
  } else if (ordersPresent) {
    handoffStatus = "ORDERS_RECEIVED";
    handoffSource = "admissionOrders";
  } else if (providerNotifiedOfArrival === "YES") {
    handoffStatus = "PROVIDER_NOTIFIED";
    handoffSource = "assessmentNotify";
  } else {
    handoffStatus = "ORDERS_PENDING";
    handoffSource = "nursingReady";
  }

  const answers: NursingAdmissionStage6Answers = {
    handoffStatus,
    providerNotifiedOfArrival,
    admissionOrdersPresent,
    codeStatusConfirmed,
    medReconStatus,
  };

  const prior19 = nursingAdmissionPriorNineteenResolved(input.doc);
  const nursingResponsibilitiesSatisfied = prior19 && handoffStatus !== "NOT_STARTED";

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
      medicationReconciliation: homeComplete
        ? "homeMedicationsSection"
        : opsRecon
          ? "clinicalOpsRecon"
          : "notStarted",
    },
    nursingResponsibilitiesSatisfied,
    providerHpRequired: false,
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
        completionState: "COMPLETE",
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
  const projected = applyStage6ProjectionAnswers(
    input.doc,
    projectNursingAdmissionStage6(input)
  );
  return computeAdmissionCompletionSummary(projected).allRequiredComplete;
}
