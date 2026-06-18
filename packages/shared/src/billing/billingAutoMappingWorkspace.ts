import type {
  BillingAutoMappingCandidate,
  BillingAutoMappingCandidateType,
  BillingAutoMappingConfidence,
  BillingAutoMappingDecision,
} from "./billingAutoMappingGovernance.js";
import { billingEventHasManualLedgerEdit } from "./billingAutoMappingGovernance.js";

export const BILLING_AUTO_MAPPING_QUEUE = {
  APPLY_READY: "APPLY_READY",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  SKIPPED: "SKIPPED",
  MAPPED: "MAPPED",
} as const;

export type BillingAutoMappingQueueView = keyof typeof BILLING_AUTO_MAPPING_QUEUE;

export type BillingAutoMappingAppliedMetadata = {
  at?: string;
  source?: string;
  userId?: string;
  candidateType?: BillingAutoMappingCandidateType;
  confidence?: BillingAutoMappingConfidence;
  previousCode?: string | null;
  newCode?: string | null;
};

export type BillingAutoMappingWorkspaceRowInput = {
  ledgerRowId: string;
  encounterId: string;
  patientName: string;
  patientMrn: string | null;
  sourceType: BillingAutoMappingCandidateType;
  description: string;
  suggestedCode: string;
  confidence: BillingAutoMappingConfidence | null;
  decision: BillingAutoMappingDecision;
  manuallyEdited: boolean;
  doNotBill: boolean;
  metadata?: unknown;
  appliedCode?: string | null;
  appliedAt?: string | null;
  appliedByUserId?: string | null;
  ambiguousCatalogMatch?: boolean;
};

export type BillingAutoMappingWorkspaceRow = {
  encounterId: string;
  patientName: string;
  patientMrn: string | null;
  ledgerRowId: string;
  sourceType: BillingAutoMappingCandidateType;
  description: string;
  suggestedCode: string;
  confidence: BillingAutoMappingConfidence | null;
  queue: BillingAutoMappingQueueView;
  manuallyEdited: boolean;
  doNotBill: boolean;
  appliedCode?: string | null;
  appliedAt?: string | null;
  appliedByUserId?: string | null;
  ambiguousCatalogMatch?: boolean;
};

export type BillingAutoMappingWorkspaceCounts = {
  applyReady: number;
  reviewRequired: number;
  skipped: number;
  mapped: number;
  total: number;
};

export function readBillingAutoMappingAppliedMetadata(
  metadata: unknown
): BillingAutoMappingAppliedMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const applied = (metadata as Record<string, unknown>).autoMappingApplied;
  if (!applied || typeof applied !== "object" || Array.isArray(applied)) return null;
  return applied as BillingAutoMappingAppliedMetadata;
}

export function resolveBillingAutoMappingQueue(input: {
  decision: BillingAutoMappingDecision;
  metadata?: unknown;
  isMapped?: boolean;
}): BillingAutoMappingQueueView {
  if (input.isMapped || readBillingAutoMappingAppliedMetadata(input.metadata)) {
    return BILLING_AUTO_MAPPING_QUEUE.MAPPED;
  }
  if (input.decision === "APPLY") return BILLING_AUTO_MAPPING_QUEUE.APPLY_READY;
  if (input.decision === "REVIEW") return BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED;
  return BILLING_AUTO_MAPPING_QUEUE.SKIPPED;
}

