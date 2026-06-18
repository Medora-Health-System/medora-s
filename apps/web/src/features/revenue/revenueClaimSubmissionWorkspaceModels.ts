import type {
  ClaimSubmissionWorkspaceQueue,
  RevenueClaimSubmissionRowDto,
} from "@medora/shared";

export type RevenueClaimQueueRow = {
  encounterId: string;
  patientName: string;
  mrn: string | null;
  dateOfService: string;
  providerName: string | null;
  payerName: string | null;
  claimId: string;
  submissionStatus: string;
  lastUpdatedAt: string;
  queue: ClaimSubmissionWorkspaceQueue;
  ledgerHref: string;
  claimHref: string;
};

export function mapRevenueClaimApiRowToWorkspaceRow(
  row: RevenueClaimSubmissionRowDto
): RevenueClaimQueueRow {
  return {
    encounterId: row.encounterId,
    patientName: row.patientName,
    mrn: row.mrn,
    dateOfService: row.dateOfService ?? "",
    providerName: row.provider,
    payerName: row.payer,
    claimId: row.claimId,
    submissionStatus: row.submissionStatus,
    lastUpdatedAt: row.lastUpdatedAt,
    queue: row.queue,
    ledgerHref: row.ledgerHref,
    claimHref: row.claimHref,
  };
}
