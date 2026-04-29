"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import {
  billingLedgerRowHasUsableCode,
  billingLedgerRowIsInformationalNonBillable,
  billingLedgerRowIsMedAdminDrugOnlyWithoutProcedureCpt,
  billingLedgerRowIsUnmapped,
  readBillingCaptureV1,
} from "@medora/shared";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type LedgerEventRow = {
  id: string;
  sourceModule: string;
  reviewStatus: string;
  codeType: string | null;
  code: string | null;
  procedureCode: string | null;
  hcpcsCode: string | null;
  diagnosisCodes: string | null;
  serviceDate: string | null;
  descriptionSnapshot: string | null;
  billingSide: string;
  revenueCode: string | null;
  modifier1: string | null;
  modifier2: string | null;
};

type BillingReadinessStatus = "official_validated" | "candidate_only" | "pending_license" | "missing";

const OFFICIAL_CLFS_BILLING_CODES = new Set([
  "80048",
  "80053",
  "80143",
  "80179",
  "80305",
  "81001",
  "81025",
  "82150",
  "82800",
  "82947",
  "83605",
  "83690",
  "83880",
  "84145",
  "84443",
  "84484",
  "85025",
  "85379",
  "85610",
  "85730",
  "86140",
  "86850",
  "86900",
  "87040",
  "87635",
  "87804",
  "87807",
  "87880",
]);

type ClaimPackageSummaryT = {
  totalLines: number;
  uncodedLines: number;
  linesNeedingReview: number;
  unknownSideLines: number;
  blockers: { code: string; detail?: string }[];
  warnings: { code: string; detail?: string }[];
  ready: boolean;
};

type ClaimPackagesPayload = {
  professional: ClaimPackageSummaryT;
  facility: ClaimPackageSummaryT;
  overall: {
    readyForProfessionalClaim: boolean;
    readyForFacilityClaim: boolean;
  };
};

type ReadinessPayload = {
  isReady: boolean;
  blockers: { code: string; detail?: string }[];
  warnings: { code: string; detail?: string }[];
  counts: {
    totalBillingEvents: number;
    uncodedLines: number;
    ledgerLinesNeedingReview: number;
    diagnosisCount: number;
  };
};

type ClaimAssemblyLineRow = {
  code: string;
  codeType: string;
  description: string;
  sourceModule: string;
  quantity: number;
  unitPrice?: number;
  companionCode?: string;
  companionCodeType?: string;
  /** professional | facility | both — both-package lines may be deduped in the facility table */
  originSide?: "professional" | "facility" | "both";
  mergedFromCount?: number;
};

type ClaimPackageAssembly = {
  lines: ClaimAssemblyLineRow[];
  totalLines: number;
  missingCodes: number;
  ready: boolean;
};

type ClaimValidationIssuePayload = {
  code: string;
  severity: "warning" | "blocker";
  meta?: {
    suppressedCount?: number;
  };
};

type ClaimPackageValidationPayload = {
  ready: boolean;
  blockers: ClaimValidationIssuePayload[];
  warnings: ClaimValidationIssuePayload[];
};

type ClaimEncounterValidationPayload = {
  meta?: {
    visibleEncounterEmCountProfessional: number;
    visibleEncounterEmCountFacility: number;
    diagnosisLinked: boolean;
    professionalLineCount: number;
    facilityLineCount: number;
  };
  summary: {
    ready: boolean;
    blockers: ClaimValidationIssuePayload[];
    warnings: ClaimValidationIssuePayload[];
  };
  professional: ClaimPackageValidationPayload;
  facility: ClaimPackageValidationPayload;
};

type ClaimAssemblyPayload = {
  professional: ClaimPackageAssembly;
  facility: ClaimPackageAssembly;
  summary: {
    totalLines: number;
    missingCodes: number;
    ready: boolean;
  };
  /** Present when API returns Phase 5.2 validation (always for current backend). */
  validation?: ClaimEncounterValidationPayload;
};

type ClaimExportHeaderPayload = {
  encounterId: string;
  patientId: string;
  facilityId: string;
  claimType: "PROFESSIONAL" | "FACILITY";
  ready: boolean;
  blockers: string[];
  warnings: string[];
  diagnosisCodes: string[];
  attendingProviderId?: string | null;
  renderingProviderId?: string | null;
  resolvedRenderingProviderUserId?: string | null;
  resolvedBillingProviderUserId?: string | null;
  serviceStartDate?: string | null;
  serviceEndDate?: string | null;
};

type ClaimExportPackagePayload = {
  header: ClaimExportHeaderPayload;
  lines: { lineNumber: number; code: string; codeType: string; quantity: number; sourceModule: string }[];
};

type EncounterClaimExportPayload = {
  professional: ClaimExportPackagePayload | null;
  facility: ClaimExportPackagePayload | null;
  summary: {
    readyForExport: boolean;
    blockers: string[];
    warnings: string[];
    contextWarnings?: string[];
    claimIdentityGaps?: string[];
    claimIdentityReady?: boolean;
    claimReady?: boolean;
    claimBlockers?: string[];
    claimWarnings?: string[];
    claimInfo?: string[];
    professionalClaimReady?: boolean;
    professionalClaimBlockers?: string[];
    professionalClaimWarnings?: string[];
    professionalClaimInfo?: string[];
    facilityClaimReady?: boolean;
    facilityClaimBlockers?: string[];
    facilityClaimWarnings?: string[];
    facilityClaimInfo?: string[];
    resolvedRenderingProviderUserId?: string | null;
    resolvedBillingProviderUserId?: string | null;
    facilityBillingRoleActive?: boolean;
    facilityBillingEntityResolved?: boolean;
    professionalBillingContextResolved?: boolean;
    institutionalBillingContextResolved?: boolean;
    roleResolutionWarnings?: string[];
  };
};

type X12TransactionPreviewPayload = {
  kind: string;
  segments: { tag: string; elements: string[] }[];
  text: string;
  warnings: string[];
  missingFields: string[];
};

type EncounterX12ExportPayload = {
  professional: X12TransactionPreviewPayload | null;
  facility: X12TransactionPreviewPayload | null;
  summary: {
    readyForGeneration: boolean;
    warnings: string[];
    missingFields: string[];
  };
};

type ClaimSubmissionListItemPayload = {
  id: string;
  facilityId: string;
  encounterId: string;
  claimType: string;
  status: string;
  batchId: string | null;
  transactionCtrl: string | null;
  externalReference?: string | null;
  warnings: string[];
  missingFields: string[];
  createdAt: string;
  updatedAt: string;
};

type ClaimSubmissionDetailPayload = ClaimSubmissionListItemPayload & {
  x12Text: string | null;
  exportJson: unknown;
  externalReference: string | null;
};

type SubmissionAttemptPayload = {
  id: string;
  transport: string;
  ok: boolean;
  status?: string;
  errorMessage: string | null;
  createdAt: string;
  failureCode?: string | null;
  retryEligible?: boolean;
  nextRetryAt?: string | null;
};

type SubmissionAckPayload = {
  id: string;
  kind: string;
  statusCode: string | null;
  message: string | null;
  warningCode?: string | null;
  ackSource?: string | null;
  receivedAt: string;
  createdAt?: string;
};

type SubmissionDebugAckPayload = {
  ackId: string;
  type: string;
  status: string | null;
  warningCode?: string | null;
  lifecycleReason?: string | null;
  ackSource?: string | null;
  receivedAt: string;
  rawSummary: string;
};

type SubmissionDebugPayload = {
  encounterId: string;
  submissions: {
    submissionId: string;
    /** Prisma `ClaimSubmissionKind` when provided by API (Phase 7.6). */
    claimType?: string;
    type: "837P" | "837I";
    status: string;
    createdAt: string;
    lastTransitionReason?: string | null;
    submissionGateScope?: string;
    submissionSideGateAllowed?: boolean;
    submissionSideGateReasonCode?: string;
    submissionSideGateBlockers?: string[];
    attempts: SubmissionAttemptPayload[];
    acknowledgments: SubmissionDebugAckPayload[];
  }[];
};

type ClearinghouseConfigStatusPayload = {
  mode: string;
  vendor: string;
  configured: boolean;
  sandbox: boolean;
  sendEnabled: boolean;
  integrationTier?: string;
  liveSendExplicitlyEnabled?: boolean;
  liveOutboundReady?: boolean;
  outboundLiveConfigComplete?: boolean;
  inboundAckPollEnabled?: boolean;
  inboundAckPathConfigured?: boolean;
  configWarningCodes?: string[];
  ackSftpIngestEnabled: boolean;
  ackWebhookIngestEnabled: boolean;
};

type ClearinghouseOpsStatusPayload = {
  clearinghouseMode: string;
  integrationTier?: string;
  liveSendExplicitlyEnabled?: boolean;
  liveOutboundReady?: boolean;
  outboundLiveConfigComplete?: boolean;
  inboundAckPollEnabled?: boolean;
  inboundAckPathConfigured?: boolean;
  clearinghouseConfigWarningCodes?: string[];
  outboundConfigured: boolean;
  inboundSftpEnabled: boolean;
  inboundWebhookEnabled: boolean;
  lastLiveOutboundAttemptAt?: string | null;
  lastLiveOutboundAttemptOk?: boolean | null;
  lastLiveOutboundTransport?: string | null;
  lastLiveOutboundError?: string | null;
  recentLiveTransportFailureCount?: number;
  lastSftpPollAt: string | null;
  lastSftpPollStatus: string | null;
  lastSftpPollDetail: string | null;
  retryEligibleSubmissionCount: number;
  retryDueSubmissionCount?: number;
  retryExhaustedCount?: number;
  recentRetryAttemptCount?: number;
  clearinghouseRetryWorkerEnabled?: boolean;
  lastRetryWorkerRunAt?: string | null;
  lastRetryWorkerStatus?: string | null;
  lastRetryWorkerDetail?: string | null;
  deadLetterAckCount: number;
  deadLetterReplayed24hCount?: number;
  recentTransportFailureCount: number;
  liveCircuitOpen?: boolean;
  liveCircuitOpenedAt?: string | null;
  liveCircuitReason?: string | null;
  liveCircuitOpenUntil?: string | null;
  recentDuplicateAckCount?: number;
  recentDuplicateSendBlockedCount?: number;
  recentRateLimitedSendCount?: number;
  recentThrottleSkips?: number;
  recentCircuitBlockedSendCount?: number;
  recentConcurrentLimitedSendCount?: number;
  recentDeadLetterReplays?: number;
  stabilizationProcessMetrics?: Record<string, number>;
  liveSendPacingConfig?: Record<string, unknown>;
  lastSftpAckPollTruncated?: boolean;
  lastSftpAckPollFilesSeen?: number | null;
  lastSftpAckPollFilesProcessed?: number | null;
  lastSftpAckPollMaxFilesPerCycle?: number | null;
  durableClearinghouseMetrics?: {
    sendAttemptSucceeded24h?: number;
    operationalEventsByType24h?: Record<string, number>;
    ackLatencySample7d?: { sampleCount?: number; avgAckLatencyMs?: number | null };
  };
};

type OperationalTimelineItemPayload = {
  at: string;
  source: string;
  kind: string;
  summary: string;
  detail: Record<string, unknown>;
};

type SummaryPayload = {
  encounter: {
    id: string;
    type: string;
    status?: string;
    dischargedAt: string | null;
    billingFinalizationStatus?: string;
    billingFinalizedAt?: string | null;
    billingReopenedAt?: string | null;
    patient: { firstName?: string; lastName?: string; mrn?: string | null };
  };
  readiness: ReadinessPayload;
  claimPackages: ClaimPackagesPayload;
  events: LedgerEventRow[];
  summary: {
    totalEvents: number;
    needsReview: number;
    missingCode: number;
  };
};

type LineDraft = {
  procedureCode: string;
  hcpcsCode: string;
  diagnosisCodes: string;
  descriptionSnapshot: string;
  billingSide: string;
  reviewStatus: string;
  revenueCode: string;
  modifier1: string;
  modifier2: string;
  serviceDateIso: string;
};

/** Align with API `claimLineMergeKey` for BOTH-package duplicate hiding (code + type + companion + module + origin). */
function claimAssemblyLineDedupeKey(row: ClaimAssemblyLineRow): string {
  return [row.code, row.codeType, row.companionCode ?? "", row.companionCodeType ?? "", row.sourceModule, row.originSide ?? ""].join("\0");
}

/** Facility table: hide rows that duplicate a `both`-routed line already shown under Professional (same line content). */
function facilityClaimLinesForDisplay(prof: ClaimAssemblyLineRow[], fac: ClaimAssemblyLineRow[]): ClaimAssemblyLineRow[] {
  const bothProfKeys = new Set(
    prof.filter((r) => r.originSide === "both").map((r) => claimAssemblyLineDedupeKey(r))
  );
  return fac.filter((row) => {
    if (row.originSide !== "both") return true;
    return !bothProfKeys.has(claimAssemblyLineDedupeKey(row));
  });
}

function billingPageKey(t: (k: string) => string, suffix: string): string {
  const k = `billingPage.${suffix}`;
  const v = t(k);
  return v === k ? suffix : v;
}

function billingReadinessStatusForLedgerRow(ev: LedgerEventRow): BillingReadinessStatus | null {
  if (billingLedgerRowIsInformationalNonBillable(ev)) return null;
  if (billingLedgerRowIsUnmapped(ev) || !billingLedgerRowHasUsableCode(ev)) return "missing";

  const sourceModule = ev.sourceModule;
  const primaryCode = ev.code?.trim() ?? "";
  const procedureCode = ev.procedureCode?.trim() ?? "";
  const hcpcsCode = ev.hcpcsCode?.trim() ?? "";

  if (sourceModule === "LAB_RESULT" && OFFICIAL_CLFS_BILLING_CODES.has(primaryCode)) {
    return "official_validated";
  }

  if (sourceModule === "ORDER_ITEM" && OFFICIAL_CLFS_BILLING_CODES.has(primaryCode)) {
    return "official_validated";
  }

  if (
    sourceModule === "IMAGING_RESULT" ||
    sourceModule === "PROCEDURE" ||
    sourceModule === "SUPPLY" ||
    sourceModule === "ENCOUNTER_EM"
  ) {
    return "pending_license";
  }

  if (
    sourceModule === "MEDICATION_DISPENSE" ||
    sourceModule === "MEDICATION_ADMINISTRATION" ||
    sourceModule === "MED_ADMIN" ||
    ev.codeType === "HCPCS" ||
    Boolean(hcpcsCode)
  ) {
    return "candidate_only";
  }

  if (procedureCode) return "pending_license";
  if (ev.codeType === "CPT" && OFFICIAL_CLFS_BILLING_CODES.has(primaryCode)) return "official_validated";
  if (ev.codeType === "CPT") return "pending_license";

  return "candidate_only";
}

