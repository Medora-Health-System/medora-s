/**
 * MEDUI.RES.2 — client projection for Lab / Radiology technician dashboard rows.
 */

import {
  ENTERPRISE_ORDER_ORIGINS,
  projectEnterpriseOrderOrigin,
  projectTechnicianWorkStatus,
  type EnterpriseOrderOrigin,
  type TechnicianWorkStatus,
  type TechnicianWorklistSortInput,
} from "@medora/shared";
import type { LabRadWorklistOperationalRow } from "@/features/orders/labRadiologyOperationalEscalationUi";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

export type LabRadTechnicianKind = "lab" | "radiology";

export type LabRadTechnicianProjectedRow = TechnicianWorklistSortInput & {
  itemId: string;
  orderId: string;
  order: Record<string, unknown>;
  item: Record<string, unknown>;
  workStatus: TechnicianWorkStatus;
  priority: string;
  origin: EnterpriseOrderOrigin;
  locationLabel: string | null;
  collectedAt: string | Date | null;
  modality: string | null;
  patientName: string;
  patientMrn: string;
  studyOrTestLabel: string;
  criticalValue: boolean;
  awaitingCriticalAck: boolean;
  awaitingFinalization: boolean;
  overdue: boolean;
  operational: LabRadWorklistOperationalRow;
};

export function fullPatientName(p: {
  firstName?: string | null;
  lastName?: string | null;
} | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
}

export function rowMatchesSearch(query: string, haystack: string): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  const b = haystack.toLowerCase();
  return t
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => b.includes(tok));
}

export function shortOrderId(orderId: string): string {
  const id = String(orderId ?? "").trim();
  if (!id) return DISPLAY_DASH;
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

export function resolveEnterpriseOrderOriginFromOrder(order: {
  enterpriseOrderOrigin?: string | null;
  enterpriseOrderLocationLabel?: string | null;
  encounter?: {
    type?: string | null;
    status?: string | null;
    billingClassification?: string | null;
    admissionSummaryJson?: unknown;
    admittedAt?: unknown;
    serviceLine?: string | null;
    nursingAssessment?: unknown;
    roomLabel?: string | null;
  } | null;
}): { origin: EnterpriseOrderOrigin; locationLabel: string | null } {
  const raw = String(order.enterpriseOrderOrigin ?? "")
    .trim()
    .toUpperCase();
  if ((ENTERPRISE_ORDER_ORIGINS as readonly string[]).includes(raw)) {
    const loc = String(order.enterpriseOrderLocationLabel ?? "").trim();
    return {
      origin: raw as EnterpriseOrderOrigin,
      locationLabel: loc || null,
    };
  }
  const enc = order.encounter;
  const projected = projectEnterpriseOrderOrigin({
    type: enc?.type,
    status: enc?.status,
    billingClassification: enc?.billingClassification,
    admissionSummaryJson: enc?.admissionSummaryJson,
    admittedAt: enc?.admittedAt,
    serviceLine: enc?.serviceLine,
    nursingAssessment: enc?.nursingAssessment,
    roomLabel: enc?.roomLabel,
  });
  return {
    origin: projected.origin,
    locationLabel:
      String(order.enterpriseOrderLocationLabel ?? "").trim() || projected.locationLabel,
  };
}

export function resolveItemModality(item: Record<string, unknown>): string | null {
  const catalog = item.catalogImagingStudy as { modality?: string | null } | null | undefined;
  const fromCatalog = String(catalog?.modality ?? "").trim();
  if (fromCatalog) return fromCatalog;
  const direct = String(item.modality ?? "").trim();
  return direct || null;
}

export function resolveCollectedAt(item: Record<string, unknown>): string | Date | null {
  const effective = item.effectiveCollectedAt;
  if (effective != null && String(effective).trim()) return effective as string | Date;
  const documented = item.documentedCollectedAt;
  if (documented != null && String(documented).trim()) return documented as string | Date;
  return null;
}

export function isOperationalOverdue(row: LabRadWorklistOperationalRow): boolean {
  const flags = row.escalation.escalationFlags;
  return (
    flags.includes("DELAYED") ||
    flags.includes("CRITICAL_DELAY") ||
    row.escalation.agingBucket === "DELAYED" ||
    row.escalation.agingBucket === "CRITICAL_DELAY"
  );
}

export function projectLabRadTechnicianRow(input: {
  order: any;
  item: any;
  operational: LabRadWorklistOperationalRow;
  studyOrTestLabel: string;
}): LabRadTechnicianProjectedRow {
  const { order, item, operational, studyOrTestLabel } = input;
  const patient = order.encounter?.patient;
  const { origin, locationLabel } = resolveEnterpriseOrderOriginFromOrder(order);
  const workStatus = projectTechnicianWorkStatus({
    itemStatus: item.status,
    orderStatus: order.status,
  });
  const completedAt =
    item.completedAt ?? item.documentedCompletedAt ?? item.result?.verifiedAt ?? null;
  const cancelledAt =
    workStatus === "CANCELLED" ? (item.updatedAt ?? order.updatedAt ?? order.createdAt) : null;

  return {
    itemId: String(item.id),
    orderId: String(order.id),
    order,
    item,
    workStatus,
    priority: String(order.priority ?? "ROUTINE"),
    origin,
    locationLabel,
    orderedAt: order.createdAt ?? null,
    completedAt,
    cancelledAt,
    collectedAt: resolveCollectedAt(item),
    modality: resolveItemModality(item),
    patientName: fullPatientName(patient),
    patientMrn: String(patient?.mrn ?? "").trim(),
    studyOrTestLabel,
    criticalValue: Boolean(item.result?.criticalValue),
    awaitingCriticalAck: Boolean(operational.escalation.awaitingCriticalAck),
    awaitingFinalization: Boolean(operational.escalation.awaitingResultOrFinalization),
    overdue: isOperationalOverdue(operational),
    operational,
  };
}
