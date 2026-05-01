export type BillingReadinessStatus =
  | "official_validated"
  | "candidate_only"
  | "pending_license"
  | "missing";

export type BillingReadinessCategory = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

/** Synthetic billing-review anchor for PROCEDURE_DOCUMENTED clinical events (S14D). */
export type BillingReviewAnchorType = "ORDER_ITEM" | "PROCEDURE_DOCUMENTED";

export type BillingReviewDecisionStatus = "APPROVED" | "NEEDS_INFO" | "DO_NOT_BILL";

export type BillingReviewDecisionDto = {
  id: string;
  orderItemId: string;
  decision: BillingReviewDecisionStatus;
  notes: string | null;
  reviewerId: string;
  /** Derived from reviewer user record when available. */
  reviewerName: string | null;
  reviewedAt: string;
  billingEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Audit log rows for manual billing review decisions (`entityType` BILLING_REVIEW_DECISION). */
export type BillingReviewDecisionAuditEntryDto = {
  id: string;
  createdAt: string;
  action: string;
  userId: string | null;
  actorDisplayName: string | null;
  decision: BillingReviewDecisionStatus | null;
  hasNotes: boolean | null;
  billingEventId: string | null;
};

export type BillingReadinessItemDto = {
  orderItemId: string;
  medoraCode: string | null;
  category: BillingReadinessCategory;
  billingStatus: BillingReadinessStatus;
  billingCodeDefault: string | null;
  notes: string;
  /** When set, documents a clinical procedure event bridge row (review-only; not an OrderItem). */
  evidenceSource?: string | null;
  reviewAnchorType?: BillingReviewAnchorType;
  procedureClinicalEventId?: string | null;
};

export type BillingExportRowDto = BillingReadinessItemDto & {
  displayName: string;
  quantity: number | null;
  unit: string | null;
};

export type BillingAutoBillDecisionDto = {
  orderItemId: string;
  medoraCode: string;
  category: BillingReadinessCategory;
  billingStatus: BillingReadinessStatus;
  canAutoBill: boolean;
  requiredReview: boolean;
  reason: string;
  displayName?: string | null;
  evidenceSource?: string | null;
  reviewAnchorType?: BillingReviewAnchorType;
};

export type BillingManualReviewRowDto = {
  encounterId: string;
  patientId: string;
  patientName: string;
  orderItemId: string;
  medoraCode: string;
  category: BillingReadinessCategory;
  displayName: string;
  billingStatus: BillingReadinessStatus;
  reason: string;
  createdAt: string;
  evidenceSource?: string | null;
  reviewAnchorType?: BillingReviewAnchorType;
  procedureClinicalEventId?: string | null;
  latestDecision: BillingReviewDecisionDto | null;
  /** Newest-first audit events for this order item (from AuditLog). */
  decisionAuditTrail: BillingReviewDecisionAuditEntryDto[];
};

export type BillingReviewDecisionRequestDto = {
  decision: BillingReviewDecisionStatus;
  notes?: string;
  billingEventId?: string;
};

export type BillingManualReviewGateItemDto = {
  orderItemId: string;
  medoraCode: string;
  category: BillingReadinessCategory;
  displayName: string;
  billingStatus: BillingReadinessStatus;
  reason: string;
  latestDecision: BillingReviewDecisionDto | null;
};

export type BillingManualReviewGateDto = {
  encounterId: string;
  unresolvedCount: number;
  unresolvedItems: BillingManualReviewGateItemDto[];
  doNotBillOrderItemIds: string[];
};