export function buildBillingAutoMappingWorkspaceRow(
  input: BillingAutoMappingWorkspaceRowInput
): BillingAutoMappingWorkspaceRow {
  const appliedMeta = readBillingAutoMappingAppliedMetadata(input.metadata);
  const isMapped = Boolean(appliedMeta) || Boolean(input.appliedAt);
  const queue = resolveBillingAutoMappingQueue({
    decision: input.decision,
    metadata: input.metadata,
    isMapped,
  });
  return {
    encounterId: input.encounterId,
    patientName: input.patientName,
    patientMrn: input.patientMrn,
    ledgerRowId: input.ledgerRowId,
    sourceType: input.sourceType,
    description: input.description,
    suggestedCode: input.suggestedCode,
    confidence: input.confidence,
    queue,
    manuallyEdited: input.manuallyEdited,
    doNotBill: input.doNotBill,
    appliedCode: input.appliedCode ?? appliedMeta?.newCode ?? null,
    appliedAt: input.appliedAt ?? appliedMeta?.at ?? null,
    appliedByUserId: input.appliedByUserId ?? appliedMeta?.userId ?? null,
    ambiguousCatalogMatch: input.ambiguousCatalogMatch,
  };
}

export function workspaceRowFromCandidate(
  candidate: BillingAutoMappingCandidate,
  context: {
    encounterId: string;
    patientName: string;
    patientMrn: string | null;
    manuallyEdited: boolean;
    doNotBill: boolean;
    metadata?: unknown;
    ambiguousCatalogMatch?: boolean;
  }
): BillingAutoMappingWorkspaceRow {
  return buildBillingAutoMappingWorkspaceRow({
    ledgerRowId: candidate.ledgerLineId,
    encounterId: context.encounterId,
    patientName: context.patientName,
    patientMrn: context.patientMrn,
    sourceType: candidate.candidateType,
    description: candidate.sourceLabel,
    suggestedCode: candidate.proposedCode,
    confidence: candidate.confidence,
    decision: candidate.decision,
    manuallyEdited: context.manuallyEdited,
    doNotBill: context.doNotBill,
    metadata: context.metadata,
    ambiguousCatalogMatch: context.ambiguousCatalogMatch,
  });
}

export function partitionBillingAutoMappingRows(
  rows: readonly BillingAutoMappingWorkspaceRow[]
): Record<BillingAutoMappingQueueView, BillingAutoMappingWorkspaceRow[]> {
  const applyReady: BillingAutoMappingWorkspaceRow[] = [];
  const reviewRequired: BillingAutoMappingWorkspaceRow[] = [];
  const skipped: BillingAutoMappingWorkspaceRow[] = [];
  const mapped: BillingAutoMappingWorkspaceRow[] = [];
  for (const row of rows) {
    switch (row.queue) {
      case BILLING_AUTO_MAPPING_QUEUE.APPLY_READY:
        applyReady.push(row);
        break;
      case BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED:
        reviewRequired.push(row);
        break;
      case BILLING_AUTO_MAPPING_QUEUE.MAPPED:
        mapped.push(row);
        break;
      default:
        skipped.push(row);
    }
  }
  return {
    APPLY_READY: applyReady,
    REVIEW_REQUIRED: reviewRequired,
    SKIPPED: skipped,
    MAPPED: mapped,
  };
}

export function computeBillingAutoMappingCounts(
  rows: readonly BillingAutoMappingWorkspaceRow[]
): BillingAutoMappingWorkspaceCounts {
  const partitioned = partitionBillingAutoMappingRows(rows);
  return {
    applyReady: partitioned.APPLY_READY.length,
    reviewRequired: partitioned.REVIEW_REQUIRED.length,
    skipped: partitioned.SKIPPED.length,
    mapped: partitioned.MAPPED.length,
    total: rows.length,
  };
}

export function filterBillingAutoMappingWorkspaceRows(
  rows: readonly BillingAutoMappingWorkspaceRow[],
  search: string
): BillingAutoMappingWorkspaceRow[] {
  const q = search.trim().toLowerCase();
  if (!q) return [...rows];
  return rows.filter((row) => {
    const haystack = [
      row.patientName,
      row.patientMrn ?? "",
      row.suggestedCode,
      row.appliedCode ?? "",
      row.description,
      row.encounterId,
      row.sourceType,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function billingWorkspaceRowLooksManuallyEdited(metadata: unknown): boolean {
  return billingEventHasManualLedgerEdit(metadata);
}
