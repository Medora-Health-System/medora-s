import type { PrismaClient } from "@prisma/client";
import { BillingReviewStatus, BillingSourceModule, EncounterStatus } from "@prisma/client";
import { billingLedgerRowMissingBillableCodeBlocksReadiness } from "@medora/shared";

export type BillingReadinessBlocker = { code: string; detail?: string };
export type BillingReadinessWarning = { code: string; detail?: string };

export type BillingReadinessResult = {
  isReady: boolean;
  blockers: BillingReadinessBlocker[];
  warnings: BillingReadinessWarning[];
  counts: {
    totalBillingEvents: number;
    uncodedLines: number;
    ledgerLinesNeedingReview: number;
    diagnosisCount: number;
  };
};

export type BillingReadinessDb = Pick<PrismaClient, "encounter" | "billingEvent" | "diagnosis">;

export type BillingEventReadinessRow = {
  reviewStatus: BillingReviewStatus;
  sourceModule: BillingSourceModule;
  procedureCode: string | null;
  hcpcsCode: string | null;
  code: string | null;
  diagnosisCodes: string | null;
};

export type EncounterReadinessContext = {
  status: EncounterStatus;
  dischargeStatus: unknown;
  physicianAssignedUserId: string | null;
};

/**
 * Core deterministic rules — used for single-encounter DB reads and batched queue evaluation.
 */
export function evaluateEncounterBillingReadinessFromData(
  enc: EncounterReadinessContext | null,
  events: BillingEventReadinessRow[],
  diagnosisCount: number
): BillingReadinessResult {
  if (!enc) {
    return {
      isReady: false,
      blockers: [{ code: "encounter_not_found" }],
      warnings: [],
      counts: {
        totalBillingEvents: 0,
        uncodedLines: 0,
        ledgerLinesNeedingReview: 0,
        diagnosisCount: 0,
      },
    };
  }

  let uncodedLines = 0;
  let ledgerLinesNeedingReview = 0;
  for (const ev of events) {
    if (billingLedgerRowMissingBillableCodeBlocksReadiness(ev)) uncodedLines++;
    if (ev.reviewStatus === BillingReviewStatus.CAPTURED) ledgerLinesNeedingReview++;
  }

  const blockers: BillingReadinessBlocker[] = [];
  const warnings: BillingReadinessWarning[] = [];

  if (enc.status !== EncounterStatus.CLOSED) {
    blockers.push({ code: "encounter_not_closed" });
  }
  if (enc.dischargeStatus == null) {
    blockers.push({ code: "missing_discharge_status" });
  }
  if (events.length === 0) {
    blockers.push({ code: "no_billing_events_captured" });
  }
  if (uncodedLines > 0) {
    blockers.push({ code: "uncoded_billing_lines", detail: String(uncodedLines) });
  }
  if (diagnosisCount === 0) {
    blockers.push({ code: "no_diagnosis_documented" });
  }

  if (ledgerLinesNeedingReview > 0) {
    warnings.push({ code: "ledger_lines_pending_review", detail: String(ledgerLinesNeedingReview) });
  }
  if (!enc.physicianAssignedUserId?.trim()) {
    warnings.push({ code: "missing_attending_provider_reference" });
  }

  const isReady = blockers.length === 0;

  return {
    isReady,
    blockers,
    warnings,
    counts: {
      totalBillingEvents: events.length,
      uncodedLines,
      ledgerLinesNeedingReview,
      diagnosisCount,
    },
  };
}

/**
 * Deterministic claim-readiness checks (Phase 3). No payer-specific rules.
 */
export async function computeEncounterBillingReadiness(
  db: BillingReadinessDb,
  facilityId: string,
  encounterId: string
): Promise<BillingReadinessResult> {
  const enc = await db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: {
      status: true,
      dischargeStatus: true,
      physicianAssignedUserId: true,
    },
  });

  const [events, diagnosisCount] = await Promise.all([
    db.billingEvent.findMany({
      where: { facilityId, encounterId },
      select: {
        reviewStatus: true,
        sourceModule: true,
        procedureCode: true,
        hcpcsCode: true,
        code: true,
        diagnosisCodes: true,
      },
    }),
    db.diagnosis.count({
      where: { facilityId, encounterId, status: "ACTIVE" },
    }),
  ]);

  return evaluateEncounterBillingReadinessFromData(enc, events, diagnosisCount);
}
