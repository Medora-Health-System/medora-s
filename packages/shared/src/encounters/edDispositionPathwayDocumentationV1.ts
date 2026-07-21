/**
 * D2.5 — pathway-specific disposition documentation (JSON, no Prisma migration).
 * Home discharge packet stays in dischargeSummaryJson; these keys never own Home.
 */

import type { EdDispositionPath } from "./edEncounterLifecycle.js";
import {
  isMseCompleted,
  isMseNotStarted,
  readMedicalScreeningExaminationV1,
} from "./medicalScreeningExaminationV1.js";

export const ER_AMA_DISPOSITION_V1_KEY = "erAmaDispositionV1" as const;
export const ER_LWBS_DISPOSITION_V1_KEY = "erLwbsDispositionV1" as const;
export const ER_ELOPEMENT_DISPOSITION_V1_KEY = "erElopementDispositionV1" as const;
export const ER_DECEASED_DISPOSITION_V1_KEY = "erDeceasedDispositionV1" as const;
export const ER_OTHER_DISPOSITION_V1_KEY = "erOtherDispositionV1" as const;

export type PathwayDocSource = "CURRENT" | "LEGACY";

export type PathwayBlocker = { code: string; message: string };

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function str(o: Record<string, unknown> | null, key: string): string {
  if (!o) return "";
  const v = o[key];
  return typeof v === "string" ? v.trim() : "";
}

function bool(o: Record<string, unknown> | null, key: string): boolean {
  return o?.[key] === true;
}

function readNs(nursingAssessment: unknown, key: string): Record<string, unknown> | null {
  return asObject(asObject(nursingAssessment)?.[key]);
}

/** AMA structured board fields (minimal durable set). */
export type AmaDispositionV1 = {
  intentToLeaveAt: string;
  reasonStated: string;
  recommendedCareSummary: string;
  capacityAssessed: "" | "YES" | "NO" | "UNABLE";
  capacityNarrative: string;
  materialRisksDiscussed: string;
  benefitsDiscussed: string;
  alternativesOffered: string;
  returnPrecautions: string;
  signatureOrRefusal: "" | "SIGNED" | "REFUSED" | "UNABLE";
  departureAt: string;
  conditionAtLastObservation: string;
  source: PathwayDocSource;
};

