/**
 * Stage B3 — medication / MAR / infusion / procedure / reassessment certification.
 * Certification ID: MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B3
 *
 * Extends Stage B2 contracts; does not replace them.
 */

import type { ChartCertificationB2Context } from "../chartCertificationB2/types.js";
import { CertificationModule } from "../chartCertificationB1/types.js";

export const CHART_CERTIFICATION_B3_ID =
  "MEDUI.ENTERPRISE_CHART_COMPLETION_CERTIFICATION_ENGINE_STAGE_B3" as const;

export const CHART_CERTIFICATION_B3_VERSION = "ed-chart-certification-b3-1.0.0" as const;

export const CHART_CERTIFICATION_B3_STAGE = "B3" as const;

export const STAGE_B3_EVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.MEDICATION_ORDERS,
  CertificationModule.MAR,
  CertificationModule.INFUSIONS,
  CertificationModule.MEDICATION_RECONCILIATION,
  CertificationModule.PROCEDURES,
  CertificationModule.FULL_REASSESSMENT,
] as const;

export const STAGE_B3_UNEVALUATED_MODULES: readonly CertificationModule[] = [
  CertificationModule.CLINICAL_PATHWAYS,
  CertificationModule.ADVANCED_MEDICATION_SAFETY,
  CertificationModule.DRUG_INTERACTIONS,
  CertificationModule.RENAL_DOSING,
  CertificationModule.HEPATIC_DOSING,
  CertificationModule.PEDIATRIC_DOSING,
] as const;

export type MedicationOrderSnapshot = {
  orderId: string;
  orderItemId: string;
  medicationLabel: string | null;
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  frequencyCode: string | null;
  isPrn: boolean;
  prnIndication: string | null;
  fulfillmentIntent: "ADMINISTER_CHART" | "PHARMACY_DISPENSE" | string | null;
  medicationLifecycleStatus: string | null;
  orderStatus: string;
  itemStatus: string;
  lifecycleState: string | null;
  heldReason: string | null;
  discontinueReason: string | null;
  cancelledAt: string | null;
  replacesOrderItemId: string | null;
  supersededByOrderItemId: string | null;
  startAt: string | null;
  endAt: string | null;
  updatedAt: string | null;
  catalogItemType: string | null;
  isDischargePrescription?: boolean;
  isHomeMedication?: boolean;
  isFutureOutpatient?: boolean;
  statusConflict?: boolean;
};

export type MarAdministrationSnapshot = {
  id: string;
  orderItemId: string;
  doseInstanceId: string | null;
  marAction: string | null;
  administeredAt: string | null;
  doseValue: string | null;
  doseUnit: string | null;
  route: string | null;
  notesHasRefusalReason: boolean;
  notesHasHoldReason: boolean;
  notesHasOmissionReason: boolean;
  notesHasNotAvailableAction: boolean;
  notesHasPrnIndication: boolean;
  notesHasEffectivenessResponse: boolean;
  infusionPhase: string | null;
  infusionSessionKey: string | null;
  wasteDocumented: boolean;
  witnessCompleted: boolean;
  controlledSubstance: boolean;
  wastedAmountPresent: boolean;
  quantityMismatch: boolean;
  updatedAt: string | null;
  voided: boolean;
  isCorrection: boolean;
};

export type DoseInstanceSnapshot = {
  id: string;
  orderItemId: string;
  doseStatus: string;
  scheduledAt: string | null;
  dueWindowStartAt: string | null;
  dueWindowEndAt: string | null;
  overdueAt: string | null;
  updatedAt: string | null;
};

export type InfusionSessionSnapshot = {
  id: string;
  orderItemId: string;
  status: "IN_PROGRESS" | "STOPPED" | "CANCELLED" | string;
  startedAt: string | null;
  stoppedAt: string | null;
  discontinuationReasonPresent: boolean;
  handoffDocumented: boolean;
  adverseEventDocumented: boolean;
  infiltrationDocumented: boolean;
  updatedAt: string | null;
};

export type ProcedureEvidenceSnapshot = {
  orderItemId: string;
  enterpriseProcedureId: string | null;
  procedureLabel: string | null;
  orderStatus: string;
  lifecycleState: string | null;
  performedClass:
    | "PROCEDURE_PERFORMED"
    | "PROCEDURE_PLANNED_NOT_PERFORMED"
    | "PROCEDURE_CANCELLED"
    | "PROCEDURE_REFUSED"
    | "PROCEDURE_ENTERED_IN_ERROR"
    | "PROCEDURE_STATUS_UNKNOWN"
    | string;
  hasSignedDocumentation: boolean;
  hasDocumentationEvent: boolean;
  consentPresent: boolean;
  timeoutPresent: boolean;
  operatorPresent: boolean;
  siteSidePresent: boolean;
  techniquePresent: boolean;
  complicationsStatusPresent: boolean;
  postAssessmentPresent: boolean;
  supplyOrChargeOnly: boolean;
  updatedAt: string | null;
};

export type ReassessmentEvidenceSnapshot = {
  id: string;
  kind: "PAIN" | "POST_MEDICATION" | "POST_PROCEDURE" | "PRN_RESPONSE" | "GENERIC" | string;
  triggerEntityId: string | null;
  completed: boolean;
  unableOrRefused: boolean;
  updatedAt: string | null;
};

export type ChartCertificationB3MedicationsContext = {
  medicationOrders: MedicationOrderSnapshot[];
  marAdministrations: MarAdministrationSnapshot[];
  doseInstances: DoseInstanceSnapshot[];
  infusionSessions: InfusionSessionSnapshot[];
  procedures: ProcedureEvidenceSnapshot[];
  reassessments: ReassessmentEvidenceSnapshot[];
  /** Deterministic revision token (counts + max updatedAt + status concat) — not Encounter.version. */
  medicationProcedureRevision: string;
  loadError?: { code: string; messageKey: string } | null;
};

export type ChartCertificationB3Context = ChartCertificationB2Context & {
  medications: ChartCertificationB3MedicationsContext;
};
