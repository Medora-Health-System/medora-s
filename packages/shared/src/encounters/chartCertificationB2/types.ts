/**
 * Stage B2 — diagnostic lifecycle certification (orders, lab, imaging, ECG, review, critical ack).
 * Certification ID: MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B2
 *
 * Extends Stage B1 contracts; does not replace them.
 */

import type { ChartCertificationB1Context } from "../chartCertificationB1/types.js";
import { CertificationModule } from "../chartCertificationB1/types.js";

export const CHART_CERTIFICATION_B2_ID =
  "MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B2" as const;

export const CHART_CERTIFICATION_B2_VERSION = "ed-chart-certification-b2-1.0.0" as const;

export const CHART_CERTIFICATION_B2_STAGE = "B2" as const;

export const STAGE_B2_EVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.ORDERS,
  CertificationModule.LAB_RESULTS,
  CertificationModule.IMAGING,
  CertificationModule.ECG,
  CertificationModule.RESULT_ACKNOWLEDGMENT,
] as const;

export const STAGE_B2_UNEVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.MEDICATION_ORDERS,
  CertificationModule.MAR,
  CertificationModule.INFUSIONS,
  CertificationModule.PROCEDURES,
  CertificationModule.CLINICAL_PATHWAYS,
  CertificationModule.FULL_REASSESSMENT,
] as const;

export const DiagnosticLifecycleState = {
  COMPLETE: "COMPLETE",
  PENDING_ACCEPTABLE: "PENDING_ACCEPTABLE",
  PENDING_REVIEW: "PENDING_REVIEW",
  BLOCKING_UNRESOLVED: "BLOCKING_UNRESOLVED",
  CANCELLED_VALID: "CANCELLED_VALID",
  DISCONTINUED_VALID: "DISCONTINUED_VALID",
  REFUSED_VALID: "REFUSED_VALID",
  NOT_PERFORMED_VALID: "NOT_PERFORMED_VALID",
  ENTERED_IN_ERROR: "ENTERED_IN_ERROR",
  DUPLICATE_SUPERSEDED: "DUPLICATE_SUPERSEDED",
  EXTERNAL_FOLLOW_UP: "EXTERNAL_FOLLOW_UP",
  FUTURE_NOT_APPLICABLE: "FUTURE_NOT_APPLICABLE",
  EXCLUDED_MEDICATION: "EXCLUDED_MEDICATION",
  EXCLUDED_PROCEDURE: "EXCLUDED_PROCEDURE",
  UNKNOWN: "UNKNOWN",
  ERROR: "ERROR",
} as const;

export type DiagnosticLifecycleState =
  (typeof DiagnosticLifecycleState)[keyof typeof DiagnosticLifecycleState];

export const DiagnosticCategory = {
  LABORATORY: "LABORATORY",
  IMAGING: "IMAGING",
  ECG: "ECG",
  MEDICATION: "MEDICATION",
  PROCEDURE_NON_DIAGNOSTIC: "PROCEDURE_NON_DIAGNOSTIC",
  OTHER: "OTHER",
} as const;

export type DiagnosticCategory = (typeof DiagnosticCategory)[keyof typeof DiagnosticCategory];

export type DiagnosticResultSnapshot = {
  id: string;
  criticalValue: boolean;
  verifiedAt: string | null;
  verifiedByUserId: string | null;
  acknowledgedByProviderAt: string | null;
  acknowledgedByUserId: string | null;
  updatedAt: string | null;
  /** Presence of result payload — never full report body. */
  hasResultPayload: boolean;
  /** Test/policy: preliminary result explicitly acceptable. */
  preliminaryAcceptable?: boolean;
};

export type DiagnosticOrderItemSnapshot = {
  orderId: string;
  orderItemId: string;
  orderType: string;
  catalogItemType: string | null;
  enterpriseProcedureId: string | null;
  orderStatus: string;
  itemStatus: string;
  lifecycleState: string | null;
  priority: string | null;
  placedAt: string | null;
  updatedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  orderedBy: string | null;
  replacesOrderItemId: string | null;
  supersededByOrderItemId: string | null;
  documentedCollectedAt: string | null;
  effectiveCollectedAt: string | null;
  documentedPerformedAt: string | null;
  effectivePerformedAt: string | null;
  documentedCompletedAt: string | null;
  completedAt: string | null;
  medicationLifecycleStatus: string | null;
  result: DiagnosticResultSnapshot | null;
  refusalDocumented?: boolean;
  notPerformedDocumented?: boolean;
  specimenRejected?: boolean;
  unableToObtain?: boolean;
  sendOut?: boolean;
  followUpOwnerPresent?: boolean;
  followUpActive?: boolean;
  isFutureOutpatient?: boolean;
  /** Contradictory status fixture for UNKNOWN/ERROR paths. */
  statusConflict?: boolean;
};

export type EcgDocumentationSnapshot = {
  entryId: string;
  cardId: string;
  performed: boolean | null;
  providerReviewed: boolean | null;
  criticalFindingPresent: boolean | null;
  providerNotified: boolean | null;
  /** Rhythm-strip style interpretation present (not machine-only claim). */
  interpretationPresent: boolean;
  /** Durable provider signature — typically absent; false unless explicitly modeled. */
  interpretationSigned: boolean;
  machineInterpretationOnly?: boolean;
  updatedAt: string | null;
};

export type NormalizedDiagnosticItem = {
  orderId: string;
  orderItemId: string;
  category: DiagnosticCategory;
  sourceStatus: string;
  lifecycleState: string | null;
  normalizedLifecycle: DiagnosticLifecycleState;
  placedAt: string | null;
  updatedAt: string | null;
  orderedBy: string | null;
  responsibleRole: string;
  resultRequired: boolean;
  reviewRequired: boolean;
  criticalAckRequired: boolean;
  exclusionReason: string | null;
  sourceAuthority: "STAGE_B2_EVALUATED" | "HEURISTIC_FALLBACK";
  snapshot: DiagnosticOrderItemSnapshot;
};

export type ChartCertificationB2DiagnosticsContext = {
  orderItems: DiagnosticOrderItemSnapshot[];
  ecgDocumentation: EcgDocumentationSnapshot[];
  /** max(order/item/result/ecg.updatedAt) ISO — used when Encounter.version does not bump */
  diagnosticRevision: string;
  /** Explicit limitation when send-out follow-up model is absent. */
  sendOutFollowUpModelPresent: boolean;
  loadError?: { code: string; messageKey: string } | null;
};

export type ChartCertificationB2Context = ChartCertificationB1Context & {
  diagnostics: ChartCertificationB2DiagnosticsContext;
};
