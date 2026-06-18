import {
  resolveRevenueCycleQueue,
  type RevenueCycleClaimStatus,
  type RevenueCyclePaymentStatus,
  type RevenueCycleQueueView,
} from "@medora/shared";
import { revenueCycleLedgerHref } from "@/features/revenue/revenueCycleNavigation";

export type RevenueCycleBillingStatusLabel =
  | "ready"
  | "deficiency"
  | "not_reviewed";

export type RevenueCycleCodingStatusLabel = "ready" | "review_needed";

export type RevenueCycleClaimStatusLabel = "not_submitted" | "submitted" | "paid" | "unknown";

export type RevenueCycleQueueRow = {
  encounterId: string;
  encounterLabel: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string;
  providerName: string | null;
  queue: RevenueCycleQueueView;
  billingStatus: RevenueCycleBillingStatusLabel;
  codingStatus: RevenueCycleCodingStatusLabel;
  claimStatus: RevenueCycleClaimStatusLabel;
  ledgerHref: string;
};

export type BillingQueueReadinessSource = {
  isReady?: boolean;
  blockers?: string[];
};

export type BillingQueueEncounterSource = {
  id: string;
  createdAt?: string | null;
  dischargedAt?: string | null;
  physicianAssignedUserId?: string | null;
  billingReadiness?: BillingQueueReadinessSource | null;
  patient?: {
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
  claimSubmissionStatus?: RevenueCycleClaimStatus | null;
  paymentStatus?: RevenueCyclePaymentStatus | null;
  diagnosisCount?: number | null;
  providerDisplayName?: string | null;
};

function formatPatientName(patient: BillingQueueEncounterSource["patient"]): string {
  const first = patient?.firstName?.trim() ?? "";
  const last = patient?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || "—";
}

function resolveBillingStatusLabel(billingReady: boolean): RevenueCycleBillingStatusLabel {
  if (billingReady) return "ready";
  return "deficiency";
}

function resolveCodingStatusLabel(codingReady: boolean): RevenueCycleCodingStatusLabel {
  return codingReady ? "ready" : "review_needed";
}

function resolveClaimStatusLabel(
  claimStatus: RevenueCycleClaimStatus | null | undefined
): RevenueCycleClaimStatusLabel {
  if (claimStatus === "PAID") return "paid";
  if (claimStatus === "SUBMITTED") return "submitted";
  if (claimStatus === "NOT_SUBMITTED") return "not_submitted";
  return "unknown";
}

export function inferCodingReadyFromDiagnosisCount(diagnosisCount: number | null | undefined): boolean {
  return (diagnosisCount ?? 0) > 0;
}

export function inferBillingReadyFromQueueSource(
  source: BillingQueueEncounterSource
): boolean {
  if (typeof source.billingReadiness?.isReady === "boolean") {
    return source.billingReadiness.isReady;
  }
  return false;
}

export function projectRevenueCycleRowFromBillingQueueSource(
  source: BillingQueueEncounterSource
): RevenueCycleQueueRow {
  const billingReady = inferBillingReadyFromQueueSource(source);
  const codingReady = inferCodingReadyFromDiagnosisCount(source.diagnosisCount);
  const claimStatus = source.claimSubmissionStatus ?? "NOT_SUBMITTED";
  const paymentStatus = source.paymentStatus ?? "NOT_POSTED";
  const queue = resolveRevenueCycleQueue({
    billingReady,
    codingReady,
    claimStatus,
    paymentStatus,
  });

  const dateOfService = source.dischargedAt ?? source.createdAt ?? "";
  const encounterLabel = source.id.slice(0, 8).toUpperCase();

  return {
    encounterId: source.id,
    encounterLabel,
    patientName: formatPatientName(source.patient),
    mrn: source.patient?.mrn ?? null,
    dateOfService,
    providerName: source.providerDisplayName ?? source.physicianAssignedUserId ?? null,
    queue,
    billingStatus: resolveBillingStatusLabel(billingReady),
    codingStatus: resolveCodingStatusLabel(codingReady),
    claimStatus: resolveClaimStatusLabel(claimStatus),
    ledgerHref: revenueCycleLedgerHref(source.id),
  };
}

export function projectRevenueCycleRowsFromBillingQueueSources(
  sources: readonly BillingQueueEncounterSource[]
): RevenueCycleQueueRow[] {
  return sources.map((source) => projectRevenueCycleRowFromBillingQueueSource(source));
}

/** Shell placeholder rows — no API fetch; demonstrates queue layout only. */
export function buildRevenueCyclePlaceholderRows(): RevenueCycleQueueRow[] {
  return projectRevenueCycleRowsFromBillingQueueSources([
    {
      id: "enc-rev-ready-1",
      createdAt: "2026-06-01T10:00:00.000Z",
      dischargedAt: "2026-06-01T14:00:00.000Z",
      billingReadiness: { isReady: true },
      diagnosisCount: 2,
      providerDisplayName: "Dr. Laurent",
      patient: { firstName: "Marie", lastName: "Joseph", mrn: "MRN-100" },
      claimSubmissionStatus: "NOT_SUBMITTED",
      paymentStatus: "NOT_POSTED",
    },
    {
      id: "enc-rev-billing-1",
      createdAt: "2026-06-02T09:00:00.000Z",
      dischargedAt: "2026-06-02T13:00:00.000Z",
      billingReadiness: { isReady: false, blockers: ["MISSING_PAYER_CONTEXT"] },
      diagnosisCount: 1,
      providerDisplayName: "Dr. Pierre",
      patient: { firstName: "Jean", lastName: "Paul", mrn: "MRN-200" },
      claimSubmissionStatus: "NOT_SUBMITTED",
    },
    {
      id: "enc-rev-coding-1",
      createdAt: "2026-06-03T11:00:00.000Z",
      dischargedAt: "2026-06-03T15:00:00.000Z",
      billingReadiness: { isReady: true },
      diagnosisCount: 0,
      providerDisplayName: "Dr. Alexis",
      patient: { firstName: "Sonia", lastName: "Louis", mrn: "MRN-300" },
      claimSubmissionStatus: "NOT_SUBMITTED",
    },
    {
      id: "enc-rev-submitted-1",
      createdAt: "2026-05-28T08:00:00.000Z",
      dischargedAt: "2026-05-28T12:00:00.000Z",
      billingReadiness: { isReady: true },
      diagnosisCount: 1,
      providerDisplayName: "Dr. Noel",
      patient: { firstName: "Luc", lastName: "Charles", mrn: "MRN-400" },
      claimSubmissionStatus: "SUBMITTED",
      paymentStatus: "NOT_POSTED",
    },
    {
      id: "enc-rev-paid-1",
      createdAt: "2026-05-20T07:00:00.000Z",
      dischargedAt: "2026-05-20T11:00:00.000Z",
      billingReadiness: { isReady: true },
      diagnosisCount: 1,
      providerDisplayName: "Dr. Emile",
      patient: { firstName: "Ruth", lastName: "Desir", mrn: "MRN-500" },
      claimSubmissionStatus: "PAID",
      paymentStatus: "POSTED",
    },
  ]);
}