export function readAmaDispositionV1(nursingAssessment: unknown): AmaDispositionV1 {
  const o = readNs(nursingAssessment, ER_AMA_DISPOSITION_V1_KEY);
  const cap = str(o, "capacityAssessed");
  const sig = str(o, "signatureOrRefusal");
  return {
    intentToLeaveAt: str(o, "intentToLeaveAt"),
    reasonStated: str(o, "reasonStated"),
    recommendedCareSummary: str(o, "recommendedCareSummary"),
    capacityAssessed:
      cap === "YES" || cap === "NO" || cap === "UNABLE" ? cap : "",
    capacityNarrative: str(o, "capacityNarrative"),
    materialRisksDiscussed: str(o, "materialRisksDiscussed"),
    benefitsDiscussed: str(o, "benefitsDiscussed"),
    alternativesOffered: str(o, "alternativesOffered"),
    returnPrecautions: str(o, "returnPrecautions"),
    signatureOrRefusal:
      sig === "SIGNED" || sig === "REFUSED" || sig === "UNABLE" ? sig : "",
    departureAt: str(o, "departureAt"),
    conditionAtLastObservation: str(o, "conditionAtLastObservation"),
    source: str(o, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
  };
}

export type LwbsDispositionV1 = {
  careStage: string;
  lastSeenAt: string;
  searchAttemptsDocumented: boolean;
  departureAt: string;
  contactAttempted: boolean;
  source: PathwayDocSource;
};

export function readLwbsDispositionV1(nursingAssessment: unknown): LwbsDispositionV1 {
  const o = readNs(nursingAssessment, ER_LWBS_DISPOSITION_V1_KEY);
  return {
    careStage: str(o, "careStage"),
    lastSeenAt: str(o, "lastSeenAt"),
    searchAttemptsDocumented: bool(o, "searchAttemptsDocumented"),
    departureAt: str(o, "departureAt"),
    contactAttempted: bool(o, "contactAttempted"),
    source: str(o, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
  };
}

export type ElopementDispositionV1 = {
  careStage: string;
  lastSeenAt: string;
  lastKnownStatus: string;
  outstandingRisksDocumented: boolean;
  searchResponseDocumented: boolean;
  notificationsDocumented: boolean;
  eventClassification: string;
  source: PathwayDocSource;
};

export function readElopementDispositionV1(nursingAssessment: unknown): ElopementDispositionV1 {
  const o = readNs(nursingAssessment, ER_ELOPEMENT_DISPOSITION_V1_KEY);
  return {
    careStage: str(o, "careStage"),
    lastSeenAt: str(o, "lastSeenAt"),
    lastKnownStatus: str(o, "lastKnownStatus"),
    outstandingRisksDocumented: bool(o, "outstandingRisksDocumented"),
    searchResponseDocumented: bool(o, "searchResponseDocumented"),
    notificationsDocumented: bool(o, "notificationsDocumented"),
    eventClassification: str(o, "eventClassification"),
    source: str(o, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
  };
}

export type DeceasedDispositionV1 = {
  pronouncementComplete: boolean;
  dateOfDeath: string;
  timeOfDeath: string;
  pronouncedBy: string;
  nextOfKinNotificationStatus: string;
  medicalExaminerStatus: string;
  donationReferralStatus: string;
  postmortemCareComplete: boolean;
  belongingsDocumented: boolean;
  bodyCustodyDocumented: boolean;
  /** Separate from postmortem nursing care. */
  autopsyRequested: "" | "YES" | "NO" | "UNDETERMINED";
  source: PathwayDocSource;
};

export function readDeceasedDispositionV1(nursingAssessment: unknown): DeceasedDispositionV1 {
  const o = readNs(nursingAssessment, ER_DECEASED_DISPOSITION_V1_KEY);
  const aut = str(o, "autopsyRequested");
  return {
    pronouncementComplete: bool(o, "pronouncementComplete"),
    dateOfDeath: str(o, "dateOfDeath"),
    timeOfDeath: str(o, "timeOfDeath"),
    pronouncedBy: str(o, "pronouncedBy"),
    nextOfKinNotificationStatus: str(o, "nextOfKinNotificationStatus"),
    medicalExaminerStatus: str(o, "medicalExaminerStatus"),
    donationReferralStatus: str(o, "donationReferralStatus"),
    postmortemCareComplete: bool(o, "postmortemCareComplete"),
    belongingsDocumented: bool(o, "belongingsDocumented"),
    bodyCustodyDocumented: bool(o, "bodyCustodyDocumented"),
    autopsyRequested:
      aut === "YES" || aut === "NO" || aut === "UNDETERMINED" ? aut : "",
    source: str(o, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
  };
}

export type OtherDispositionV1 = {
  codedReason: string;
  explanation: string;
  supervisorReviewComplete: boolean;
  departureType: string;
  destination: string;
  source: PathwayDocSource;
};

export function readOtherDispositionV1(nursingAssessment: unknown): OtherDispositionV1 {
  const o = readNs(nursingAssessment, ER_OTHER_DISPOSITION_V1_KEY);
  return {
    codedReason: str(o, "codedReason"),
    explanation: str(o, "explanation"),
    supervisorReviewComplete: bool(o, "supervisorReviewComplete"),
    departureType: str(o, "departureType"),
    destination: str(o, "destination"),
    source: str(o, "source") === "LEGACY" ? "LEGACY" : "CURRENT",
  };
}

/**
 * Pathway-specific blockers. HOME returns [] — Home uses dischargeSummaryJson engine.
 * dischargeSummaryJson Home fields never satisfy these blockers.
 */
export function evaluatePathwayDocumentationBlockers(
  path: EdDispositionPath,
  nursingAssessment: unknown,
  _dischargeSummaryJson?: unknown
): PathwayBlocker[] {
  void _dischargeSummaryJson;
  const blockers: PathwayBlocker[] = [];

  if (path === "HOME" || path === "NONE" || path === "ADMISSION" || path === "TRANSFER") {
    return blockers;
  }

  if (path === "AMA") {
    const ama = readAmaDispositionV1(nursingAssessment);
    if (!ama.intentToLeaveAt) {
      blockers.push({ code: "AMA_DEPARTURE_REQUEST_MISSING", message: "AMA intent-to-leave time required." });
    }
    if (!ama.recommendedCareSummary) {
      blockers.push({
        code: "AMA_RECOMMENDED_CARE_NOT_DOCUMENTED",
        message: "Recommended care declined must be documented.",
      });
    }
    if (!ama.capacityAssessed) {
      blockers.push({
        code: "AMA_CAPACITY_NOT_DOCUMENTED",
        message: "Decision-making capacity assessment required.",
      });
    } else if (ama.capacityAssessed === "NO" || ama.capacityAssessed === "UNABLE") {
      blockers.push({
        code: "AMA_CAPACITY_ESCALATION_REQUIRED",
        message: "Capacity absent/uncertain — routine AMA completion blocked; escalate.",
      });
    }
    if (!ama.materialRisksDiscussed) {
      blockers.push({
        code: "AMA_MATERIAL_RISKS_NOT_DOCUMENTED",
        message: "Material risks of leaving must be documented.",
      });
    }
    if (!ama.benefitsDiscussed || !ama.alternativesOffered) {
      blockers.push({
        code: "AMA_ALTERNATIVES_NOT_DOCUMENTED",
        message: "Benefits and alternatives must be documented.",
      });
    }
    if (!ama.signatureOrRefusal) {
      blockers.push({
        code: "AMA_SIGNATURE_OR_REFUSAL_NOT_DOCUMENTED",
        message: "Patient signature or refusal-to-sign evidence required.",
      });
    }
    if (!ama.returnPrecautions) {
      blockers.push({
        code: "AMA_RETURN_PRECAUTIONS_MISSING",
        message: "Return precautions / invitation to return required.",
      });
    }
    if (!ama.departureAt) {
      blockers.push({
        code: "AMA_DEPARTURE_NOT_DOCUMENTED",
        message: "Actual departure time required.",
      });
    }
    return blockers;
  }

  if (path === "LWBS") {
    const lwbs = readLwbsDispositionV1(nursingAssessment);
    const mse = readMedicalScreeningExaminationV1(nursingAssessment);
    if (!isMseNotStarted(nursingAssessment) || mse.status !== "NOT_STARTED") {
      if (isMseCompleted(nursingAssessment) || mse.status === "IN_PROGRESS" || mse.status === "COMPLETED") {
        blockers.push({
          code: "LWBS_MSE_STATUS_CONFLICT",
          message: "LWBS requires MSE NOT_STARTED; use Elopement if evaluation began.",
        });
      }
    }
    if (!lwbs.careStage) {
      blockers.push({ code: "LWBS_CARE_STAGE_MISSING", message: "Pre-MSE care stage required." });
    }
    if (!lwbs.lastSeenAt) {
      blockers.push({ code: "LWBS_LAST_SEEN_TIME_MISSING", message: "Last seen / noticed-absent time required." });
    }
    if (!lwbs.searchAttemptsDocumented) {
      blockers.push({ code: "LWBS_SEARCH_ATTEMPTS_MISSING", message: "Attempts to locate must be documented." });
    }
    if (!lwbs.departureAt) {
      blockers.push({ code: "LWBS_DEPARTURE_MISSING", message: "Departure time (actual or estimated) required." });
    }
    return blockers;
  }

  if (path === "ELOPEMENT") {
    const el = readElopementDispositionV1(nursingAssessment);
    if (!el.careStage) {
      blockers.push({ code: "ELOPEMENT_CARE_STAGE_MISSING", message: "Post-MSE care stage required." });
    }
    if (!el.lastSeenAt || !el.lastKnownStatus) {
      blockers.push({
        code: "ELOPEMENT_LAST_KNOWN_STATUS_MISSING",
        message: "Last-known clinical status required.",
      });
    }
    if (!el.outstandingRisksDocumented) {
      blockers.push({
        code: "ELOPEMENT_OUTSTANDING_RISK_NOT_RECONCILED",
        message: "Outstanding risks/devices must be documented.",
      });
    }
    if (!el.searchResponseDocumented) {
      blockers.push({
        code: "ELOPEMENT_SEARCH_RESPONSE_MISSING",
        message: "Search and response actions required.",
      });
    }
    if (!el.notificationsDocumented) {
      blockers.push({
        code: "ELOPEMENT_NOTIFICATION_MISSING",
        message: "Provider/charge/security notifications required.",
      });
    }
    if (!el.eventClassification) {
      blockers.push({
        code: "ELOPEMENT_CLASSIFICATION_MISSING",
        message: "Event classification required.",
      });
    }
    return blockers;
  }

  if (path === "DECEASED") {
    const d = readDeceasedDispositionV1(nursingAssessment);
    if (!d.pronouncementComplete || !d.dateOfDeath || !d.timeOfDeath || !d.pronouncedBy) {
      blockers.push({
        code: "DEATH_PRONOUNCEMENT_INCOMPLETE",
        message: "Death pronouncement (date/time/clinician) incomplete.",
      });
    }
    if (!d.nextOfKinNotificationStatus) {
      blockers.push({
        code: "DEATH_NEXT_OF_KIN_NOTIFICATION_INCOMPLETE",
        message: "Family / next-of-kin notification status required.",
      });
    }
    if (!d.medicalExaminerStatus) {
      blockers.push({
        code: "DEATH_MEDICAL_EXAMINER_STATUS_UNRESOLVED",
        message: "Medical examiner/coroner status required (including not-required).",
      });
    }
    if (!d.postmortemCareComplete) {
      blockers.push({
        code: "DEATH_POSTMORTEM_CARE_INCOMPLETE",
        message: "Postmortem care documentation incomplete.",
      });
    }
    if (!d.belongingsDocumented) {
      blockers.push({
        code: "DEATH_BELONGINGS_INCOMPLETE",
        message: "Belongings inventory/release documentation incomplete.",
      });
    }
    if (!d.bodyCustodyDocumented) {
      blockers.push({
        code: "DEATH_BODY_CUSTODY_INCOMPLETE",
        message: "Body custody / destination documentation incomplete.",
      });
    }
    return blockers;
  }

  if (path === "OTHER") {
    const o = readOtherDispositionV1(nursingAssessment);
    if (!o.codedReason) {
      blockers.push({
        code: "OTHER_REASON_UNGOVERNED",
        message: "Governed coded reason required; free-text-only bypass forbidden.",
      });
    }
    if (!o.explanation) {
      blockers.push({
        code: "OTHER_EXPLANATION_MISSING",
        message: "Explanation why no defined disposition applies is required.",
      });
    }
    if (!o.supervisorReviewComplete) {
      blockers.push({
        code: "OTHER_SUPERVISOR_REVIEW_MISSING",
        message: "Supervisor review required for governed Other.",
      });
    }
    if (!o.departureType || !o.destination) {
      blockers.push({
        code: "OTHER_DEPARTURE_DETAILS_MISSING",
        message: "Departure type and destination required.",
      });
    }
  }

  return blockers;
}
