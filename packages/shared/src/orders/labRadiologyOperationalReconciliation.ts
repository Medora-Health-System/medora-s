/**
 * Phase 15F-C.1 — read-only operational reconciliation for lab / radiology workflows.
 * Does not mutate timestamps, billing, or audit history.
 */

import {
  labRadEffectiveTimesDiffer,
  parseLabRadiologyEffectiveClinicalTimeIso,
} from "./labRadiologyEffectiveClinicalTime.js";

/** Operational delay thresholds (guidance only). */
export const LAB_RAD_DELAY_ORDER_TO_MILESTONE_MS = 4 * 60 * 60 * 1000;
export const LAB_RAD_DELAY_MILESTONE_TO_RESULT_MS = 4 * 60 * 60 * 1000;
export const LAB_RAD_STALE_PENDING_MS = 24 * 60 * 60 * 1000;

export type LabRadReconciliationDomain = "LAB" | "RADIOLOGY";

export type LabRadReconciliationFlag =
  | "RESULT_WITHOUT_COLLECTION_OR_PERFORMED"
  | "DELAYED_ORDER_TO_MILESTONE"
  | "DELAYED_MILESTONE_TO_RESULT"
  | "ADJUSTED_CLINICAL_TIME"
  | "DUPLICATE_RESULTED"
  | "STALE_PENDING"
  | "ORPHAN_RESULT"
  | "OVERNIGHT_TIMING";

export type LabRadReconciliationSeverity = "info" | "warning";

export type LabRadReconciliationFinding = {
  flag: LabRadReconciliationFlag;
  severity: LabRadReconciliationSeverity;
};

export type LabRadReconciliationOrderInput = {
  id: string;
  createdAt: string | Date;
  type?: string | null;
};

export type LabRadReconciliationResultInput = {
  id?: string;
  verifiedAt?: string | Date | null;
  effectiveResultedAt?: string | Date | null;
  effectiveResultedAtVersion?: number;
  effectiveFinalizedAt?: string | Date | null;
  effectiveFinalizedAtVersion?: number;
  createdAt?: string | Date | null;
  resultText?: string | null;
};

export type LabRadReconciliationOrderItemInput = {
  id: string;
  status: string;
  catalogItemType?: string | null;
  catalogItemId?: string | null;
  createdAt: string | Date;
  documentedCollectedAt?: string | Date | null;
  effectiveCollectedAt?: string | Date | null;
  effectiveCollectedAtVersion?: number;
  documentedReceivedAt?: string | Date | null;
  effectiveReceivedAt?: string | Date | null;
  effectiveReceivedAtVersion?: number;
  documentedPerformedAt?: string | Date | null;
  effectivePerformedAt?: string | Date | null;
  effectivePerformedAtVersion?: number;
  result?: LabRadReconciliationResultInput | null;
};

const TERMINAL_RESULT_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);
const PENDING_STATUSES = new Set(["PLACED", "PENDING", "SIGNED", "ACKNOWLEDGED", "IN_PROGRESS"]);

function toMs(raw: string | Date | null | undefined): number | null {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw.getTime();
  if (typeof raw === "string" && raw.trim()) {
    const d = parseLabRadiologyEffectiveClinicalTimeIso(raw);
    return d ? d.getTime() : null;
  }
  return null;
}

function utcDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

function milestoneAdjusted(
  documented: string | Date | null | undefined,
  effective: string | Date | null | undefined,
  version: number | undefined
): boolean {
  if ((version ?? 0) > 0) return true;
  const doc = toMs(documented);
  const eff = toMs(effective);
  if (doc == null || eff == null) return false;
  return labRadEffectiveTimesDiffer(new Date(eff), new Date(doc));
}

function hasResultPayload(result: LabRadReconciliationResultInput | null | undefined): boolean {
  if (!result) return false;
  if (toMs(result.verifiedAt) != null) return true;
  if (typeof result.resultText === "string" && result.resultText.trim()) return true;
  return false;
}

function getClinicalMilestoneMs(
  domain: LabRadReconciliationDomain,
  item: LabRadReconciliationOrderItemInput
): number | null {
  if (domain === "LAB") {
    return toMs(item.effectiveCollectedAt) ?? toMs(item.documentedCollectedAt);
  }
  return toMs(item.effectivePerformedAt) ?? toMs(item.documentedPerformedAt);
}

function documentedMilestoneMs(domain: LabRadReconciliationDomain, item: LabRadReconciliationOrderItemInput): number | null {
  if (domain === "LAB") return toMs(item.documentedCollectedAt);
  return toMs(item.documentedPerformedAt);
}

function resultClinicalMs(domain: LabRadReconciliationDomain, result: LabRadReconciliationResultInput): number | null {
  if (domain === "LAB") {
    return toMs(result.effectiveResultedAt) ?? toMs(result.verifiedAt);
  }
  return toMs(result.effectiveFinalizedAt) ?? toMs(result.verifiedAt);
}

function resultDocumentedMs(result: LabRadReconciliationResultInput): number | null {
  return toMs(result.verifiedAt);
}

function isDuplicateResultSibling(
  item: LabRadReconciliationOrderItemInput,
  sibling: LabRadReconciliationOrderItemInput
): boolean {
  if (sibling.id === item.id) return false;
  if (!TERMINAL_RESULT_STATUSES.has(String(sibling.status))) return false;
  if (!hasResultPayload(sibling.result)) return false;
  const sameCatalog =
    item.catalogItemId &&
    sibling.catalogItemId &&
    item.catalogItemId === sibling.catalogItemId;
  if (sameCatalog) return true;
  return false;
}

