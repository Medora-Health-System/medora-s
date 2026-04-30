export type BillingReadinessStatus =
  | "official_validated"
  | "candidate_only"
  | "pending_license"
  | "missing";

export type BillingReadinessCategory = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

export type BillingReviewDecisionStatus = "APPROVED" | "NEEDS_INFO" | "DO_NOT_BILL";

export type BillingReviewDecisionDto = {
  id: string;
  decision: BillingReviewDecisionStatus;
  notes: string | null;
  reviewerId: string;
  reviewedAt: string;
  billingEventId: string | null;
};

export type BillingReadinessItemDto = {
  orderItemId: string;
  medoraCode: string | null;
  category: BillingReadinessCategory;
  billingStatus: BillingReadinessStatus;
  billingCodeDefault: string | null;
  notes: string;
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
  latestDecision: BillingReviewDecisionDto | null;
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
