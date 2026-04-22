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
    type: "837P" | "837I";
    status: string;
    createdAt: string;
    lastTransitionReason?: string | null;
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
  ackSftpIngestEnabled: boolean;
  ackWebhookIngestEnabled: boolean;
};

type ClearinghouseOpsStatusPayload = {
  clearinghouseMode: string;
  outboundConfigured: boolean;
  inboundSftpEnabled: boolean;
  inboundWebhookEnabled: boolean;
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
  recentTransportFailureCount: number;
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

function clearinghouseModeLabel(t: (k: string) => string, mode: string): string {
  const k = `billingPage.clearinghouseMode_${mode}`;
  const v = t(k);
  return v === k ? mode : v;
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
  const [submissionDebug, setSubmissionDebug] = useState<SubmissionDebugPayload | null>(null);
  const [clearinghouseConfigStatus, setClearinghouseConfigStatus] = useState<ClearinghouseConfigStatusPayload | null>(null);
  const [clearinghouseOpsStatus, setClearinghouseOpsStatus] = useState<ClearinghouseOpsStatusPayload | null>(null);
  const [retrySendBusyId, setRetrySendBusyId] = useState<string | null>(null);

  const locale = encounterBcp47(language);
  const canEditLines = roles.includes("BILLING") || roles.includes("ADMIN");
  const canFinalizeBilling = roles.includes("BILLING") || roles.includes("ADMIN");
  const canViewExportJson = roles.includes("BILLING") || roles.includes("ADMIN");

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
        await apiFetch(`/billing/submission-batches/${batchId}/send`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transport: "MANUAL" }),
        });
        setToast(t("billingPage.submissionSendOk"));
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
        await apiFetch(`/billing/submissions/${submissionId}/retry-send`, {
          facilityId,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transport: "MANUAL" }),
        });
        setToast(t("billingPage.submissionRetrySendOk"));
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
    [facilityId, language, load, t]
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
        const [attempts, acks] = await Promise.all([
          apiFetch(`/billing/submissions/${submissionId}/attempts`, { facilityId }),
          apiFetch(`/billing/submissions/${submissionId}/acknowledgments`, { facilityId }),
        ]);
        if (Array.isArray(attempts)) {
          setSubmissionAttempts((prev) => ({ ...prev, [submissionId]: attempts as SubmissionAttemptPayload[] }));
        }
        if (Array.isArray(acks)) {
          setSubmissionAcks((prev) => ({ ...prev, [submissionId]: acks as SubmissionAckPayload[] }));
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
              <div style={{ fontSize: 13, marginBottom: 10, color: "#334155" }}>
                <strong>{t("billingPage.claimExportReadyLabel")}:</strong>{" "}
                {claimExport.summary.readyForExport ? t("billingPage.claimExportReadyYes") : t("billingPage.claimExportReadyNo")}
              </div>
              {(claimExport.summary.blockers?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, marginBottom: 8, color: "#9a3412" }}>
                  <strong>{t("billingPage.claimExportSummaryValidationBlockers")}:</strong> {claimExport.summary.blockers.join(", ")}
                </div>
              ) : null}
              {(claimExport.summary.warnings?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, marginBottom: 8, color: "#1d4ed8" }}>
                  <strong>{t("billingPage.claimExportSummaryValidationWarnings")}:</strong> {claimExport.summary.warnings.join(", ")}
                </div>
              ) : null}
              {(claimExport.summary.contextWarnings?.length ?? 0) > 0 ? (
                <div style={{ fontSize: 12, marginBottom: 12, color: "#64748b" }}>
                  {(claimExport.summary.contextWarnings ?? []).map((cw) => (
                    <div key={cw}>{exportContextWarningLabel(t, cw)}</div>
                  ))}
                </div>
              ) : null}
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
                  {(clearinghouseConfigStatus.mode === "sandbox_api" || clearinghouseConfigStatus.mode === "sandbox_sftp") &&
                  !clearinghouseConfigStatus.sendEnabled
                    ? ` · ${t("billingPage.clearinghouseLiveSendNotEnabled")}`
                    : null}
                </div>
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
                <div>
                  {t("billingPage.clearinghouseOpsRetryEligibleCount")}: {clearinghouseOpsStatus.retryEligibleSubmissionCount}
                  {" · "}
                  {t("billingPage.clearinghouseRetryDueCount")}: {clearinghouseOpsStatus.retryDueSubmissionCount ?? "—"}
                  {" · "}
                  {t("billingPage.clearinghouseRetryExhaustedCount")}: {clearinghouseOpsStatus.retryExhaustedCount ?? "—"}
                  {" · "}
                  {t("billingPage.clearinghouseOpsDeadLetterCount")}: {clearinghouseOpsStatus.deadLetterAckCount}
                  {" · "}
                  {t("billingPage.clearinghouseOpsTransportFailures")}: {clearinghouseOpsStatus.recentTransportFailureCount}
                  {" · "}
                  {t("billingPage.clearinghouseRecentWorkerRetries")}: {clearinghouseOpsStatus.recentRetryAttemptCount ?? "—"}
                </div>
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
                {claimSubmissions.map((s) => (
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
                        {t("billingPage.submissionExternalReference")}: {s.externalReference}
                      </div>
                    ) : null}
                    {s.batchId ? (
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => void sendSubmissionBatch(s.batchId!)}
                          disabled={submissionBusy}
                          style={{
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            cursor: submissionBusy ? "wait" : "pointer",
                          }}
                        >
                          {t("billingPage.submissionSendManual")}
                        </button>
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
                                  {a.failureCode ? ` · ${t("billingPage.submissionAttemptFailureCode")}: ${a.failureCode}` : ""}
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
                                        disabled={retrySendBusyId === s.id || submissionBusy}
                                        onClick={() => void retrySubmissionSend(s.id)}
                                        style={{
                                          fontSize: 11,
                                          padding: "2px 8px",
                                          borderRadius: 4,
                                          border: "1px solid #cbd5e1",
                                          background: "#fff",
                                          cursor: retrySendBusyId === s.id ? "wait" : "pointer",
                                        }}
                                      >
                                        {retrySendBusyId === s.id
                                          ? t("billingPage.submissionRetrySendBusy")
                                          : t("billingPage.submissionRetrySend")}
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              ))
                            )}
                            <div style={{ fontWeight: 600, marginTop: 6, marginBottom: 4 }}>{t("billingPage.submissionAcknowledgments")}</div>
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
                ))}
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
                        <strong>{s.type}</strong> · {submissionStatusLabel(t, s.status)}
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