/** Flags that imply operational follow-up (excludes transparency-only adjusted badge). */
export function labRadReconciliationNeedsFollowUp(flags: LabRadReconciliationFlag[]): boolean {
  return flags.some(
    (f) =>
      f !== "ADJUSTED_CLINICAL_TIME" &&
      f !== "OVERNIGHT_TIMING"
  );
}

export function analyzeLabRadOrderItemReconciliation(input: {
  domain: LabRadReconciliationDomain;
  order: LabRadReconciliationOrderInput;
  item: LabRadReconciliationOrderItemInput;
  siblingItems?: LabRadReconciliationOrderItemInput[];
  now?: Date;
}): LabRadReconciliationFinding[] {
  const { domain, order, item } = input;
  const nowMs = (input.now ?? new Date()).getTime();
  const findings: LabRadReconciliationFinding[] = [];
  const result = item.result ?? null;
  const hasResult = hasResultPayload(result);
  const docMilestoneMs = documentedMilestoneMs(domain, item);
  const clinicalMilestoneAtMs = getClinicalMilestoneMs(domain, item);
  const orderMs = toMs(order.createdAt);
  const itemMs = toMs(item.createdAt);

  if (hasResult && docMilestoneMs == null) {
    findings.push({
      flag: "RESULT_WITHOUT_COLLECTION_OR_PERFORMED",
      severity: "warning",
    });
  }

  if (orderMs != null && docMilestoneMs != null) {
    const delta = docMilestoneMs - orderMs;
    if (delta > LAB_RAD_DELAY_ORDER_TO_MILESTONE_MS) {
      findings.push({ flag: "DELAYED_ORDER_TO_MILESTONE", severity: "info" });
    }
  }

  if (docMilestoneMs != null && result && resultDocumentedMs(result) != null) {
    const resultDocMs = resultDocumentedMs(result)!;
    const delta = resultDocMs - docMilestoneMs;
    if (delta > LAB_RAD_DELAY_MILESTONE_TO_RESULT_MS) {
      findings.push({ flag: "DELAYED_MILESTONE_TO_RESULT", severity: "info" });
    }
  }

  const adjustedMilestones =
    (domain === "LAB" &&
      (milestoneAdjusted(item.documentedReceivedAt, item.effectiveReceivedAt, item.effectiveReceivedAtVersion) ||
        milestoneAdjusted(item.documentedCollectedAt, item.effectiveCollectedAt, item.effectiveCollectedAtVersion))) ||
    (domain === "RADIOLOGY" &&
      milestoneAdjusted(item.documentedPerformedAt, item.effectivePerformedAt, item.effectivePerformedAtVersion));

  const adjustedResult =
    result &&
    ((domain === "LAB" &&
      milestoneAdjusted(
        result.verifiedAt,
        result.effectiveResultedAt,
        result.effectiveResultedAtVersion
      )) ||
      (domain === "RADIOLOGY" &&
        milestoneAdjusted(
          result.verifiedAt,
          result.effectiveFinalizedAt,
          result.effectiveFinalizedAtVersion
        )));

  if (adjustedMilestones || adjustedResult) {
    findings.push({ flag: "ADJUSTED_CLINICAL_TIME", severity: "info" });
  }

  const siblings = input.siblingItems ?? [];
  if (siblings.some((s) => isDuplicateResultSibling(item, s)) && hasResult) {
    findings.push({ flag: "DUPLICATE_RESULTED", severity: "warning" });
  }

  const status = String(item.status ?? "");
  if (PENDING_STATUSES.has(status) && !hasResult && docMilestoneMs == null) {
    const anchorMs = itemMs ?? orderMs;
    if (anchorMs != null && nowMs - anchorMs > LAB_RAD_STALE_PENDING_MS) {
      findings.push({ flag: "STALE_PENDING", severity: "warning" });
    }
  }

  if (hasResult && !TERMINAL_RESULT_STATUSES.has(status) && !order?.id?.trim()) {
    findings.push({ flag: "ORPHAN_RESULT", severity: "warning" });
  } else if (hasResult && !TERMINAL_RESULT_STATUSES.has(status) && docMilestoneMs == null) {
    findings.push({ flag: "ORPHAN_RESULT", severity: "warning" });
  }

  if (docMilestoneMs != null && clinicalMilestoneAtMs != null && docMilestoneMs !== clinicalMilestoneAtMs) {
    if (utcDayKey(docMilestoneMs) !== utcDayKey(clinicalMilestoneAtMs)) {
      findings.push({ flag: "OVERNIGHT_TIMING", severity: "info" });
    }
  }
  if (result && resultDocumentedMs(result) != null) {
    const rDoc = resultDocumentedMs(result)!;
    const rClinical = resultClinicalMs(domain, result);
    if (rClinical != null && rDoc !== rClinical && utcDayKey(rDoc) !== utcDayKey(rClinical)) {
      if (!findings.some((f) => f.flag === "OVERNIGHT_TIMING")) {
        findings.push({ flag: "OVERNIGHT_TIMING", severity: "info" });
      }
    }
  }

  return findings;
}

export function labRadReconciliationFlags(findings: LabRadReconciliationFinding[]): LabRadReconciliationFlag[] {
  return findings.map((f) => f.flag);
}
