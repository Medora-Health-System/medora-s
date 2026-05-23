/** Phase 19D.1 — canonical product governance statuses (no runtime cutover). */

export const MEDICATION_PRODUCT_GOVERNANCE_STATUSES = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "READY_FOR_PHARMACY_REVIEW",
  "READY_FOR_BILLING_REVIEW",
  "READY_FOR_ACTIVATION",
  "ACTIVATION_APPROVED",
  /** Phase 19K.1 — controlled import high-risk queue (provider ordering not yet approved). */
  "HIGH_RISK_PENDING_APPROVAL",
  "BLOCKED",
  "RETIRED",
] as const;

export type MedicationProductGovernanceStatus =
  (typeof MEDICATION_PRODUCT_GOVERNANCE_STATUSES)[number];

export const MEDICATION_PRODUCT_GOVERNANCE_AUDIT_ENTITY = "MEDICATION_PRODUCT_GOVERNANCE";

export type MedicationProductGovernanceTimelineEntry = {
  at: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  userId: string | null;
  governanceNote: string | null;
};

export const PENDING_REVIEW_GOVERNANCE_STATUSES: MedicationProductGovernanceStatus[] = [
  "DRAFT",
  "REVIEW_REQUIRED",
  "READY_FOR_PHARMACY_REVIEW",
  "READY_FOR_BILLING_REVIEW",
  "HIGH_RISK_PENDING_APPROVAL",
];

export const HIGH_RISK_PENDING_GOVERNANCE_STATUS = "HIGH_RISK_PENDING_APPROVAL" as const;
