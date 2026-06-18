import {
  BILLING_AUTO_MAPPING_QUEUE,
  type BillingAutoMappingQueueView,
  type BillingAutoMappingWorkspaceRow,
} from "./billingAutoMappingWorkspace.js";
import type { BillingAutoMappingConfidence } from "./billingAutoMappingGovernance.js";

export type BillingAutoMappingBulkSelectionRow = Pick<
  BillingAutoMappingWorkspaceRow,
  "ledgerRowId" | "queue" | "confidence" | "manuallyEdited" | "doNotBill"
> & {
  ambiguousCatalogMatch?: boolean;
};

export type BillingAutoMappingBulkValidationResult = {
  validIds: string[];
  invalidIds: string[];
  reasonsById: Record<string, string>;
};

export function canBulkApplyAutoMapping(row: BillingAutoMappingBulkSelectionRow): boolean {
  if (row.queue !== BILLING_AUTO_MAPPING_QUEUE.APPLY_READY) return false;
  if (row.confidence !== "HIGH") return false;
  if (row.manuallyEdited) return false;
  if (row.doNotBill) return false;
  if (row.ambiguousCatalogMatch) return false;
  return true;
}

export function bulkApplyBlockedReason(row: BillingAutoMappingBulkSelectionRow): string | null {
  if (row.queue === BILLING_AUTO_MAPPING_QUEUE.MAPPED) return "Already mapped";
  if (row.queue === BILLING_AUTO_MAPPING_QUEUE.REVIEW_REQUIRED) return "Requires manual review";
  if (row.queue === BILLING_AUTO_MAPPING_QUEUE.SKIPPED) return "Not eligible for bulk apply";
  if (row.doNotBill) return "Marked DO NOT BILL";
  if (row.manuallyEdited) return "Manually edited ledger line";
  if (row.ambiguousCatalogMatch) return "Ambiguous catalog match";
  if (row.confidence === "MEDIUM") return "Medium confidence requires review";
  if (row.confidence === "LOW") return "Low confidence";
  if (row.confidence !== "HIGH") return "Confidence not high enough";
  if (row.queue !== BILLING_AUTO_MAPPING_QUEUE.APPLY_READY) return "Not apply-ready";
  return null;
}

export function validateBulkAutoMappingSelection(
  rows: readonly BillingAutoMappingBulkSelectionRow[],
  selectedLedgerRowIds: readonly string[]
): BillingAutoMappingBulkValidationResult {
  const byId = new Map(rows.map((row) => [row.ledgerRowId, row]));
  const validIds: string[] = [];
  const invalidIds: string[] = [];
  const reasonsById: Record<string, string> = {};

  for (const ledgerRowId of selectedLedgerRowIds) {
    const row = byId.get(ledgerRowId);
    if (!row) {
      invalidIds.push(ledgerRowId);
      reasonsById[ledgerRowId] = "Row not found or stale";
      continue;
    }
    if (!canBulkApplyAutoMapping(row)) {
      invalidIds.push(ledgerRowId);
      reasonsById[ledgerRowId] = bulkApplyBlockedReason(row) ?? "Not eligible";
      continue;
    }
    validIds.push(ledgerRowId);
  }

  return { validIds, invalidIds, reasonsById };
}

export function isBulkApplyQueue(queue: BillingAutoMappingQueueView): boolean {
  return queue === BILLING_AUTO_MAPPING_QUEUE.APPLY_READY;
}

export function bulkApplyRequiresHighConfidence(
  confidence: BillingAutoMappingConfidence | null
): confidence is "HIGH" {
  return confidence === "HIGH";
}
