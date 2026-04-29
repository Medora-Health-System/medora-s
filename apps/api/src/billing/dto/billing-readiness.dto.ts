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