function billingReadinessBadgeTone(status: BillingReadinessStatus): {
  background: string;
  color: string;
  border: string;
} {
  if (status === "official_validated") {
    return { background: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
  }
  if (status === "candidate_only") {
    return { background: "#fffbeb", color: "#92400e", border: "#fde68a" };
  }
  if (status === "pending_license") {
    return { background: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
  }
  return { background: "#fef2f2", color: "#b91c1c", border: "#fecaca" };
}

function BillingReadinessBadge({
  status,
  t,
}: {
  status: BillingReadinessStatus;
  t: (key: string) => string;
}) {
  const tone = billingReadinessBadgeTone(status);
  return (
    <span
      title={t(`billingPage.billingReadinessHelp_${status}`)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: tone.color,
        padding: "3px 8px",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {t(`billingPage.billingReadiness_${status}`)}
    </span>
  );
}

function billingUnmappedHintText(t: (k: string) => string, sourceModule: string): string {
  const k = `billingPage.billingUnmappedHint_${sourceModule}`;
  const v = t(k);
  return v === k ? t("billingPage.billingUnmappedHint_FALLBACK") : v;
}

function claimValidationLabel(t: (k: string) => string, code: string): string {
  const k = `billingPage.claimValidation_${code}`;
  const v = t(k);
  return v === k ? code : v;
}

/** Localized validation line; appends suppressed count when API sends meta (SUPPRESSED_LINES_PRESENT). */
function claimValidationIssueLine(t: (k: string) => string, iss: ClaimValidationIssuePayload): string {
  const base = claimValidationLabel(t, iss.code);
  const n = iss.meta?.suppressedCount;
  if (typeof n === "number" && n > 0 && iss.code === "SUPPRESSED_LINES_PRESENT") {
    return `${base} (${n})`;
  }
  return base;
}

function exportContextWarningLabel(t: (k: string) => string, code: string): string {
  const k = `billingPage.exportContextWarning_${code}`;
  const v = t(k);
  return v === k ? code : v;
}

/** Completeness engine codes → i18n; falls back to validation / X12 missing / export context. */
function completenessIssueLabel(t: (k: string) => string, code: string): string {
  const ck = `billingPage.completenessIssue_${code}`;
  const cv = t(ck);
  if (cv !== ck) return cv;
  const vk = `billingPage.claimValidation_${code}`;
  const vv = t(vk);
  if (vv !== vk) return vv;
  const xk = `billingPage.x12Missing_${code}`;
  const xv = t(xk);
  if (xv !== xk) return xv;
  const ek = `billingPage.exportContextWarning_${code}`;
  const ev = t(ek);
  if (ev !== ek) return ev;
  return code;
}

const COVERAGE_IDENTITY_CODES = new Set([
  "MISSING_PRIMARY_COVERAGE",
  "MULTIPLE_PRIMARY_COVERAGE",
  "MISSING_PAYER_SOURCE",
  "AMBIGUOUS_PAYER",
  "MISSING_PAYER_CONTEXT",
]);

const SUBSCRIBER_IDENTITY_CODES = new Set([
  "MISSING_SUBSCRIBER_RELATIONSHIP",
  "MISSING_SUBSCRIBER_NAME",
  "MISSING_SUBSCRIBER_DATA",
  "INCOMPLETE_SUBSCRIBER_DATA",
]);

const FACILITY_ENTITY_CODES = new Set(["MISSING_FACILITY_EXPORT_CONTEXT"]);

const PROVIDER_IDENTITY_CODES = new Set([
  "MISSING_PROVIDER_NPI",
  "MISSING_RENDERING_PROVIDER",
  "MISSING_BILLING_PROVIDER",
  "MISSING_RENDERING_PROVIDER_NPI",
  "MISSING_BILLING_PROVIDER_NPI",
]);

const ROLE_FALLBACK_WARNING_CODES = new Set([
  "RENDERING_PROVIDER_FALLBACK_TO_ATTENDING",
  "BILLING_PROVIDER_FALLBACK_TO_RENDERING",
]);

const IDENTITY_SECTION_CODES = new Set([
  ...COVERAGE_IDENTITY_CODES,
  ...SUBSCRIBER_IDENTITY_CODES,
  ...PROVIDER_IDENTITY_CODES,
  ...FACILITY_ENTITY_CODES,
]);

function pickCodes(codes: readonly string[] | undefined, set: ReadonlySet<string>): string[] {
  if (!codes?.length) return [];
  return codes.filter((code) => set.has(code));
}

/** Phase 7.5 — Gate aligned with the submission row’s claim type (837P vs 837I). */
function submissionSideReadinessBlocked(
  summary: EncounterClaimExportPayload["summary"] | undefined,
  claimType: string
): { blocked: boolean; blockers: string[] } {
  if (!summary) return { blocked: true, blockers: [] };
  const isProf = claimType === "PROFESSIONAL_837P" || claimType.includes("PROFESSIONAL");
  const isFac = claimType === "FACILITY_837I" || claimType.includes("FACILITY");
  if (isProf && typeof summary.professionalClaimReady === "boolean") {
    const blockers = summary.professionalClaimBlockers ?? [];
    return { blocked: !summary.professionalClaimReady || blockers.length > 0, blockers };
  }
  if (isFac && typeof summary.facilityClaimReady === "boolean") {
    const blockers = summary.facilityClaimBlockers ?? [];
    return { blocked: !summary.facilityClaimReady || blockers.length > 0, blockers };
  }
  const blockers = summary.claimBlockers ?? [];
  return { blocked: summary.claimReady === false || blockers.length > 0, blockers };
}

/** Localized X12 warning/missing machine id; reuses claim/export labels when codes match. */
function x12CodeLabel(t: (k: string) => string, prefix: "x12Warning" | "x12Missing", code: string): string {
  if (prefix === "x12Warning") {
    const x12k = `billingPage.x12Warning_${code}`;
    const x12v = t(x12k);
    if (x12v !== x12k) return x12v;
    const cv = t(`billingPage.claimValidation_${code}`);
    if (cv !== `billingPage.claimValidation_${code}`) return cv;
    const ev = t(`billingPage.exportContextWarning_${code}`);
    if (ev !== `billingPage.exportContextWarning_${code}`) return ev;
  } else {
    const mk = `billingPage.x12Missing_${code}`;
    const mv = t(mk);
    if (mv !== mk) return mv;
  }
  return code;
}

function submissionStatusLabel(t: (k: string) => string, status: string): string {
  const k = `billingPage.submissionStatus_${status}`;
  const v = t(k);
  return v === k ? status : v;
}

function submissionLifecycleReasonLabel(t: (k: string) => string, code: string | null | undefined): string | null {
  if (!code || code === "OK") return null;
  const k = `billingPage.submissionLifecycleReason_${code}`;
  const v = t(k);
  return v === k ? code : v;
}

function submissionFailureCodeLabel(t: (k: string) => string, code: string | null | undefined): string | null {
  if (!code) return null;
  const k = `billingPage.submissionFailureCode_${code}`;
  const v = t(k);
  return v === k ? code : v;
}

function clearinghouseModeLabel(t: (k: string) => string, mode: string): string {
  const k = `billingPage.clearinghouseMode_${mode}`;
  const v = t(k);
  return v === k ? mode : v;
}

function clearinghouseIntegrationTierLabel(t: (k: string) => string, tier: string | undefined): string {
  if (!tier) return "—";
  const k = `billingPage.integrationTier_${tier}`;
  const v = t(k);
  return v === k ? tier : v;
}

function clearinghouseVendorLabel(t: (k: string) => string, vendor: string): string {
  const k = `billingPage.clearinghouseVendor_${vendor}`;
  const v = t(k);
  return v === k ? vendor : v;
}

function ackSourceLabel(t: (k: string) => string, source: string | null | undefined): string {
  if (!source) return t("billingPage.ackSource_unknown");
  const k = `billingPage.ackSource_${source}`;
  const v = t(k);
  return v === k ? source : v;
}

function claimSubmissionKindLabel(t: (k: string) => string, claimType: string): string {
  const k = `billingPage.submissionKind_${claimType}`;
  const v = t(k);
  return v === k ? claimType : v;
}

function claimSubmissionIsProfessional837P(claimType: string): boolean {
  return claimType === "PROFESSIONAL_837P";
}

function sendSubmissionSideActionLabel(t: (k: string) => string, claimType: string): string {
  return claimSubmissionIsProfessional837P(claimType)
    ? t("billingPage.sendProfessionalClaim")
    : t("billingPage.sendFacilityClaim");
}

type SubmissionSendResponsePayload = {
  claimType?: string;
  sideSent?: boolean;
  sideSkipped?: boolean;
  ok?: boolean;
  skipped?: boolean;
  blockedByCompleteness?: boolean;
  circuitOpen?: boolean;
  rateLimited?: boolean;
  throttleDelayed?: boolean;
  duplicateBlocked?: boolean;
  concurrentLimited?: boolean;
  stabilizationReasonCode?: string | null;
};

/** Phase 8.1 — operator-facing reason when a send was skipped by stabilization (not completeness). */
function billingSendStabilizationMessage(t: (k: string) => string, res: SubmissionSendResponsePayload): string | null {
  if (res.circuitOpen) return t("billingPage.clearinghouseStab_circuitOpen");
  if (res.rateLimited) return t("billingPage.clearinghouseStab_rateLimited");
  if (res.throttleDelayed) return t("billingPage.clearinghouseStab_throttled");
  if (res.concurrentLimited) return t("billingPage.clearinghouseStab_concurrentLimited");
  if (res.duplicateBlocked) {
    const c = res.stabilizationReasonCode;
    if (c === "SEND_BLOCKED_IN_FLIGHT") return t("billingPage.clearinghouseStab_inFlightBlocked");
    if (c === "SEND_BLOCKED_ALREADY_SENT") return t("billingPage.clearinghouseStab_alreadySent");
    if (c === "SEND_BLOCKED_RECENT_SUCCESS") return t("billingPage.clearinghouseStab_recentSuccess");
    if (c === "DUPLICATE_SEND_BLOCKED") return t("billingPage.clearinghouseStab_duplicateLifecycle");
    return t("billingPage.clearinghouseStab_duplicateSendBlocked");
  }
  return null;
}

function timelineSourceLabel(t: (k: string) => string, source: string): string {
  const k = `billingPage.timelineSource_${source}`;
  const v = t(k);
  return v === k ? source : v;
}

function retrySubmissionSideActionLabel(t: (k: string) => string, claimType: string): string {
  return claimSubmissionIsProfessional837P(claimType)
    ? t("billingPage.professionalRetrySend")
    : t("billingPage.facilityRetrySend");
}

function submissionAckSideSectionLabel(t: (k: string) => string, claimType: string): string {
  return claimSubmissionIsProfessional837P(claimType)
    ? t("billingPage.professionalAcknowledgment")
    : t("billingPage.facilityAcknowledgment");
}

function submissionTimelineSideTitle(t: (k: string) => string, claimType: string): string {
  return claimSubmissionIsProfessional837P(claimType)
    ? t("billingPage.submissionTimelineProfessionalTitle")
    : t("billingPage.submissionTimelineFacilityTitle");
}

function readinessLineLabel(
  t: (k: string) => string,
  prefix: "readinessBlocker" | "readinessWarning" | "packageBlocker" | "packageWarning",
  code: string,
  detail?: string
): string {
  const k = `billingPage.${prefix}_${code}`;
  const v = t(k);
  const base = v === k ? code : v;
  return detail ? `${base} (${detail})` : base;
}

function toDraft(ev: LedgerEventRow): LineDraft {
  return {
    procedureCode: ev.procedureCode ?? "",
    hcpcsCode: ev.hcpcsCode ?? "",
    diagnosisCodes: ev.diagnosisCodes ?? "",
    descriptionSnapshot: ev.descriptionSnapshot ?? "",
    billingSide: ev.billingSide,
    reviewStatus: ev.reviewStatus,
    revenueCode: ev.revenueCode ?? "",
    modifier1: ev.modifier1 ?? "",
    modifier2: ev.modifier2 ?? "",
    serviceDateIso: ev.serviceDate ? new Date(ev.serviceDate).toISOString() : "",
  };
}

export default function BillingEncounterLedgerPage() {
  const params = useParams();
  const encounterId = params.encounterId as string;
  const { t, language } = useI18n();
  const { facilityId, ready, roles } = useFacilityAndRoles();
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LineDraft | null>(null);
  const [savingLineId, setSavingLineId] = useState<string | null>(null);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [advancedText, setAdvancedText] = useState("");
  const [advancedLoading, setAdvancedLoading] = useState(false);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedErr, setAdvancedErr] = useState<string | null>(null);
  const [claimAssembly, setClaimAssembly] = useState<ClaimAssemblyPayload | null>(null);
  const [claimExport, setClaimExport] = useState<EncounterClaimExportPayload | null>(null);
  const [showExportJson, setShowExportJson] = useState(false);
  const [claimX12, setClaimX12] = useState<EncounterX12ExportPayload | null>(null);
  const [showX12Text, setShowX12Text] = useState(false);
  const [claimSubmissions, setClaimSubmissions] = useState<ClaimSubmissionListItemPayload[]>([]);
  const [submissionListErr, setSubmissionListErr] = useState<string | null>(null);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [lastEnvelopePreview, setLastEnvelopePreview] = useState<{ batchId: string; text: string } | null>(null);
  const [showSubmissionInterchange, setShowSubmissionInterchange] = useState(false);
  const [expandedSubmissionDetail, setExpandedSubmissionDetail] = useState<ClaimSubmissionDetailPayload | null>(null);
  const [expandedSubmissionLoading, setExpandedSubmissionLoading] = useState<string | null>(null);
  const [submissionAttempts, setSubmissionAttempts] = useState<Record<string, SubmissionAttemptPayload[]>>({});
  const [submissionAcks, setSubmissionAcks] = useState<Record<string, SubmissionAckPayload[]>>({});
  const [submissionOperationalTimeline, setSubmissionOperationalTimeline] = useState<
    Record<string, OperationalTimelineItemPayload[]>
  >({});
  const [submissionDebug, setSubmissionDebug] = useState<SubmissionDebugPayload | null>(null);
  const [clearinghouseConfigStatus, setClearinghouseConfigStatus] = useState<ClearinghouseConfigStatusPayload | null>(null);
  const [clearinghouseOpsStatus, setClearinghouseOpsStatus] = useState<ClearinghouseOpsStatusPayload | null>(null);
  const [retrySendBusyId, setRetrySendBusyId] = useState<string | null>(null);

  const locale = encounterBcp47(language);
  const canEditLines = roles.includes("BILLING") || roles.includes("ADMIN");
  const canFinalizeBilling = roles.includes("BILLING") || roles.includes("ADMIN");
  const canViewExportJson = roles.includes("BILLING") || roles.includes("ADMIN");
  const submissionGateBlockers = claimExport?.summary.claimBlockers ?? [];
  const submissionGateReady = claimExport?.summary.claimReady ?? null;
  const submissionGateBlocked =
    submissionGateReady === false ||
    submissionGateBlockers.length > 0;
  const submissionReadinessMixed = Boolean(
    claimExport?.professional &&
      claimExport.facility &&
      typeof claimExport.summary.professionalClaimReady === "boolean" &&
      typeof claimExport.summary.facilityClaimReady === "boolean" &&
      claimExport.summary.professionalClaimReady !== claimExport.summary.facilityClaimReady
  );

  const load = useCallback(async () => {
    if (!ready || !facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryOutcome, claimsOutcome, exportOutcome, x12Outcome, submissionsOutcome, clearinghouseOutcome, clearinghouseOpsOutcome] =
        await Promise.allSettled([
          apiFetch(`/billing/encounters/${encounterId}/summary`, { facilityId }),
          apiFetch(`/billing/encounters/${encounterId}/claims`, { facilityId }),
          apiFetch(`/billing/encounters/${encounterId}/claim-export`, { facilityId }),
          apiFetch(`/billing/encounters/${encounterId}/x12-preview`, { facilityId }),
          apiFetch(`/billing/encounters/${encounterId}/submissions`, { facilityId }),
          apiFetch(`/billing/clearinghouse/config-status`, { facilityId }),
          apiFetch(`/billing/clearinghouse/ops-status`, { facilityId }),
        ]);
      if (summaryOutcome.status === "rejected") {
        setData(null);
        setClaimAssembly(null);
        setClaimExport(null);
        setClaimX12(null);
        setClaimSubmissions([]);
        setSubmissionListErr(null);
        setClearinghouseConfigStatus(null);
        setClearinghouseOpsStatus(null);
        setError(t("billingPage.billingSummaryLoadError"));
        return;
      }
      setData(summaryOutcome.value as SummaryPayload);
      if (clearinghouseOutcome.status === "fulfilled" && clearinghouseOutcome.value && typeof clearinghouseOutcome.value === "object") {
        setClearinghouseConfigStatus(clearinghouseOutcome.value as ClearinghouseConfigStatusPayload);
      } else {
        setClearinghouseConfigStatus(null);
      }
      if (clearinghouseOpsOutcome.status === "fulfilled" && clearinghouseOpsOutcome.value && typeof clearinghouseOpsOutcome.value === "object") {
        setClearinghouseOpsStatus(clearinghouseOpsOutcome.value as ClearinghouseOpsStatusPayload);
      } else {
        setClearinghouseOpsStatus(null);
      }
      if (claimsOutcome.status === "fulfilled" && claimsOutcome.value && typeof claimsOutcome.value === "object") {
        setClaimAssembly(claimsOutcome.value as ClaimAssemblyPayload);
      } else {
        setClaimAssembly(null);
      }
      if (exportOutcome.status === "fulfilled" && exportOutcome.value && typeof exportOutcome.value === "object") {
        setClaimExport(exportOutcome.value as EncounterClaimExportPayload);
      } else {
        setClaimExport(null);
      }
      if (x12Outcome.status === "fulfilled" && x12Outcome.value && typeof x12Outcome.value === "object") {
        setClaimX12(x12Outcome.value as EncounterX12ExportPayload);
      } else {
        setClaimX12(null);
      }
      if (submissionsOutcome.status === "fulfilled" && Array.isArray(submissionsOutcome.value)) {
        setClaimSubmissions(submissionsOutcome.value as ClaimSubmissionListItemPayload[]);
        setSubmissionListErr(null);
        const dbg = await apiFetch(`/billing/encounters/${encounterId}/submission-debug`, { facilityId });
        if (dbg && typeof dbg === "object") setSubmissionDebug(dbg as SubmissionDebugPayload);
      } else {
        setClaimSubmissions([]);
        setSubmissionListErr(t("billingPage.submissionListLoadErr"));
        setSubmissionDebug(null);
      }
    } catch {
      setData(null);
      setClaimAssembly(null);
      setClaimExport(null);
      setClaimX12(null);
      setClaimSubmissions([]);
      setSubmissionListErr(null);
      setSubmissionDebug(null);
      setClearinghouseConfigStatus(null);
      setClearinghouseOpsStatus(null);
      setError(t("billingPage.billingSummaryLoadError"));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, ready, t]);

  const generateSubmissionPreview = useCallback(async () => {
    if (!facilityId) return;
    setSubmissionBusy(true);
    setActionError(null);
    setToast(null);
    try {
      const res = (await apiFetch(`/billing/encounters/${encounterId}/submission-preview`, {
        facilityId,
        method: "POST",
      })) as { batch: { id: string; interchangeX12Text: string | null }; envelopeWarnings?: string[] };
      if (res.batch?.interchangeX12Text) {
        setLastEnvelopePreview({ batchId: res.batch.id, text: res.batch.interchangeX12Text });
      }
      setToast(t("billingPage.submissionGenerateOk"));
      const list = await apiFetch(`/billing/encounters/${encounterId}/submissions`, { facilityId });
      if (Array.isArray(list)) {
        setClaimSubmissions(list as ClaimSubmissionListItemPayload[]);
        setSubmissionListErr(null);
      }
    } catch (e: unknown) {
      setToast(null);
      const raw = e instanceof Error && e.message ? e.message : "";
      setActionError(normalizeUserFacingError(raw, language) || t("billingPage.submissionGenerateErr"));
    } finally {
      setSubmissionBusy(false);
    }
  }, [encounterId, facilityId, language, t]);

  const sendSubmissionBatch = useCallback(
    async (batchId: string) => {
      if (!facilityId) return;
      setSubmissionBusy(true);
      setActionError(null);
      setToast(null);
      try {
        const resp = (await apiFetch(`/billing/submission-batches/${batchId}/send`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transport: "MANUAL" }),
        })) as {
          results?: Array<{
            ok?: boolean;
            skipped?: boolean;
            sideSkipped?: boolean;
            blockedByCompleteness?: boolean;
            submissionGateReasonCode?: string | null;
            submissionGateBlockers?: string[];
            circuitOpen?: boolean;
            rateLimited?: boolean;
            throttleDelayed?: boolean;
            duplicateBlocked?: boolean;
            concurrentLimited?: boolean;
            stabilizationReasonCode?: string | null;
          }>;
        };
        const results = resp.results ?? [];
        const okCount = results.filter((r) => r.ok === true).length;
        const sideSkippedCount = results.filter((r) => r.sideSkipped === true).length;
        const transportFailed = results.filter((r) => r.ok === false && r.sideSkipped !== true).length;
        if (okCount > 0) {
          if (sideSkippedCount > 0) {
            setToast(
              t("billingPage.submissionSendBatchPartialOk")
                .replace("{sent}", String(okCount))
                .replace("{skipped}", String(sideSkippedCount))
            );
          } else {
            setToast(t("billingPage.submissionSendOk"));
          }
        } else if (results.length > 0 && sideSkippedCount === results.length) {
          const firstStab = results.find((r) => r.sideSkipped) ?? results[0];
          const stabMsg = firstStab ? billingSendStabilizationMessage(t, firstStab) : null;
          setActionError(stabMsg ?? t("billingPage.submissionSendAllSidesSkipped"));
        } else if (transportFailed > 0) {
          setActionError(t("billingPage.submissionSendTransportFailures"));
        } else {
          setActionError(t("billingPage.submissionBlockedByCompleteness"));
        }
        await load();
      } catch (e: unknown) {
        const raw = e instanceof Error && e.message ? e.message : "";
        setActionError(normalizeUserFacingError(raw, language) || t("billingPage.submissionSendErr"));
      } finally {
        setSubmissionBusy(false);
      }
    },
    [facilityId, language, load, t]
  );

  const sendSubmissionSingle = useCallback(
    async (submissionId: string, claimType: string) => {
      if (!facilityId) return;
      setSubmissionBusy(true);
      setActionError(null);
      setToast(null);
      try {
        const res = (await apiFetch(`/billing/submissions/${submissionId}/send`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transport: "MANUAL" }),
        })) as SubmissionSendResponsePayload;
        const ct = typeof res.claimType === "string" ? res.claimType : claimType;
        if (res.sideSent === true) {
          setToast(
            claimSubmissionIsProfessional837P(ct)
              ? t("billingPage.professionalClaimSent")
              : t("billingPage.facilityClaimSent")
          );
        } else if (res.sideSkipped === true) {
          const stab = billingSendStabilizationMessage(t, res);
          setActionError(
            stab ??
              (claimSubmissionIsProfessional837P(ct)
                ? t("billingPage.professionalSubmissionSkipped")
                : t("billingPage.facilitySubmissionSkipped"))
          );
        } else if (res.ok === false) {
          setActionError(t("billingPage.submissionSendTransportFailures"));
        } else {
          setToast(t("billingPage.submissionSendOk"));
        }
        await load();
      } catch (e: unknown) {
        const raw = e instanceof Error && e.message ? e.message : "";
        setActionError(normalizeUserFacingError(raw, language) || t("billingPage.submissionSendErr"));
      } finally {
        setSubmissionBusy(false);
      }
    },
    [facilityId, language, load, t]
  );

  const retrySubmissionSend = useCallback(
    async (submissionId: string) => {
      if (!facilityId) return;
      setRetrySendBusyId(submissionId);
      setActionError(null);
      setToast(null);
      try {
        const row = claimSubmissions.find((x) => x.id === submissionId);
        const claimType = row?.claimType ?? "PROFESSIONAL_837P";
        const res = (await apiFetch(`/billing/submissions/${submissionId}/retry-send`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transport: "MANUAL" }),
        })) as SubmissionSendResponsePayload & { skipped?: boolean; blockedByCompleteness?: boolean };
        const ct = typeof res.claimType === "string" ? res.claimType : claimType;
        if (res.skipped || res.blockedByCompleteness) {
          setActionError(
            claimSubmissionIsProfessional837P(ct)
              ? t("billingPage.professionalRetrySkippedClaimNotReady")
              : t("billingPage.facilityRetrySkippedClaimNotReady")
          );
        } else if (res.sideSent === true) {
          setToast(
            claimSubmissionIsProfessional837P(ct)
              ? t("billingPage.professionalRetrySendOk")
              : t("billingPage.facilityRetrySendOk")
          );
        } else if (res.sideSkipped === true) {
          const stab = billingSendStabilizationMessage(t, res);
          setActionError(
            stab ??
              (claimSubmissionIsProfessional837P(ct)
                ? t("billingPage.professionalSubmissionSkipped")
                : t("billingPage.facilitySubmissionSkipped"))
          );
        } else if (res.ok === false) {
          setActionError(t("billingPage.submissionSendTransportFailures"));
        } else {
          setToast(
            claimSubmissionIsProfessional837P(ct)
              ? t("billingPage.professionalRetrySendOk")
              : t("billingPage.facilityRetrySendOk")
          );
        }
        await load();
        const attempts = await apiFetch(`/billing/submissions/${submissionId}/attempts`, { facilityId });
        if (Array.isArray(attempts)) {
          setSubmissionAttempts((prev) => ({ ...prev, [submissionId]: attempts as SubmissionAttemptPayload[] }));
        }
      } catch (e: unknown) {
        const raw = e instanceof Error && e.message ? e.message : "";
        setActionError(normalizeUserFacingError(raw, language) || t("billingPage.submissionRetrySendErr"));
      } finally {
        setRetrySendBusyId(null);
      }
    },
    [claimSubmissions, facilityId, language, load, t]
  );

  const toggleSubmissionDetail = useCallback(
    async (submissionId: string) => {
      if (!facilityId) return;
      if (expandedSubmissionDetail?.id === submissionId) {
        setExpandedSubmissionDetail(null);
        return;
      }
      setExpandedSubmissionLoading(submissionId);
      setActionError(null);
      try {
        const res = (await apiFetch(`/billing/submissions/${submissionId}`, { facilityId })) as ClaimSubmissionDetailPayload;
        setExpandedSubmissionDetail(res);
        const [attempts, acks, timelinePayload] = await Promise.all([
          apiFetch(`/billing/submissions/${submissionId}/attempts`, { facilityId }),
          apiFetch(`/billing/submissions/${submissionId}/acknowledgments`, { facilityId }),
          apiFetch(`/billing/submissions/${submissionId}/timeline`, { facilityId }),
        ]);
        if (Array.isArray(attempts)) {
          setSubmissionAttempts((prev) => ({ ...prev, [submissionId]: attempts as SubmissionAttemptPayload[] }));
        }
        if (Array.isArray(acks)) {
          setSubmissionAcks((prev) => ({ ...prev, [submissionId]: acks as SubmissionAckPayload[] }));
        }
        if (
          timelinePayload &&
          typeof timelinePayload === "object" &&
          Array.isArray((timelinePayload as { timeline?: unknown }).timeline)
        ) {
          setSubmissionOperationalTimeline((prev) => ({
            ...prev,
            [submissionId]: (timelinePayload as { timeline: OperationalTimelineItemPayload[] }).timeline,
          }));
        }
      } catch (e: unknown) {
        const raw = e instanceof Error && e.message ? e.message : "";
        setActionError(normalizeUserFacingError(raw, language) || t("billingPage.submissionDetailLoadErr"));
        setExpandedSubmissionDetail(null);
      } finally {
        setExpandedSubmissionLoading(null);
      }
    },
    [facilityId, expandedSubmissionDetail?.id, language, t]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const markReviewed = async (billingEventId: string) => {
    if (!facilityId) return;
    setMarkingId(billingEventId);
    setToast(null);
    setActionError(null);
    try {
      await apiFetch(`/billing/events/${billingEventId}`, {
        facilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: "REVIEWED" }),
      });
      setToast(t("billingPage.billingSummaryReviewedOk"));
      await load();
    } catch (e: unknown) {
      setToast(null);
      const raw = e instanceof Error && e.message ? e.message : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.billingSummaryMarkReviewedError")
      );
    } finally {
      setMarkingId(null);
    }
  };

  const saveLine = async (eventId: string) => {
    if (!facilityId || !draft) return;
    setSavingLineId(eventId);
    setActionError(null);
    setToast(null);
    try {
      const body: Record<string, unknown> = {
        procedureCode: draft.procedureCode.trim() || null,
        hcpcsCode: draft.hcpcsCode.trim() || null,
        diagnosisCodes: draft.diagnosisCodes.trim() || null,
        descriptionSnapshot: draft.descriptionSnapshot.trim() || null,
        billingSide: draft.billingSide,
        reviewStatus: draft.reviewStatus,
        revenueCode: draft.revenueCode.trim() || null,
        modifier1: draft.modifier1.trim() || null,
        modifier2: draft.modifier2.trim() || null,
      };
      if (draft.serviceDateIso.trim()) {
        body.serviceDate = draft.serviceDateIso.trim();
      } else {
        body.serviceDate = null;
      }
      await apiFetch(`/billing/events/${eventId}`, {
        facilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setToast(t("billingPage.billingSaveLineOk"));
      setEditingId(null);
      setDraft(null);
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error && e.message ? e.message : "";
      setActionError(normalizeUserFacingError(raw, language) || t("billingPage.billingSaveLineErr"));
    } finally {
      setSavingLineId(null);
    }
  };

  const loadAdvancedJson = async () => {
    if (!facilityId) return;
    setAdvancedLoading(true);
    setAdvancedErr(null);
    try {
      const enc = await apiFetch(`/encounters/${encounterId}`, { facilityId });
      const raw =
        enc && typeof enc === "object" && !Array.isArray(enc) ? (enc as { billingCaptureJson?: unknown }).billingCaptureJson : null;
      const normalized = readBillingCaptureV1(raw);
      setAdvancedText(JSON.stringify(normalized, null, 2));
    } catch {
      setAdvancedErr(t("billingPage.billingCaptureLoadErr"));
    } finally {
      setAdvancedLoading(false);
    }
  };

  const saveAdvancedJson = async () => {
    if (!facilityId) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(advancedText);
    } catch {
      setAdvancedErr(t("billingPage.billingCaptureInvalidJson"));
      return;
    }
    setAdvancedSaving(true);
    setAdvancedErr(null);
    try {
      await apiFetch(`/encounters/${encounterId}`, {
        facilityId,
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingCaptureJson: parsed }),
      });
      setToast(t("billingPage.billingCaptureSaved"));
      await load();
    } catch (e: unknown) {
      const raw = e instanceof Error && e.message ? e.message : "";
      setAdvancedErr(normalizeUserFacingError(raw, language) || t("billingPage.billingCaptureSaveErr"));
    } finally {
      setAdvancedSaving(false);
    }
  };

  const finalizeEncounter = async () => {
    if (!facilityId) return;
    setActionBusy(true);
    setActionError(null);
    setToast(null);
    try {
      await apiFetch(`/billing/encounters/${encounterId}/finalize`, {
        facilityId,
        method: "POST",
      });
      setToast(t("billingPage.readinessFinalizedOk"));
      await load();
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.readinessActionError")
      );
    } finally {
      setActionBusy(false);
    }
  };

  const reopenEncounter = async () => {
    if (!facilityId) return;
    setActionBusy(true);
    setActionError(null);
    setToast(null);
    try {
      await apiFetch(`/billing/encounters/${encounterId}/reopen`, {
        facilityId,
        method: "POST",
      });
      setToast(t("billingPage.readinessReopenedOk"));
      await load();
    } catch (e: unknown) {
      const raw =
        e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "";
      setActionError(
        normalizeUserFacingError(raw, language) || t("billingPage.readinessActionError")
      );
    } finally {
      setActionBusy(false);
    }
  };

  const wf = data?.encounter?.billingFinalizationStatus ?? "NOT_READY";
  const readiness = data?.readiness;
  const claimPackages = data?.claimPackages;
  const showFinalize =
    canFinalizeBilling &&
    wf !== "FINALIZED" &&
    readiness?.isReady === true &&
    (wf === "NOT_READY" || wf === "READY_FOR_REVIEW" || wf === "REOPENED");
  const showReopen = canFinalizeBilling && wf === "FINALIZED";

  const facilityClaimPreviewLines = useMemo(
    () =>
      claimAssembly
        ? facilityClaimLinesForDisplay(claimAssembly.professional.lines, claimAssembly.facility.lines)
        : [],
    [claimAssembly]
  );
  const omittedBothFacilityLineCount =
    claimAssembly && claimAssembly.facility.lines.length > 0
      ? claimAssembly.facility.lines.length - facilityClaimPreviewLines.length
      : 0;

  const claimPreviewOriginLabel = useCallback((originSide: ClaimAssemblyLineRow["originSide"]) => {
    if (originSide === "both") return t("billingPage.claimPreviewOriginBoth");
    if (originSide === "professional") return t("billingPage.claimPreviewOriginProfessional");
    if (originSide === "facility") return t("billingPage.claimPreviewOriginFacility");
    return "—";
  }, [t]);

  const billingSides = ["UNKNOWN", "PROFESSIONAL", "FACILITY", "BOTH"] as const;
  const reviewStatuses = ["CAPTURED", "REVIEWED", "VOIDED", "SKIPPED"] as const;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 12px 40px" }}>
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Link href="/app/billing" style={{ color: "#0f172a", fontWeight: 600 }}>
          ← {t("billingPage.billingSummaryBack")}
        </Link>
        <span style={{ color: "#cbd5e1" }} aria-hidden>
          |
        </span>
        <Link href={`/app/encounters/${encounterId}`} style={{ color: "#475569", fontSize: 14 }}>
          {t("billingPage.billingSummaryOpenClinicalEncounter")}
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22 }}>{t("billingPage.billingSummaryTitle")}</h1>
      {data?.encounter?.patient ? (
        <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14 }}>
          {data.encounter.patient.firstName} {data.encounter.patient.lastName} · {data.encounter.patient.mrn ?? "—"}
        </p>
      ) : null}

      {loading && <p>{t("common.loading")}</p>}
      {error && (
        <div style={{ padding: 12, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>{error}</div>
      )}
      {toast && (
        <div style={{ marginBottom: 12, padding: 10, background: "#ecfdf5", color: "#047857", borderRadius: 8 }}>
          {toast}
        </div>
      )}
      {actionError && (
        <div style={{ marginBottom: 12, padding: 10, background: "#fef2f2", color: "#b91c1c", borderRadius: 8 }}>
          {actionError}
        </div>
      )}

      {!loading && !error && data && readiness && claimPackages && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                flex: "1 1 240px",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: claimPackages.professional.ready ? "#f0fdf4" : "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t("billingPage.billingPackageProfessionalTitle")}</div>
              <div style={{ fontSize: 13, marginTop: 6, color: "#334155" }}>
                {claimPackages.professional.ready ? t("billingPage.billingPackageReadyLabel") : t("billingPage.billingPackageNotReadyLabel")}
              </div>
              <div style={{ fontSize: 12, marginTop: 8, color: "#64748b" }}>
                {t("billingPage.billingPackageLines")}: {claimPackages.professional.totalLines} · {t("billingPage.billingPackageUncoded")}:{" "}
                {claimPackages.professional.uncodedLines} · {t("billingPage.billingPackagePendingReview")}:{" "}
                {claimPackages.professional.linesNeedingReview}
              </div>
              {claimPackages.professional.blockers.length > 0 ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
                  {claimPackages.professional.blockers.map((b) => (
                    <li key={b.code}>{readinessLineLabel(t, "packageBlocker", b.code, b.detail)}</li>
                  ))}
                </ul>
              ) : null}
              {claimPackages.professional.warnings.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569" }}>
                  {claimPackages.professional.warnings.map((w) => (
                    <li key={w.code}>{readinessLineLabel(t, "packageWarning", w.code, w.detail)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div
              style={{
                flex: "1 1 240px",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: claimPackages.facility.ready ? "#f0fdf4" : "#fffbeb",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t("billingPage.billingPackageFacilityTitle")}</div>
              <div style={{ fontSize: 13, marginTop: 6, color: "#334155" }}>
                {claimPackages.facility.ready ? t("billingPage.billingPackageReadyLabel") : t("billingPage.billingPackageNotReadyLabel")}
              </div>
              <div style={{ fontSize: 12, marginTop: 8, color: "#64748b" }}>
                {t("billingPage.billingPackageLines")}: {claimPackages.facility.totalLines} · {t("billingPage.billingPackageUncoded")}:{" "}
                {claimPackages.facility.uncodedLines} · {t("billingPage.billingPackagePendingReview")}:{" "}
                {claimPackages.facility.linesNeedingReview}
              </div>
              {claimPackages.facility.blockers.length > 0 ? (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#92400e" }}>
                  {claimPackages.facility.blockers.map((b) => (
                    <li key={b.code}>{readinessLineLabel(t, "packageBlocker", b.code, b.detail)}</li>
                  ))}
                </ul>
              ) : null}
              {claimPackages.facility.warnings.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "#475569" }}>
                  {claimPackages.facility.warnings.map((w) => (
                    <li key={w.code}>{readinessLineLabel(t, "packageWarning", w.code, w.detail)}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div
              style={{
                flex: "1 1 200px",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t("billingPage.billingPackageOverall")}</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                {t("billingPage.billingPackageProfReady")}:{" "}
                {claimPackages.overall.readyForProfessionalClaim ? t("billingPage.billingPackageReadyLabel") : t("billingPage.billingPackageNotReadyLabel")}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {t("billingPage.billingPackageFacReady")}:{" "}
                {claimPackages.overall.readyForFacilityClaim ? t("billingPage.billingPackageReadyLabel") : t("billingPage.billingPackageNotReadyLabel")}
              </div>
            </div>
          </div>

          {claimAssembly ? (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingPage.claimReviewSectionTitle")}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{t("billingPage.claimReviewSectionSubtitle")}</p>
              {claimAssembly.validation ? (
                <div
                  style={{
                    marginBottom: 14,
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    {t("billingPage.claimPreviewEncounterValidationTitle")}
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>{t("billingPage.claimPreviewValidationStatus")}:</strong>{" "}
                    {claimAssembly.validation.summary.ready
                      ? t("billingPage.billingPackageReadyLabel")
                      : t("billingPage.billingPackageNotReadyLabel")}
                  </div>
                  {(claimAssembly.validation.summary.blockers?.length ?? 0) > 0 ? (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, color: "#9a3412" }}>{t("billingPage.claimPreviewValidationBlockers")}</div>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {claimAssembly.validation.summary.blockers.map((iss, i) => (
                          <li key={`sb-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {(claimAssembly.validation.summary.warnings?.length ?? 0) > 0 ? (
                    <div>
                      <div style={{ fontWeight: 600, color: "#1d4ed8" }}>{t("billingPage.claimPreviewValidationWarnings")}</div>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {claimAssembly.validation.summary.warnings.map((iss, i) => (
                          <li key={`sw-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: "1px solid #e8ecf0",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#475569" }}>
                  {t("billingPage.claimPreviewAssembledLinesTitle")}
                </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                <span>
                  <strong>{t("billingPage.claimPreviewSummaryTotalLines")}:</strong> {claimAssembly.summary.totalLines}
                </span>
                <span aria-hidden style={{ color: "#cbd5e1" }}>
                  ·
                </span>
                <span>
                  <strong>{t("billingPage.claimPreviewSummaryMissing")}:</strong> {claimAssembly.summary.missingCodes}
                </span>
                <span aria-hidden style={{ color: "#cbd5e1" }}>
                  ·
                </span>
                <span>
                  <strong>{t("billingPage.claimPreviewAssemblyLabel")}:</strong>{" "}
                  {claimAssembly.summary.ready ? t("billingPage.billingPackageReadyLabel") : t("billingPage.billingPackageNotReadyLabel")}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    {t("billingPage.claimPreviewProfessionalLines")}{" "}
                    <span style={{ fontWeight: 400, color: "#64748b" }}>
                      ({claimAssembly.professional.totalLines} ·{" "}
                      {claimAssembly.validation?.professional.ready
                        ? t("billingPage.billingPackageReadyLabel")
                        : t("billingPage.billingPackageNotReadyLabel")}
                      )
                    </span>
                  </div>
                  {claimAssembly.validation ? (
                    <>
                      {(claimAssembly.validation.professional.blockers?.length ?? 0) > 0 ? (
                        <div style={{ marginBottom: 6, fontSize: 11, color: "#9a3412" }}>
                          <div style={{ fontWeight: 600 }}>{t("billingPage.claimPreviewValidationBlockers")}</div>
                          {claimAssembly.validation.professional.blockers.map((iss, i) => (
                            <div key={`pb-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</div>
                          ))}
                        </div>
                      ) : null}
                      {(claimAssembly.validation.professional.warnings?.length ?? 0) > 0 ? (
                        <div style={{ marginBottom: 8, fontSize: 11, color: "#1e40af" }}>
                          <div style={{ fontWeight: 600 }}>{t("billingPage.claimPreviewValidationWarnings")}</div>
                          {claimAssembly.validation.professional.warnings.map((iss, i) => (
                            <div key={`pw-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {claimAssembly.professional.lines.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("billingPage.claimPreviewEmpty")}</p>
                  ) : (
                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableCode")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableType")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTablePackage")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableModule")}</th>
                            <th style={{ padding: 8, textAlign: "right" }}>{t("billingPage.claimPreviewTableQty")}</th>
                            <th style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
                              {t("billingPage.claimPreviewTableMerged")}
                            </th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableDescription")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claimAssembly.professional.lines.map((row, i) => (
                            <tr key={`p-${row.code}-${row.sourceModule}-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: 8, fontFamily: "monospace" }}>
                                {row.code}
                                {row.companionCode ? (
                                  <span style={{ color: "#64748b" }}>
                                    {" "}
                                    + {row.companionCode} ({row.companionCodeType ?? "?"})
                                  </span>
                                ) : null}
                              </td>
                              <td style={{ padding: 8 }}>{row.codeType}</td>
                              <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>{claimPreviewOriginLabel(row.originSide)}</td>
                              <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>{row.sourceModule}</td>
                              <td style={{ padding: 8, textAlign: "right" }}>{row.quantity}</td>
                              <td style={{ padding: 8, textAlign: "right", fontSize: 12, color: "#64748b" }}>
                                {row.mergedFromCount != null && row.mergedFromCount > 1
                                  ? t("billingPage.claimPreviewMergedCount").replace("{count}", String(row.mergedFromCount))
                                  : "—"}
                              </td>
                              <td style={{ padding: 8, color: "#334155" }}>{row.description || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                    {t("billingPage.claimPreviewFacilityLines")}{" "}
                    <span style={{ fontWeight: 400, color: "#64748b" }}>
                      ({claimAssembly.facility.totalLines} ·{" "}
                      {claimAssembly.validation?.facility.ready
                        ? t("billingPage.billingPackageReadyLabel")
                        : t("billingPage.billingPackageNotReadyLabel")}
                      )
                    </span>
                  </div>
                  {claimAssembly.validation ? (
                    <>
                      {(claimAssembly.validation.facility.blockers?.length ?? 0) > 0 ? (
                        <div style={{ marginBottom: 6, fontSize: 11, color: "#9a3412" }}>
                          <div style={{ fontWeight: 600 }}>{t("billingPage.claimPreviewValidationBlockers")}</div>
                          {claimAssembly.validation.facility.blockers.map((iss, i) => (
                            <div key={`fb-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</div>
                          ))}
                        </div>
                      ) : null}
                      {(claimAssembly.validation.facility.warnings?.length ?? 0) > 0 ? (
                        <div style={{ marginBottom: 8, fontSize: 11, color: "#1e40af" }}>
                          <div style={{ fontWeight: 600 }}>{t("billingPage.claimPreviewValidationWarnings")}</div>
                          {claimAssembly.validation.facility.warnings.map((iss, i) => (
                            <div key={`fw-${iss.code}-${i}`}>{claimValidationIssueLine(t, iss)}</div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                  {claimAssembly.facility.lines.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("billingPage.claimPreviewEmpty")}</p>
                  ) : facilityClaimPreviewLines.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("billingPage.claimPreviewAllFacilityDupesUnderProfessional")}</p>
                  ) : (
                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                      {omittedBothFacilityLineCount > 0 ? (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                          {t("billingPage.claimPreviewOmittedBothDuplicates").replace(
                            "{count}",
                            String(omittedBothFacilityLineCount)
                          )}
                        </p>
                      ) : null}
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableCode")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableType")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTablePackage")}</th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableModule")}</th>
                            <th style={{ padding: 8, textAlign: "right" }}>{t("billingPage.claimPreviewTableQty")}</th>
                            <th style={{ padding: 8, textAlign: "right", whiteSpace: "nowrap" }}>
                              {t("billingPage.claimPreviewTableMerged")}
                            </th>
                            <th style={{ padding: 8, textAlign: "left" }}>{t("billingPage.claimPreviewTableDescription")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {facilityClaimPreviewLines.map((row, i) => (
                            <tr key={`f-${row.code}-${row.sourceModule}-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: 8, fontFamily: "monospace" }}>
                                {row.code}
                                {row.companionCode ? (
                                  <span style={{ color: "#64748b" }}>
                                    {" "}
                                    + {row.companionCode} ({row.companionCodeType ?? "?"})
                                  </span>
                                ) : null}
                              </td>
                              <td style={{ padding: 8 }}>{row.codeType}</td>
                              <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>{claimPreviewOriginLabel(row.originSide)}</td>
                              <td style={{ padding: 8, fontSize: 12, color: "#475569" }}>{row.sourceModule}</td>
                              <td style={{ padding: 8, textAlign: "right" }}>{row.quantity}</td>
                              <td style={{ padding: 8, textAlign: "right", fontSize: 12, color: "#64748b" }}>
                                {row.mergedFromCount != null && row.mergedFromCount > 1
                                  ? t("billingPage.claimPreviewMergedCount").replace("{count}", String(row.mergedFromCount))
                                  : "—"}
                              </td>
                              <td style={{ padding: 8, color: "#334155" }}>{row.description || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          ) : null}

          {claimExport ? (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingPage.claimExportSectionTitle")}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{t("billingPage.claimExportSectionSubtitle")}</p>
              {claimExport.summary.claimBlockers !== undefined &&
              claimExport.summary.claimWarnings !== undefined &&
              claimExport.summary.claimInfo !== undefined &&
              claimExport.summary.claimReady !== undefined ? (
                <>
                  <div
                    style={{
                      marginBottom: 12,
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: !claimExport.summary.claimReady
                        ? "#fef2f2"
                        : (claimExport.summary.claimWarnings?.length ?? 0) > 0
                          ? "#fffbeb"
                          : "#f0fdf4",
                      fontSize: 13,
                      color: "#334155",
                      fontWeight: 600,
                    }}
                  >
                    {!claimExport.summary.claimReady
                      ? t("billingPage.claimCompletenessNotReady")
                      : (claimExport.summary.claimWarnings?.length ?? 0) > 0
                        ? t("billingPage.claimCompletenessReadyWithWarnings")
                        : t("billingPage.claimCompletenessReadySubmit")}
                  </div>
                  {typeof claimExport.summary.professionalClaimReady === "boolean" ||
                  typeof claimExport.summary.facilityClaimReady === "boolean" ? (
                    <div
                      style={{
                        marginBottom: 12,
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      }}
                    >
                      {typeof claimExport.summary.professionalClaimReady === "boolean" ? (
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            background: claimExport.summary.professionalClaimReady ? "#f0fdf4" : "#fef2f2",
                            fontSize: 12,
                            color: "#334155",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            {claimExport.professional
                              ? t("billingPage.professionalReadinessTitle")
                              : t("billingPage.professionalReadinessNoPackage")}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>
                              {claimExport.summary.professionalClaimReady
                                ? t("billingPage.sideReadinessReady")
                                : t("billingPage.sideReadinessBlocked")}
                            </strong>
                          </div>
                          {(claimExport.summary.professionalClaimBlockers?.length ?? 0) > 0 ? (
                            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                              {(claimExport.summary.professionalClaimBlockers ?? []).map((code) => (
                                <li key={`prof-bl-${code}`}>{completenessIssueLabel(t, code)}</li>
                              ))}
                            </ul>
                          ) : null}
                          {(claimExport.summary.professionalClaimWarnings?.length ?? 0) > 0 ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#a16207" }}>
                              {(claimExport.summary.professionalClaimWarnings ?? []).map((code) => (
                                <li key={`prof-w-${code}`}>{completenessIssueLabel(t, code)}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      {typeof claimExport.summary.facilityClaimReady === "boolean" ? (
                        <div
                          style={{
                            padding: "10px 12px",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            background: claimExport.summary.facilityClaimReady ? "#f0fdf4" : "#fef2f2",
                            fontSize: 12,
                            color: "#334155",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>
                            {claimExport.facility
                              ? t("billingPage.facilityReadinessTitle")
                              : t("billingPage.facilityReadinessNoPackage")}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong>
                              {claimExport.summary.facilityClaimReady
                                ? t("billingPage.sideReadinessReady")
                                : t("billingPage.sideReadinessBlocked")}
                            </strong>
                          </div>
                          {(claimExport.summary.facilityClaimBlockers?.length ?? 0) > 0 ? (
                            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                              {(claimExport.summary.facilityClaimBlockers ?? []).map((code) => (
                                <li key={`fac-bl-${code}`}>{completenessIssueLabel(t, code)}</li>
                              ))}
                            </ul>
                          ) : null}
                          {(claimExport.summary.facilityClaimWarnings?.length ?? 0) > 0 ? (
                            <ul style={{ margin: "6px 0 0", paddingLeft: 18, color: "#a16207" }}>
                              {(claimExport.summary.facilityClaimWarnings ?? []).map((code) => (
                                <li key={`fac-w-${code}`}>{completenessIssueLabel(t, code)}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {!claimExport.summary.claimReady &&
                  claimExport.summary.professionalClaimReady === true &&
                  claimExport.summary.facilityClaimReady === true ? (
                    <div style={{ marginBottom: 12, fontSize: 12, color: "#64748b" }}>
                      {t("billingPage.sideReadinessOverallBlockedNote")}
                    </div>
                  ) : null}
                  {claimExport.summary.resolvedRenderingProviderUserId !== undefined ? (
                    <div
                      style={{
                        marginBottom: 12,
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          fontSize: 12,
                          color: "#334155",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.providerRoleReadinessTitle")}</div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{t("billingPage.resolvedRenderingProviderLabel")}:</strong>{" "}
                          {claimExport.summary.resolvedRenderingProviderUserId ?? t("billingPage.claimExportFieldEmpty")}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{t("billingPage.resolvedBillingProviderLabel")}:</strong>{" "}
                          {claimExport.summary.resolvedBillingProviderUserId ?? t("billingPage.claimExportFieldEmpty")}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{t("billingPage.professionalBillingContextLabel")}:</strong>{" "}
                          {claimExport.summary.professionalBillingContextResolved
                            ? t("common.yes")
                            : t("common.no")}
                        </div>
                        {(claimExport.summary.roleResolutionWarnings?.length ?? 0) > 0 ? (
                          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                            {(claimExport.summary.roleResolutionWarnings ?? []).map((code) => (
                              <li key={code}>{completenessIssueLabel(t, code)}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 6,
                          border: "1px solid #e2e8f0",
                          background: "#f8fafc",
                          fontSize: 12,
                          color: "#334155",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.facilityBillingEntityReadinessTitle")}</div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>{t("billingPage.facilityBillingRoleActiveLabel")}:</strong>{" "}
                          {claimExport.summary.facilityBillingRoleActive ? t("common.yes") : t("common.no")}
                        </div>
                        <div>
                          <strong>{t("billingPage.facilityBillingEntityResolvedLabel")}:</strong>{" "}
                          {claimExport.summary.facilityBillingEntityResolved ? t("common.yes") : t("common.no")}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {(claimExport.summary.claimBlockers?.length ?? 0) > 0 ? (
                    <div style={{ marginBottom: 12, fontSize: 12, color: "#9a3412" }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimCompletenessBlockersTitle")}</div>
                      {(() => {
                        const blockerCodes = claimExport.summary.claimBlockers ?? [];
                        const coverageCodes = pickCodes(blockerCodes, COVERAGE_IDENTITY_CODES);
                        const subscriberCodes = pickCodes(blockerCodes, SUBSCRIBER_IDENTITY_CODES);
                        const providerCodes = pickCodes(blockerCodes, PROVIDER_IDENTITY_CODES);
                        const facilityCodes = pickCodes(blockerCodes, FACILITY_ENTITY_CODES);
                        if (
                          !coverageCodes.length &&
                          !subscriberCodes.length &&
                          !providerCodes.length &&
                          !facilityCodes.length
                        )
                          return null;
                        return (
                          <div style={{ marginBottom: 8, display: "grid", gap: 6 }}>
                            {coverageCodes.length > 0 ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{t("billingPage.claimIdentityCoverageSectionTitle")}</div>
                                <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                                  {coverageCodes.map((code) => (
                                    <li key={`coverage-${code}`}>{completenessIssueLabel(t, code)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {subscriberCodes.length > 0 ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{t("billingPage.claimIdentitySubscriberSectionTitle")}</div>
                                <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                                  {subscriberCodes.map((code) => (
                                    <li key={`subscriber-${code}`}>{completenessIssueLabel(t, code)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {providerCodes.length > 0 ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{t("billingPage.claimIdentityProviderSectionTitle")}</div>
                                <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                                  {providerCodes.map((code) => (
                                    <li key={`provider-${code}`}>{completenessIssueLabel(t, code)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                            {facilityCodes.length > 0 ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{t("billingPage.claimIdentityFacilitySectionTitle")}</div>
                                <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                                  {facilityCodes.map((code) => (
                                    <li key={`facility-${code}`}>{completenessIssueLabel(t, code)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(claimExport.summary.claimBlockers ?? [])
                          .filter((code) => !IDENTITY_SECTION_CODES.has(code))
                          .map((code) => (
                          <li key={code}>{completenessIssueLabel(t, code)}</li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                  {(() => {
                    const allWarnings = claimExport.summary.claimWarnings ?? [];
                    const generalWarnings = allWarnings.filter((code) => !ROLE_FALLBACK_WARNING_CODES.has(code));
                    return generalWarnings.length > 0 ? (
                    <div style={{ marginBottom: 12, fontSize: 12, color: "#a16207" }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimCompletenessWarningsTitle")}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {generalWarnings.map((code) => (
                          <li key={code}>{completenessIssueLabel(t, code)}</li>
                        ))}
                      </ul>
                    </div>
                    ) : null;
                  })()}
                  {(claimExport.summary.claimInfo?.length ?? 0) > 0 ? (
                    <div style={{ marginBottom: 12, fontSize: 12, color: "#64748b" }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimCompletenessInfoTitle")}</div>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {(claimExport.summary.claimInfo ?? []).map((code) => (
                          <li key={code}>{completenessIssueLabel(t, code)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, marginBottom: 10, color: "#334155" }}>
                    <strong>{t("billingPage.claimExportReadyLabel")}:</strong>{" "}
                    {claimExport.summary.readyForExport ? t("billingPage.claimExportReadyYes") : t("billingPage.claimExportReadyNo")}
                  </div>
                  {(claimExport.summary.blockers?.length ?? 0) > 0 ? (
                    <div style={{ fontSize: 12, marginBottom: 8, color: "#9a3412" }}>
                      <strong>{t("billingPage.claimExportSummaryValidationBlockers")}:</strong>{" "}
                      {claimExport.summary.blockers.join(", ")}
                    </div>
                  ) : null}
                  {(claimExport.summary.warnings?.length ?? 0) > 0 ? (
                    <div style={{ fontSize: 12, marginBottom: 8, color: "#1d4ed8" }}>
                      <strong>{t("billingPage.claimExportSummaryValidationWarnings")}:</strong>{" "}
                      {claimExport.summary.warnings.join(", ")}
                    </div>
                  ) : null}
                  {(claimExport.summary.contextWarnings?.length ?? 0) > 0 ? (
                    <div style={{ fontSize: 12, marginBottom: 12, color: "#64748b" }}>
                      {(claimExport.summary.contextWarnings ?? []).map((cw) => (
                        <div key={cw}>{exportContextWarningLabel(t, cw)}</div>
                      ))}
                    </div>
                  ) : null}
                  {claimExport.summary.claimIdentityGaps !== undefined ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "10px 12px",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: claimExport.summary.claimIdentityReady ? "#f0fdf4" : "#fffbeb",
                        fontSize: 12,
                        color: "#334155",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimIdentityReadinessTitle")}</div>
                      <div style={{ marginBottom: 6 }}>
                        <strong>{t("billingPage.claimIdentityReadyLabel")}:</strong>{" "}
                        {claimExport.summary.claimIdentityReady ? t("common.yes") : t("common.no")}
                      </div>
                      {(claimExport.summary.claimIdentityGaps?.length ?? 0) > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {(claimExport.summary.claimIdentityGaps ?? []).map((code) => (
                            <li key={code}>{x12CodeLabel(t, "x12Missing", code)}</li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: "#15803d" }}>{t("billingPage.claimIdentityChecklistComplete")}</div>
                      )}
                    </div>
                  ) : null}
                </>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, marginBottom: canViewExportJson ? 10 : 0 }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimExportProfessionalPackage")}</div>
                  {claimExport.professional ? (
                    <>
                      <div>
                        {t("billingPage.claimExportPackageReady")}:{" "}
                        {claimExport.professional.header.ready ? t("billingPage.claimExportReadyYes") : t("billingPage.claimExportReadyNo")}
                      </div>
                      <div>
                        {t("billingPage.claimExportLineCount")}: {claimExport.professional.lines.length}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#64748b" }}>{t("billingPage.claimExportNoPackage")}</div>
                  )}
                </div>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.claimExportFacilityPackage")}</div>
                  {claimExport.facility ? (
                    <>
                      <div>
                        {t("billingPage.claimExportPackageReady")}:{" "}
                        {claimExport.facility.header.ready ? t("billingPage.claimExportReadyYes") : t("billingPage.claimExportReadyNo")}
                      </div>
                      <div>
                        {t("billingPage.claimExportLineCount")}: {claimExport.facility.lines.length}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: "#64748b" }}>{t("billingPage.claimExportNoPackage")}</div>
                  )}
                </div>
              </div>
              {(() => {
                const dx =
                  claimExport.professional?.header.diagnosisCodes ??
                  claimExport.facility?.header.diagnosisCodes ??
                  [];
                return dx.length > 0 ? (
                  <div style={{ fontSize: 12, marginBottom: 10, color: "#334155" }}>
                    <strong>{t("billingPage.claimExportDiagnosisCodes")}:</strong> {dx.join(", ")}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, marginBottom: 10, color: "#64748b" }}>{t("billingPage.claimExportDiagnosisEmpty")}</div>
                );
              })()}
              <div style={{ fontSize: 12, marginBottom: canViewExportJson ? 8 : 0, color: "#334155" }}>
                <div>
                  <strong>{t("billingPage.claimExportAttendingProviderId")}:</strong>{" "}
                  {claimExport.professional?.header.attendingProviderId ??
                    claimExport.facility?.header.attendingProviderId ??
                    t("billingPage.claimExportFieldEmpty")}
                </div>
                <div>
                  <strong>{t("billingPage.claimExportRenderingProviderId")}:</strong>{" "}
                  {claimExport.professional?.header.renderingProviderId ??
                    claimExport.facility?.header.renderingProviderId ??
                    t("billingPage.claimExportFieldEmpty")}
                </div>
                <div>
                  <strong>{t("billingPage.claimExportServiceDates")}:</strong>{" "}
                  {(claimExport.professional?.header.serviceStartDate ?? claimExport.facility?.header.serviceStartDate) ??
                    t("billingPage.claimExportFieldEmpty")}
                  {" · "}
                  {(claimExport.professional?.header.serviceEndDate ?? claimExport.facility?.header.serviceEndDate) ??
                    t("billingPage.claimExportFieldEmpty")}
                </div>
              </div>
              {canViewExportJson ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowExportJson((v) => !v)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    {showExportJson ? t("billingPage.claimExportJsonHide") : t("billingPage.claimExportJsonShow")}
                  </button>
                  {showExportJson ? (
                    <pre
                      style={{
                        marginTop: 8,
                        padding: 10,
                        fontSize: 11,
                        overflow: "auto",
                        maxHeight: 280,
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      {JSON.stringify(claimExport, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {claimX12 ? (
            <div
              style={{
                marginBottom: 20,
                padding: 16,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingPage.x12PreviewSectionTitle")}</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{t("billingPage.x12PreviewSectionSubtitle")}</p>
              <div style={{ fontSize: 13, marginBottom: 10, color: "#334155" }}>
                <strong>{t("billingPage.x12ReadyForGenerationLabel")}:</strong>{" "}
                {claimX12.summary.readyForGeneration ? t("billingPage.x12ReadyYes") : t("billingPage.x12ReadyNo")}
              </div>
              {(claimX12.summary.warnings?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, marginBottom: 8, color: "#1d4ed8" }}>
                  <strong>{t("billingPage.x12SummaryWarnings")}:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {claimX12.summary.warnings.map((w) => (
                      <li key={`x12sw-${w}`}>{x12CodeLabel(t, "x12Warning", w)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(claimX12.summary.missingFields?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, marginBottom: 10, color: "#9a3412" }}>
                  <strong>{t("billingPage.x12SummaryMissingFields")}:</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {claimX12.summary.missingFields.map((m) => (
                      <li key={`x12sm-${m}`}>{x12CodeLabel(t, "x12Missing", m)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, marginBottom: 10 }}>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.x12Professional837P")}</div>
                  {claimX12.professional ? (
                    <>
                      <div>
                        {t("billingPage.x12KindLabel")}: {claimX12.professional.kind}
                      </div>
                      <div>
                        {t("billingPage.x12SegmentCount")}: {claimX12.professional.segments.length}
                      </div>
                      {(claimX12.professional.warnings?.length ?? 0) > 0 ? (
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                          {claimX12.professional.warnings.map((w) => (
                            <div key={`xpw-${w}`}>{x12CodeLabel(t, "x12Warning", w)}</div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ color: "#64748b" }}>{t("billingPage.x12NoPreviewPackage")}</div>
                  )}
                </div>
                <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("billingPage.x12Facility837I")}</div>
                  {claimX12.facility ? (
                    <>
                      <div>
                        {t("billingPage.x12KindLabel")}: {claimX12.facility.kind}
                      </div>
                      <div>
                        {t("billingPage.x12SegmentCount")}: {claimX12.facility.segments.length}
                      </div>
                      {(claimX12.facility.warnings?.length ?? 0) > 0 ? (
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                          {claimX12.facility.warnings.map((w) => (
                            <div key={`xfw-${w}`}>{x12CodeLabel(t, "x12Warning", w)}</div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ color: "#64748b" }}>{t("billingPage.x12NoPreviewPackage")}</div>
                  )}
                </div>
              </div>
              {canViewExportJson ? (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowX12Text((v) => !v)}
                    style={{
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    {showX12Text ? t("billingPage.x12PreviewTextHide") : t("billingPage.x12PreviewTextShow")}
                  </button>
                  {showX12Text ? (
                    <div style={{ marginTop: 10 }}>
                      {claimX12.professional ? (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("billingPage.x12Professional837P")}</div>
                          <pre
                            style={{
                              padding: 10,
                              fontSize: 10,
                              overflow: "auto",
                              maxHeight: 200,
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              background: "#f8fafc",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {claimX12.professional.text}
                          </pre>
                        </div>
                      ) : null}
                      {claimX12.facility ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{t("billingPage.x12Facility837I")}</div>
                          <pre
                            style={{
                              padding: 10,
                              fontSize: 10,
                              overflow: "auto",
                              maxHeight: 200,
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              background: "#f8fafc",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {claimX12.facility.text}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#fff",
            }}
          >
            <h2 style={{ margin: "0 0 4px", fontSize: 16 }}>{t("billingPage.submissionPreviewSectionTitle")}</h2>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>{t("billingPage.submissionPreviewSectionSubtitle")}</p>
            {clearinghouseConfigStatus ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: 12,
                  color: "#475569",
                  lineHeight: 1.45,
                }}
              >
                <div>
                  {t("billingPage.clearinghouseModeLabel")}: {clearinghouseModeLabel(t, clearinghouseConfigStatus.mode)}
                  {" · "}
                  {t("billingPage.clearinghouseVendorLabel")}: {clearinghouseVendorLabel(t, clearinghouseConfigStatus.vendor)}
                </div>
                <div style={{ marginTop: 4 }}>
                  {clearinghouseConfigStatus.configured ? t("billingPage.clearinghouseConfiguredYes") : t("billingPage.clearinghouseConfiguredNo")}
                  {clearinghouseConfigStatus.sandbox ? ` · ${t("billingPage.clearinghouseSandboxBadge")}` : ""}
                  {clearinghouseConfigStatus.integrationTier === "live"
                    ? ` · ${t("billingPage.liveClearinghouseMode")}`
                    : clearinghouseConfigStatus.integrationTier === "sandbox"
                      ? ` · ${t("billingPage.usingSandboxMode")}`
                      : clearinghouseConfigStatus.mode === "manual"
                        ? ` · ${t("billingPage.usingManualMode")}`
                        : null}
                  {(clearinghouseConfigStatus.mode === "sandbox_api" || clearinghouseConfigStatus.mode === "sandbox_sftp") &&
                  !clearinghouseConfigStatus.sendEnabled
                    ? ` · ${t("billingPage.clearinghouseSandboxSendNotEnabled")}`
                    : null}
                  {(clearinghouseConfigStatus.mode === "live_api" || clearinghouseConfigStatus.mode === "live_sftp") &&
                  !clearinghouseConfigStatus.liveOutboundReady
                    ? ` · ${t("billingPage.liveConfigIncomplete")}`
                    : null}
                </div>
                {clearinghouseConfigStatus.integrationTier ? (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
                    {t("billingPage.clearinghouseIntegrationTierLabel")}:{" "}
                    {clearinghouseIntegrationTierLabel(t, clearinghouseConfigStatus.integrationTier)}
                    {" · "}
                    {clearinghouseConfigStatus.liveSendExplicitlyEnabled
                      ? t("billingPage.liveSendEnabled")
                      : t("billingPage.liveSendDisabled")}
                    {" · "}
                    {clearinghouseConfigStatus.inboundAckPollEnabled
                      ? t("billingPage.inboundAckPollOn")
                      : t("billingPage.inboundAckPollOff")}
                    {clearinghouseConfigStatus.inboundAckPathConfigured === false &&
                    (clearinghouseConfigStatus.ackSftpIngestEnabled ?? false)
                      ? ` · ${t("billingPage.inboundAckPathIncomplete")}`
                      : null}
                  </div>
                ) : null}
                {clearinghouseConfigStatus.configWarningCodes && clearinghouseConfigStatus.configWarningCodes.length > 0 ? (
                  <div style={{ marginTop: 4, fontSize: 11, color: "#9a3412" }}>
                    {t("billingPage.clearinghouseConfigWarningsLabel")}: {clearinghouseConfigStatus.configWarningCodes.join(", ")}
                  </div>
                ) : null}
                <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>{t("billingPage.clearinghouseManualSendHint")}</div>
                <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
                  {t("billingPage.ackInboundSftpLabel")}:{" "}
                  {clearinghouseConfigStatus.ackSftpIngestEnabled ?? false
                    ? t("billingPage.ackInboundOn")
                    : t("billingPage.ackInboundOff")}
                  {" · "}
                  {t("billingPage.ackInboundWebhookLabel")}:{" "}
                  {clearinghouseConfigStatus.ackWebhookIngestEnabled ?? false
                    ? t("billingPage.ackInboundOn")
                    : t("billingPage.ackInboundOff")}
                </div>
              </div>
            ) : null}
            {clearinghouseOpsStatus ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#fafafa",
                  fontSize: 11,
                  color: "#475569",
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("billingPage.clearinghouseOpsTitle")}</div>
                {clearinghouseOpsStatus.integrationTier ? (
                  <div style={{ marginBottom: 4 }}>
                    {t("billingPage.clearinghouseIntegrationTierLabel")}:{" "}
                    {clearinghouseIntegrationTierLabel(t, clearinghouseOpsStatus.integrationTier)}
                    {clearinghouseOpsStatus.integrationTier === "live" && clearinghouseOpsStatus.liveSendExplicitlyEnabled === false
                      ? ` · ${t("billingPage.liveSendDisabled")}`
                      : null}
                  </div>
                ) : null}
                {clearinghouseOpsStatus.lastLiveOutboundAttemptAt ? (
                  <div style={{ marginBottom: 4 }}>
                    {t("billingPage.clearinghouseLastLiveOutbound")}:{" "}
                    {new Date(clearinghouseOpsStatus.lastLiveOutboundAttemptAt).toLocaleString(locale)}
                    {clearinghouseOpsStatus.lastLiveOutboundTransport
                      ? ` · ${clearinghouseOpsStatus.lastLiveOutboundTransport}`
                      : ""}
                    {clearinghouseOpsStatus.lastLiveOutboundAttemptOk === true
                      ? ` · ${t("billingPage.outboundLiveOk")}`
                      : clearinghouseOpsStatus.lastLiveOutboundAttemptOk === false
                        ? ` · ${t("billingPage.outboundLiveTransportFailed")}`
                        : ""}
                    {clearinghouseOpsStatus.lastLiveOutboundError
                      ? ` (${clearinghouseOpsStatus.lastLiveOutboundError})`
                      : ""}
                  </div>
                ) : null}
                {typeof clearinghouseOpsStatus.recentLiveTransportFailureCount === "number" &&
                clearinghouseOpsStatus.recentLiveTransportFailureCount > 0 ? (
                  <div style={{ marginBottom: 4, color: "#9a3412" }}>
                    {t("billingPage.recentLiveTransportFailures")}: {clearinghouseOpsStatus.recentLiveTransportFailureCount}
                  </div>
                ) : null}
                {typeof clearinghouseOpsStatus.recentLiveTransportFailureCount === "number" &&
                clearinghouseOpsStatus.recentLiveTransportFailureCount > 2 ? (
                  <div style={{ marginBottom: 4, color: "#9a3412" }}>{t("billingPage.clearinghouseStab_liveStabilityWarning")}</div>
                ) : null}
                {clearinghouseOpsStatus.clearinghouseConfigWarningCodes &&
                clearinghouseOpsStatus.clearinghouseConfigWarningCodes.length > 0 ? (
                  <div style={{ marginBottom: 4, color: "#9a3412", wordBreak: "break-word" }}>
                    {t("billingPage.clearinghouseConfigWarningsLabel")}:{" "}
                    {clearinghouseOpsStatus.clearinghouseConfigWarningCodes.join(", ")}
                  </div>
                ) : null}
                <div>
                  {t("billingPage.clearinghouseOpsRetryEligibleCount")}: {clearinghouseOpsStatus.retryEligibleSubmissionCount}
                  {" · "}
                  {t("billingPage.clearinghouseRetryDueCount")}: {clearinghouseOpsStatus.retryDueSubmissionCount ?? "—"}
                  {" · "}
                  {t("billingPage.clearinghouseRetryExhaustedCount")}: {clearinghouseOpsStatus.retryExhaustedCount ?? "—"}
                  {" · "}
                  {t("billingPage.clearinghouseOpsDeadLetterCount")}: {clearinghouseOpsStatus.deadLetterAckCount}
                  {" · "}
                  {t("billingPage.clearinghouseOpsDeadLetterReplayed24h")}:{" "}
                  {clearinghouseOpsStatus.deadLetterReplayed24hCount ?? "—"}
                  {" · "}
                  {t("billingPage.clearinghouseOpsTransportFailures")}: {clearinghouseOpsStatus.recentTransportFailureCount}
                  {" · "}
                  {t("billingPage.clearinghouseRecentWorkerRetries")}: {clearinghouseOpsStatus.recentRetryAttemptCount ?? "—"}
                </div>
                {clearinghouseOpsStatus.liveCircuitOpen ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "6px 8px",
                      borderRadius: 4,
                      background: "#fff7ed",
                      color: "#9a3412",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{t("billingPage.clearinghouseOpsLiveCircuitOpen")}</div>
                    {clearinghouseOpsStatus.liveCircuitOpenUntil ? (
                      <div style={{ fontSize: 10, marginTop: 2 }}>
                        {t("billingPage.clearinghouseOpsLiveCircuitUntil")}:{" "}
                        {new Date(clearinghouseOpsStatus.liveCircuitOpenUntil).toLocaleString(locale)}
                      </div>
                    ) : null}
                    {clearinghouseOpsStatus.liveCircuitReason ? (
                      <div style={{ fontSize: 10, marginTop: 2 }}>{clearinghouseOpsStatus.liveCircuitReason}</div>
                    ) : null}
                  </div>
                ) : null}
                {(clearinghouseOpsStatus.recentDuplicateAckCount ?? 0) > 0 ||
                (clearinghouseOpsStatus.recentDuplicateSendBlockedCount ?? 0) > 0 ||
                (clearinghouseOpsStatus.recentRateLimitedSendCount ?? 0) > 0 ||
                (clearinghouseOpsStatus.recentThrottleSkips ?? 0) > 0 ? (
                  <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600 }}>{t("billingPage.clearinghouseOpsStabilizationTitle")}</div>
                    <div>
                      {t("billingPage.clearinghouseOpsDuplicateAckRolling")}: {clearinghouseOpsStatus.recentDuplicateAckCount ?? 0}
                      {" · "}
                      {t("billingPage.clearinghouseOpsDuplicateSendRolling")}:{" "}
                      {clearinghouseOpsStatus.recentDuplicateSendBlockedCount ?? 0}
                      {" · "}
                      {t("billingPage.clearinghouseOpsRateLimitRolling")}: {clearinghouseOpsStatus.recentRateLimitedSendCount ?? 0}
                      {" · "}
                      {t("billingPage.clearinghouseOpsThrottleRolling")}: {clearinghouseOpsStatus.recentThrottleSkips ?? 0}
                    </div>
                    <div style={{ marginTop: 2 }}>{t("billingPage.clearinghouseOpsRollingNote")}</div>
                  </div>
                ) : null}
                {clearinghouseOpsStatus.lastSftpAckPollTruncated ? (
                  <div style={{ marginTop: 6, fontSize: 10, color: "#92400e" }}>
                    {t("billingPage.clearinghouseOpsSftpPollTruncated")} (
                    {clearinghouseOpsStatus.lastSftpAckPollFilesProcessed ?? "—"}/
                    {clearinghouseOpsStatus.lastSftpAckPollFilesSeen ?? "—"}, cap {clearinghouseOpsStatus.lastSftpAckPollMaxFilesPerCycle ?? "—"})
                  </div>
                ) : null}
                {clearinghouseOpsStatus.durableClearinghouseMetrics ? (
                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid #e2e8f0",
                      fontSize: 10,
                      color: "#475569",
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("billingPage.recentClearinghouseActivity")}</div>
                    <div>
                      {t("billingPage.durableMetricsSendSucceeded24h")}:{" "}
                      {clearinghouseOpsStatus.durableClearinghouseMetrics.sendAttemptSucceeded24h ?? "—"}
                    </div>
                    {typeof clearinghouseOpsStatus.durableClearinghouseMetrics.ackLatencySample7d?.avgAckLatencyMs ===
                    "number" ? (
                      <div>
                        {t("billingPage.durableMetricsAvgAckLatency7d")}:{" "}
                        {Math.round(clearinghouseOpsStatus.durableClearinghouseMetrics.ackLatencySample7d.avgAckLatencyMs)}{" "}
                        (n={clearinghouseOpsStatus.durableClearinghouseMetrics.ackLatencySample7d.sampleCount ?? 0})
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <div style={{ marginTop: 4 }}>
                  {t("billingPage.clearinghouseRetryWorkerEnabledLabel")}:{" "}
                  {clearinghouseOpsStatus.clearinghouseRetryWorkerEnabled
                    ? t("billingPage.clearinghouseRetryWorkerOn")
                    : t("billingPage.clearinghouseRetryWorkerOff")}
                </div>
                <div style={{ marginTop: 4 }}>
                  {t("billingPage.clearinghouseLastRetryWorkerRun")}:{" "}
                  {clearinghouseOpsStatus.lastRetryWorkerRunAt
                    ? new Date(clearinghouseOpsStatus.lastRetryWorkerRunAt).toLocaleString(locale)
                    : "—"}{" "}
                  · {t("billingPage.clearinghouseRetryWorkerStatusLabel")}: {clearinghouseOpsStatus.lastRetryWorkerStatus ?? "—"}
                </div>
                {clearinghouseOpsStatus.lastRetryWorkerDetail ? (
                  <div style={{ marginTop: 2, color: "#64748b", wordBreak: "break-word" }}>
                    {t("billingPage.clearinghouseRetryWorkerDetailLabel")}: {clearinghouseOpsStatus.lastRetryWorkerDetail}
                  </div>
                ) : null}
                <div style={{ marginTop: 4 }}>
                  {t("billingPage.clearinghouseOpsLastSftpPollStatus")}: {clearinghouseOpsStatus.lastSftpPollStatus ?? "—"}
                  {clearinghouseOpsStatus.lastSftpPollAt
                    ? ` · ${new Date(clearinghouseOpsStatus.lastSftpPollAt).toLocaleString(locale)}`
                    : ""}
                </div>
                {clearinghouseOpsStatus.lastSftpPollDetail ? (
                  <div style={{ marginTop: 2, color: "#64748b", wordBreak: "break-word" }}>
                    {clearinghouseOpsStatus.lastSftpPollDetail}
                  </div>
                ) : null}
              </div>
            ) : null}
            {submissionReadinessMixed ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #fde68a",
                  background: "#fffbeb",
                  color: "#92400e",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{t("billingPage.submissionReadinessMixedTitle")}</div>
                <div style={{ marginTop: 4 }}>{t("billingPage.submissionReadinessMixedBody")}</div>
              </div>
            ) : submissionGateBlocked ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 600 }}>{t("billingPage.submissionNotReadyToSend")}</div>
                <div style={{ marginTop: 4 }}>{t("billingPage.submissionBlockedByCompleteness")}</div>
                {submissionGateBlockers.length > 0 ? (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {submissionGateBlockers.map((b) => (
                      <li key={b}>{completenessIssueLabel(t, b)}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  fontSize: 12,
                }}
              >
                <strong>{t("billingPage.submissionReadyToSend")}</strong>
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                disabled={submissionBusy || !facilityId}
                onClick={() => void generateSubmissionPreview()}
                style={{
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: submissionBusy ? "#e2e8f0" : "#f8fafc",
                  cursor: submissionBusy || !facilityId ? "not-allowed" : "pointer",
                }}
              >
                {submissionBusy ? t("billingPage.submissionPreviewGenerating") : t("billingPage.submissionPreviewGenerate")}
              </button>
            </div>
            {submissionListErr ? (
              <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 8 }}>{submissionListErr}</div>
            ) : null}
            {lastEnvelopePreview && canViewExportJson ? (
              <div style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowSubmissionInterchange((v) => !v)}
                  style={{
                    fontSize: 12,
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  {showSubmissionInterchange
                    ? t("billingPage.submissionInterchangeHide")
                    : t("billingPage.submissionInterchangeShow")}
                </button>
                {showSubmissionInterchange ? (
                  <pre
                    style={{
                      marginTop: 8,
                      padding: 10,
                      fontSize: 10,
                      overflow: "auto",
                      maxHeight: 240,
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {lastEnvelopePreview.text}
                  </pre>
                ) : null}
              </div>
            ) : null}
            {claimSubmissions.length === 0 ? (
              <div style={{ fontSize: 13, color: "#64748b" }}>{t("billingPage.submissionNoArtifact")}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155" }}>
                {claimSubmissions.map((s) => {
                  const batchPeers = s.batchId ? claimSubmissions.filter((x) => x.batchId === s.batchId) : [];
                  const anySideInBatchCanSend =
                    batchPeers.length > 0 &&
                    batchPeers.some((x) => !submissionSideReadinessBlocked(claimExport?.summary, x.claimType).blocked);
                  const sideSendBlocked = submissionSideReadinessBlocked(claimExport?.summary, s.claimType).blocked;
                  const sortedBatchPeers =
                    batchPeers.length > 0 ? [...batchPeers].sort((a, b) => a.id.localeCompare(b.id)) : [];
                  const isOrchestratedBatchSendRow =
                    Boolean(s.batchId) && sortedBatchPeers.length > 1 && sortedBatchPeers[0]?.id === s.id;
                  return (
                  <li key={s.id} style={{ marginBottom: 10 }}>
                    <div>
                      <strong>{claimSubmissionKindLabel(t, s.claimType)}</strong>
                      {" · "}
                      {t("billingPage.submissionStatus")}: {submissionStatusLabel(t, s.status)}
                    </div>
                    {s.batchId ? (
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {t("billingPage.submissionBatchId")}: {s.batchId}
                      </div>
                    ) : null}
                    {s.externalReference ? (
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {t("billingPage.clearinghouseReferenceLabel")}: {s.externalReference}
                      </div>
                    ) : null}
                    {s.batchId ? (
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void sendSubmissionSingle(s.id, s.claimType)}
                          disabled={
                            submissionBusy || sideSendBlocked || s.status !== "READY_TO_SEND" || !facilityId
                          }
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor:
                              submissionBusy || sideSendBlocked || s.status !== "READY_TO_SEND" || !facilityId
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          {sendSubmissionSideActionLabel(t, s.claimType)}
                        </button>
                        {isOrchestratedBatchSendRow ? (
                          <button
                            type="button"
                            onClick={() => void sendSubmissionBatch(s.batchId!)}
                            disabled={submissionBusy || !anySideInBatchCanSend}
                            style={{
                              fontSize: 11,
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              background: "#f8fafc",
                              cursor: submissionBusy || !anySideInBatchCanSend ? "not-allowed" : "pointer",
                            }}
                          >
                            {t("billingPage.sendAllReadySubmissionsInBatch")}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {s.warnings.length > 0 ? (
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        <span style={{ fontWeight: 600 }}>{t("billingPage.submissionWarnings")}:</span>{" "}
                        {s.warnings.map((w) => x12CodeLabel(t, "x12Warning", w)).join("; ")}
                      </div>
                    ) : null}
                    {s.missingFields.length > 0 ? (
                      <div style={{ fontSize: 12, marginTop: 4, color: "#9a3412" }}>
                        <span style={{ fontWeight: 600 }}>{t("billingPage.submissionMissingFields")}:</span>{" "}
                        {s.missingFields.map((m) => x12CodeLabel(t, "x12Missing", m)).join("; ")}
                      </div>
                    ) : null}
                    {canViewExportJson ? (
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          disabled={expandedSubmissionLoading === s.id}
                          onClick={() => void toggleSubmissionDetail(s.id)}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: expandedSubmissionLoading === s.id ? "wait" : "pointer",
                          }}
                        >
                          {expandedSubmissionDetail?.id === s.id
                            ? t("billingPage.x12PreviewTextHide")
                            : t("billingPage.x12PreviewTextShow")}
                        </button>
                        {expandedSubmissionDetail?.id === s.id && expandedSubmissionDetail.x12Text ? (
                          <pre
                            style={{
                              marginTop: 6,
                              padding: 8,
                              fontSize: 10,
                              overflow: "auto",
                              maxHeight: 180,
                              borderRadius: 6,
                              border: "1px solid #e2e8f0",
                              background: "#f8fafc",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {expandedSubmissionDetail.x12Text}
                          </pre>
                        ) : null}
                        {expandedSubmissionDetail?.id === s.id ? (
                          <div style={{ marginTop: 6, fontSize: 11, color: "#475569" }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("billingPage.submissionAttempts")}</div>
                            {(submissionAttempts[s.id]?.length ?? 0) === 0 ? (
                              <div>{t("billingPage.submissionNoAttempts")}</div>
                            ) : (
                              submissionAttempts[s.id]!.map((a) => (
                                <div key={a.id}>
                                  {a.transport} · {a.ok ? t("common.yes") : t("common.no")}
                                  {a.failureCode
                                    ? ` · ${t("billingPage.submissionAttemptFailureCode")}: ${
                                        submissionFailureCodeLabel(t, a.failureCode) ?? a.failureCode
                                      }`
                                    : ""}
                                  {a.failureCode === "RETRY_EXHAUSTED"
                                    ? ` · ${t("billingPage.submissionRetryExhausted")}`
                                    : null}
                                  {a.retryEligible ? ` · ${t("billingPage.submissionRetryEligible")}` : ""}
                                  {!a.ok && !a.retryEligible && a.failureCode && a.failureCode !== "RETRY_EXHAUSTED"
                                    ? ` · ${t("billingPage.submissionRetryNotEligible")}`
                                    : null}
                                  {a.nextRetryAt
                                    ? ` · ${t("billingPage.submissionNextRetryAt")}: ${new Date(a.nextRetryAt).toLocaleString(locale)}`
                                    : ""}
                                  {a.errorMessage ? ` · ${t("billingPage.submissionAttemptFailed")}: ${a.errorMessage}` : ""}
                                  {canEditLines && !a.ok && a.retryEligible ? (
                                    <span style={{ marginLeft: 6 }}>
                                      <button
                                        type="button"
                                        disabled={retrySendBusyId === s.id || submissionBusy || sideSendBlocked}
                                        onClick={() => void retrySubmissionSend(s.id)}
                                        style={{
                                          fontSize: 11,
                                          padding: "2px 8px",
                                          borderRadius: 4,
                                          border: "1px solid #cbd5e1",
                                          background: "#fff",
                                          cursor:
                                            retrySendBusyId === s.id || sideSendBlocked ? "not-allowed" : "pointer",
                                        }}
                                      >
                                        {retrySendBusyId === s.id
                                          ? t("billingPage.submissionRetrySendBusy")
                                          : retrySubmissionSideActionLabel(t, s.claimType)}
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              ))
                            )}
                            {expandedSubmissionDetail?.id === s.id ? (
                              <div style={{ marginTop: 8 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("billingPage.operationalTimelineTitle")}</div>
                                {(submissionOperationalTimeline[s.id]?.length ?? 0) === 0 ? (
                                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{t("billingPage.operationalTimelineEmpty")}</div>
                                ) : (
                                  <div style={{ maxHeight: 220, overflow: "auto", fontSize: 10, color: "#64748b" }}>
                                    {submissionOperationalTimeline[s.id]!.map((row, idx) => (
                                      <div key={`${row.at}-${idx}-${row.kind}`} style={{ marginBottom: 4 }}>
                                        <span style={{ color: "#0f172a" }}>{new Date(row.at).toLocaleString(locale)}</span>
                                        {" · "}
                                        {timelineSourceLabel(t, row.source)} — {row.summary}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null}
                            <div style={{ fontWeight: 600, marginTop: 6, marginBottom: 4 }}>
                              {submissionAckSideSectionLabel(t, s.claimType)}
                            </div>
                            {(submissionAcks[s.id]?.length ?? 0) === 0 ? (
                              <div>{t("billingPage.submissionNoAcknowledgmentYet")}</div>
                            ) : (
                              submissionAcks[s.id]!.map((a) => (
                                <div key={a.id}>
                                  {a.kind} · {a.statusCode ?? "UNKNOWN"}
                                  {a.message ? ` · ${a.message}` : ""}
                                  {" · "}
                                  {t("billingPage.submissionAckSourceLabel")}: {ackSourceLabel(t, a.ackSource)}
                                  {" · "}
                                  {t("billingPage.submissionAckIngestedAt")}:{" "}
                                  {a.receivedAt ? new Date(a.receivedAt).toLocaleString(locale) : "—"}
                                  {submissionLifecycleReasonLabel(t, a.warningCode) ? (
                                    <span style={{ color: "#64748b" }}>
                                      {" "}
                                      · {t("billingPage.submissionLifecycleNote")}: {submissionLifecycleReasonLabel(t, a.warningCode)}
                                    </span>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          {submissionDebug ? (
            <div style={{ marginBottom: 20, padding: 16, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("billingPage.submissionTimelineTitle")}</h2>
              {submissionDebug.submissions.length === 0 ? (
                <div style={{ fontSize: 13, color: "#64748b" }}>{t("billingPage.submissionNoArtifact")}</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {submissionDebug.submissions.map((s) => (
                    <div key={s.submissionId} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 10 }}>
                      <div style={{ fontSize: 13 }}>
                        <strong>
                          {submissionTimelineSideTitle(
                            t,
                            s.claimType ?? (s.type === "837P" ? "PROFESSIONAL_837P" : "FACILITY_837I")
                          )}
                        </strong>{" "}
                        · {submissionStatusLabel(t, s.status)}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {new Date(s.createdAt).toLocaleString(locale)} · {t("billingPage.submissionAttempts")}: {s.attempts.length}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {t("billingPage.submissionLastAttemptStatus")}: {s.attempts[0]?.status ?? "—"} · {t("billingPage.submissionAckStatus")}:{" "}
                        {s.acknowledgments[0]?.status ?? t("billingPage.submissionNoAcknowledgmentYet")}
                      </div>
                      <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                        {t("billingPage.submissionCurrentStatus")}: {submissionStatusLabel(t, s.status)}
                      </div>
                      {submissionLifecycleReasonLabel(t, s.lastTransitionReason) ? (
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {t("billingPage.submissionLifecycleNote")}: {submissionLifecycleReasonLabel(t, s.lastTransitionReason)}
                        </div>
                      ) : null}
                      {s.acknowledgments[0] ? (
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                          {t("billingPage.submissionAckSourceLabel")}: {ackSourceLabel(t, s.acknowledgments[0].ackSource)} ·{" "}
                          {t("billingPage.submissionAckIngestedAt")}:{" "}
                          {new Date(s.acknowledgments[0].receivedAt).toLocaleString(locale)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div
            style={{
              marginBottom: 20,
              padding: 16,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: readiness.isReady ? "#f0fdf4" : "#fffbeb",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 16 }}>{t("billingPage.readinessCardTitle")}</h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "#334155" }}>
              <strong>{billingPageKey(t, `billingWorkflow_${wf}`)}</strong>
              {" · "}
              {readiness.isReady ? t("billingPage.readinessIsReady") : t("billingPage.readinessNotReady")}
            </p>
            {readiness.blockers.length > 0 ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("billingPage.readinessBlockers")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#92400e" }}>
                  {readiness.blockers.map((b) => (
                    <li key={b.code}>{readinessLineLabel(t, "readinessBlocker", b.code, b.detail)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {readiness.warnings.length > 0 ? (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("billingPage.readinessWarnings")}</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
                  {readiness.warnings.map((w) => (
                    <li key={w.code}>{readinessLineLabel(t, "readinessWarning", w.code, w.detail)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {showFinalize ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void finalizeEncounter()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: "#0f766e",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: actionBusy ? "wait" : "pointer",
                  }}
                >
                  {t("billingPage.readinessFinalize")}
                </button>
              ) : null}
              {showReopen ? (
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => void reopenEncounter()}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: actionBusy ? "wait" : "pointer",
                  }}
                >
                  {t("billingPage.readinessReopen")}
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ marginBottom: 16, fontSize: 14, color: "#334155" }}>
            <strong>{t("billingPage.billingSummaryTotal")}:</strong> {data.summary.totalEvents} ·{" "}
            {t("billingPage.colNeedsReview")}: {data.summary.needsReview} · {t("billingPage.colMissingCode")}:{" "}
            {data.summary.missingCode}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              marginBottom: 12,
              fontSize: 12,
              color: "#475569",
            }}
          >
            <strong>{t("billingPage.billingReadinessLegend")}:</strong>
            <BillingReadinessBadge status="official_validated" t={t} />
            <BillingReadinessBadge status="candidate_only" t={t} />
            <BillingReadinessBadge status="pending_license" t={t} />
            <BillingReadinessBadge status="missing" t={t} />
          </div>
          {data.events.length === 0 ? (
            <p style={{ color: "#64748b" }}>{t("billingPage.billingSummaryEmpty")}</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableModule")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableSide")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableCodeType")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableCode")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableProcedure")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableHcpcs")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableDiagnosis")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableReadiness")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableStatus")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableServiceDate")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableDescription")}</th>
                    <th style={{ padding: 10, textAlign: "left" }}>{t("billingPage.billingSummaryTableActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((ev) => {
                    const coded = billingLedgerRowHasUsableCode(ev);
                    const isUnmapped = billingLedgerRowIsUnmapped(ev);
                    const informationalNonBillable = billingLedgerRowIsInformationalNonBillable(ev);
                    const medDrugOnlyNoProcedure = billingLedgerRowIsMedAdminDrugOnlyWithoutProcedureCpt(ev);
                    const showUncodedWarning = !isUnmapped && !informationalNonBillable && !coded;
                    const billingReadinessStatus = billingReadinessStatusForLedgerRow(ev);
                    const rowBg = isUnmapped
                      ? "#fef2f2"
                      : informationalNonBillable
                        ? "#f8fafc"
                        : showUncodedWarning
                          ? "#fffbeb"
                          : undefined;
                    const rowBorderLeft = isUnmapped ? "4px solid #dc2626" : undefined;
                    const isEditing = editingId === ev.id;
                    return (
                      <React.Fragment key={ev.id}>
                        <tr
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: rowBg,
                            borderLeft: rowBorderLeft,
                          }}
                        >
                          <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                            {billingPageKey(t, `billingSourceModule_${ev.sourceModule}`)}
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>{billingPageKey(t, `billingSide_${ev.billingSide}`)}</td>
                          <td style={{ padding: 10, fontSize: 13 }}>
                            {billingPageKey(t, ev.codeType ? `billingCodeType_${ev.codeType}` : "billingCodeType_UNKNOWN")}
                          </td>
                          <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                            <div>
                              {ev.code?.trim() ? ev.code : t("common.dash")}
                              {isUnmapped ? (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#b91c1c",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {t("billingPage.billingSummaryUnmappedBadge")}
                                </span>
                              ) : informationalNonBillable ? (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: "#64748b",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {t("billingPage.billingSummaryNonBillableLine")}
                                </span>
                              ) : medDrugOnlyNoProcedure ? (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    color: "#475569",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {t("billingPage.billingSummaryMedAdminRecordedNoProcedure")}
                                </span>
                              ) : showUncodedWarning ? (
                                <span
                                  style={{
                                    marginLeft: 8,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#b45309",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {t("billingPage.billingSummaryUncodedBadge")}
                                </span>
                              ) : null}
                            </div>
                            {isUnmapped ? (
                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 11,
                                  color: "#64748b",
                                  maxWidth: 320,
                                  lineHeight: 1.35,
                                  fontFamily: "inherit",
                                }}
                              >
                                {billingUnmappedHintText(t, ev.sourceModule)}
                              </div>
                            ) : null}
                          </td>
                          <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                            {ev.procedureCode?.trim() ? ev.procedureCode : t("common.dash")}
                          </td>
                          <td style={{ padding: 10, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                            {ev.hcpcsCode?.trim() ? ev.hcpcsCode : t("common.dash")}
                          </td>
                          <td style={{ padding: 10, fontSize: 12, maxWidth: 140, wordBreak: "break-word" }}>
                            {ev.diagnosisCodes?.trim() ? ev.diagnosisCodes : t("common.dash")}
                          </td>
                          <td style={{ padding: 10 }}>
                            {billingReadinessStatus ? (
                              <BillingReadinessBadge status={billingReadinessStatus} t={t} />
                            ) : (
                              t("common.dash")
                            )}
                          </td>
                          <td style={{ padding: 10 }}>
                            {billingPageKey(t, `billingReviewStatus_${ev.reviewStatus}`)}
                          </td>
                          <td style={{ padding: 10 }}>
                            {ev.serviceDate ? new Date(ev.serviceDate).toLocaleString(locale) : t("common.dash")}
                          </td>
                          <td style={{ padding: 10, color: "#334155", maxWidth: 200 }}>
                            {ev.descriptionSnapshot?.trim() ? ev.descriptionSnapshot : t("common.dash")}
                          </td>
                          <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                            {canEditLines && wf !== "FINALIZED" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (isEditing) {
                                    setEditingId(null);
                                    setDraft(null);
                                  } else {
                                    setEditingId(ev.id);
                                    setDraft(toDraft(ev));
                                  }
                                }}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  marginRight: 6,
                                }}
                              >
                                {isEditing ? t("billingPage.billingRowCancel") : t("billingPage.billingRowEdit")}
                              </button>
                            ) : null}
                            {ev.reviewStatus === "CAPTURED" && (coded || informationalNonBillable) && wf !== "FINALIZED" ? (
                              <button
                                type="button"
                                disabled={markingId === ev.id}
                                onClick={() => void markReviewed(ev.id)}
                                style={{
                                  fontSize: 12,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #cbd5e1",
                                  background: "#fff",
                                  cursor: markingId === ev.id ? "wait" : "pointer",
                                }}
                              >
                                {t("billingPage.billingSummaryMarkReviewed")}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                        {isEditing && draft ? (
                          <tr style={{ background: "#f8fafc" }}>
                            <td colSpan={11} style={{ padding: 14, borderBottom: "1px solid #e2e8f0" }}>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                                  gap: 10,
                                  alignItems: "end",
                                }}
                              >
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingEditBillingSide")}
                                  <select
                                    value={draft.billingSide}
                                    onChange={(e) => setDraft({ ...draft, billingSide: e.target.value })}
                                    style={{ padding: 6 }}
                                  >
                                    {billingSides.map((s) => (
                                      <option key={s} value={s}>
                                        {billingPageKey(t, `billingSide_${s}`)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingEditReviewStatus")}
                                  <select
                                    value={draft.reviewStatus}
                                    onChange={(e) => setDraft({ ...draft, reviewStatus: e.target.value })}
                                    style={{ padding: 6 }}
                                  >
                                    {reviewStatuses.map((s) => (
                                      <option key={s} value={s}>
                                        {billingPageKey(t, `billingReviewStatus_${s}`)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingSummaryTableProcedure")}
                                  <input
                                    value={draft.procedureCode}
                                    onChange={(e) => setDraft({ ...draft, procedureCode: e.target.value })}
                                    style={{ padding: 6, fontFamily: "ui-monospace, monospace" }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingSummaryTableHcpcs")}
                                  <input
                                    value={draft.hcpcsCode}
                                    onChange={(e) => setDraft({ ...draft, hcpcsCode: e.target.value })}
                                    style={{ padding: 6, fontFamily: "ui-monospace, monospace" }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4, gridColumn: "span 2" }}>
                                  {t("billingPage.billingSummaryTableDiagnosis")}
                                  <input
                                    value={draft.diagnosisCodes}
                                    onChange={(e) => setDraft({ ...draft, diagnosisCodes: e.target.value })}
                                    placeholder="ICD-10; separated"
                                    style={{ padding: 6 }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingEditRevenueCode")}
                                  <input
                                    value={draft.revenueCode}
                                    onChange={(e) => setDraft({ ...draft, revenueCode: e.target.value })}
                                    style={{ padding: 6 }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4 }}>
                                  {t("billingPage.billingEditModifiers")}
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <input
                                      value={draft.modifier1}
                                      onChange={(e) => setDraft({ ...draft, modifier1: e.target.value })}
                                      style={{ padding: 6, width: "100%" }}
                                    />
                                    <input
                                      value={draft.modifier2}
                                      onChange={(e) => setDraft({ ...draft, modifier2: e.target.value })}
                                      style={{ padding: 6, width: "100%" }}
                                    />
                                  </div>
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4, gridColumn: "span 2" }}>
                                  {t("billingPage.billingSummaryTableServiceDate")} (ISO 8601)
                                  <input
                                    value={draft.serviceDateIso}
                                    onChange={(e) => setDraft({ ...draft, serviceDateIso: e.target.value })}
                                    placeholder="2026-01-15T14:30:00.000Z"
                                    style={{ padding: 6 }}
                                  />
                                </label>
                                <label style={{ display: "flex", flexDirection: "column", fontSize: 12, gap: 4, gridColumn: "1 / -1" }}>
                                  {t("billingPage.billingEditDescription")}
                                  <textarea
                                    value={draft.descriptionSnapshot}
                                    onChange={(e) => setDraft({ ...draft, descriptionSnapshot: e.target.value })}
                                    rows={2}
                                    style={{ padding: 8, width: "100%", boxSizing: "border-box" }}
                                  />
                                </label>
                              </div>
                              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  disabled={savingLineId === ev.id}
                                  onClick={() => void saveLine(ev.id)}
                                  style={{
                                    padding: "8px 14px",
                                    borderRadius: 6,
                                    border: "none",
                                    background: "#0f766e",
                                    color: "#fff",
                                    fontWeight: 600,
                                    cursor: savingLineId === ev.id ? "wait" : "pointer",
                                  }}
                                >
                                  {savingLineId === ev.id ? t("common.saving") : t("billingPage.billingRowSave")}
                                </button>
                                <button
                                  type="button"
                                  disabled={savingLineId === ev.id}
                                  onClick={() => {
                                    setEditingId(null);
                                    setDraft(null);
                                  }}
                                  style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff" }}
                                >
                                  {t("billingPage.billingRowCancel")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {canEditLines ? (
            <div style={{ marginTop: 24, padding: 16, border: "1px dashed #cbd5e1", borderRadius: 8, background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <h2 style={{ margin: 0, fontSize: 15 }}>{t("billingPage.billingAdvancedJsonTitle")}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvancedJson((v) => !v);
                    if (!showAdvancedJson) void loadAdvancedJson();
                  }}
                  style={{ fontSize: 13, padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff" }}
                >
                  {showAdvancedJson ? t("billingPage.billingAdvancedJsonHide") : t("billingPage.billingAdvancedJsonShow")}
                </button>
              </div>
              {showAdvancedJson ? (
                <>
                  {advancedLoading ? (
                    <p>{t("common.loading")}</p>
                  ) : (
                    <>
                      <textarea
                        value={advancedText}
                        onChange={(e) => setAdvancedText(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 220,
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 12,
                          boxSizing: "border-box",
                        }}
                        spellCheck={false}
                      />
                      {advancedErr ? <p style={{ color: "#b91c1c", fontSize: 13 }}>{advancedErr}</p> : null}
                      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          disabled={advancedSaving || wf === "FINALIZED"}
                          onClick={() => void saveAdvancedJson()}
                          style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#64748b", color: "#fff" }}
                        >
                          {advancedSaving ? t("common.saving") : t("billingPage.billingCaptureSave")}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
