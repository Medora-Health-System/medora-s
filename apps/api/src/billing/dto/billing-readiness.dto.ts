export type BillingReadinessStatus =
  | "official_validated"
  | "candidate_only"
  | "pending_license"
  | "missing";

export type BillingReadinessCategory = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

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
};
