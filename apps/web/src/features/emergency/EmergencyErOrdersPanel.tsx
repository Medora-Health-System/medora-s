"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchOrderEventsForEncounter, fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import type { SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { CancelOrderModal, CreateOrderModal, type CancelOrderConfirmPayload } from "@/components/orders";
import { EmergencyProcedureLauncherModal } from "@/features/emergency/EmergencyProcedureLauncherModal";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";
import { MedoraCard, MedoraCardInner } from "@/components/medora-card";
import { type ErOrderDomain } from "@/features/emergency/erOrderWorkspace";
import { TraumaProtocolAssistPanel } from "@/features/emergency/TraumaProtocolAssistPanel";
import {
  findMedicationInfusionTimelineFromOrderEvents,
  formatInfusionDurationForI18n,
  formatInfusionElapsedForI18n,
  isMedicationInfusionStopOrderEvent,
  isOrderItemActiveForErDashboard,
  isOrderItemCancellableLineForEr,
  isOrderItemCompletedForErDashboard,
  isParentOrderCancelled,
  medicationInfusionClassificationText,
  medicationRouteSnapshotForInfusionCheck,
  orderHasAnyActiveItemForEr,
  orderItemIdFromEventMetadata,
  shouldIncludeCompletedOrderEventInErMerge,
} from "@/features/emergency/erOrderLifecycleUi";
import { apiFetch } from "@/lib/apiClient";
import { startMedicationInfusion, stopMedicationInfusion } from "@/lib/medicationInfusionApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  documentationTemplateIdToLauncherStep,
  isMedicationInfusionCandidate,
  requestorMayAcknowledgeEnterpriseProcedure,
  requestorMayCompleteEnterpriseProcedure,
  resolveProcedureDocumentationLinkage,
  resolveProcedureBillingReadiness,
  resolveProcedureExecutionProfile,
  type EnterpriseProcedureDocumentationTemplateId,
} from "@medora/shared";
import { ProcedureExecutionCategoryBadge } from "@/components/clinical/ProcedureExecutionCategoryBadge";
import { ProcedureOrderDocumentationLinkage } from "@/components/clinical/ProcedureOrderDocumentationLinkage";
import { ProcedureBillingReadinessIndicator } from "@/components/clinical/ProcedureBillingReadinessIndicator";
import type { ErProcedureLauncherStep } from "@/features/emergency/erProcedureLauncherCatalog";
import {
  parseEncounterDocumentedProcedureTypes,
  procedureDocumentationCompletionReminderKey,
} from "@/lib/procedureOrderDocumentationLinkageUi";
import { formatCancellationReasonForDisplay } from "@/lib/orderCancelReasonDisplay";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatErOrderEventAttributionCell, formatOrderAttributionLines } from "@/lib/orderAttribution";
import {
  diagnosisOrdersDomainGridStyle,
  diagnosisOrdersDomainSummaryListStyle,
  diagnosisOrdersDomainSummaryTileStyle,
  diagnosisOrdersListStyle,
  diagnosisOrdersQuickActionGridStyle,
  diagnosisOrdersSectionDividerStyle,
  diagnosisOrdersTableScrollWrapStyle,
  diagnosisOrdersTableStyle,
  diagnosisOrdersUsesCardLayout,
  resolveDiagnosisOrdersLayoutMode,
  type DiagnosisOrdersLayoutMode,
} from "@/features/emergency/diagnosisOrdersResponsiveLayout";
import {
  ErOrderEventCard,
  ErOrderGroupHeaderCard,
  ErOrderLineCard,
  erOrdersTouchButtonStyle,
} from "@/features/emergency/ErOrdersPanelCards";

function careItemEnterpriseProcedureId(item: Record<string, unknown>): string | null {
  const value = item.enterpriseProcedureId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function careLineAllowsLifecycleAction(
  item: Record<string, unknown>,
  roles: string[] | undefined,
  action: "acknowledge" | "complete"
): boolean {
  if (hasAnyRole(roles, "ADMIN")) return true;
  const roleList = roles ?? [];
  const enterpriseProcedureId = careItemEnterpriseProcedureId(item);
  const profile = enterpriseProcedureId
    ? resolveProcedureExecutionProfile({ enterpriseProcedureId })
    : null;
  if (action === "complete") {
    return requestorMayCompleteEnterpriseProcedure(roleList, profile);
  }
  return requestorMayAcknowledgeEnterpriseProcedure(roleList, profile);
}

function deptAllowsOrderLineAction(
  orderType: string,
  catalogItemType: string,
  item: Record<string, unknown>,
  roles: string[] | undefined,
  action: "acknowledge" | "complete"
): boolean {
  if (orderType === "LAB") return hasAnyRole(roles, "LAB", "ADMIN");
  if (orderType === "IMAGING") return hasAnyRole(roles, "RADIOLOGY", "ADMIN");
  if (orderType === "MEDICATION") return hasAnyRole(roles, "PHARMACY", "ADMIN");
  if (catalogItemType === "SUPPLY") return hasAnyRole(roles, "RN", "ADMIN");
  if (orderType === "CARE") return careLineAllowsLifecycleAction(item, roles, action);
  return false;
}

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
  minHeight: 40,
};

const SCHEDULED_LINE_CANCEL_MS = 30_000;

type PendingLineCancel = {
  orderItemId: string;
  payload: CancelOrderConfirmPayload;
  expiresAt: number;
};

/** Compact × for scheduled line cancel (API deferred until timer or flush). */
const cancelOrderCompactX: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  minWidth: 32,
  padding: 0,
  borderRadius: 8,
  border: "1px solid #dc2626",
  backgroundColor: "#fef2f2",
  color: "#b91c1c",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const ordersTableTh: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 8px",
  fontSize: 11,
  color: "#0f172a",
  fontWeight: 700,
  borderBottom: "2px solid #475569",
  borderRight: "1px solid #cbd5e1",
  backgroundColor: "#e2e8f0",
};

const ordersTableTdBorder: React.CSSProperties = {
  borderRight: "1px solid #e2e8f0",
  borderBottom: "1px solid #cbd5e1",
};

const DOMAIN_ORDER: ErOrderDomain[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

function domainHeadingKey(d: ErOrderDomain): string {
  switch (d) {
    case "LAB":
      return "erEmergencyOrders.domainLab";
    case "IMAGING":
      return "erEmergencyOrders.domainImaging";
    case "MEDICATION":
      return "erEmergencyOrders.domainMedication";
    case "CARE":
      return "erEmergencyOrders.domainCare";
    default:
      return d;
  }
}

/** 4 domain boxes: active / pending lines only (exclude completed, resulted, verified, cancelled). */
function extractActiveLineLabelsForDomain(
  orders: unknown[],
  domain: ErOrderDomain,
  language: SupportedLanguage,
  tr: (k: string) => string
): string[] {
  const out: string[] = [];
  const typeStr =
    domain === "LAB"
      ? "LAB"
      : domain === "IMAGING"
        ? "IMAGING"
        : domain === "MEDICATION"
          ? "MEDICATION"
          : "CARE";
  for (const raw of orders) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const o = raw as Record<string, unknown>;
    if (o.type !== typeStr) continue;
    if (isParentOrderCancelled(o)) continue;
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items) {
      const row = it as Record<string, unknown>;
      if (!isOrderItemActiveForErDashboard(row)) continue;
      const label = getOrderItemDisplayLabelForLanguage(
        it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
        language,
        tr
      );
      if (label.trim()) out.push(label.trim());
    }
  }
  return out;
}

type EncounterPatientForOrder = {
  patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
};

type OrderRow = {
  id: string;
  type: ErOrderDomain;
  status: string;
  createdAt?: string | null;
  authority?: unknown;
  createdByDisplay?: unknown;
  lastActionDisplay?: unknown;
  cancellationReason?: string | null;
  items: unknown[];
};

type OrderEventRow = {
  id: string;
  orderId: string;
  eventType: "CREATED" | "STARTED" | "COMPLETED" | "CANCELLED";
  performedByDisplayName?: string | null;
  performedAt: string;
  roleSnapshot?: string | null;
  note?: string | null;
  metadata?: unknown;
  /** API: resolved catalog line label (English-first). */
  lineLabelEn?: string | null;
  /** API: resolved catalog line label (French-first). */
  lineLabelFr?: string | null;
  order?: {
    displayName?: string | null;
    cancellationReason?: string | null;
    type?: string | null;
  } | null;
};

function medicationDirectionsLine(notes: unknown, tr: (key: string) => string): string | null {
  const directions = typeof notes === "string" ? notes.trim() : "";
  if (!directions) return null;
  return tr("erEmergencyOrders.medicationDirections").replace("{directions}", directions);
}

function medicationRouteLine(item: Record<string, unknown>, tr: (key: string) => string): string | null {
  const catalogMedication = item.catalogMedication;
  const catalogRoute =
    catalogMedication && typeof catalogMedication === "object"
      ? String((catalogMedication as Record<string, unknown>).route ?? "").trim()
      : "";
  const route = typeof item.route === "string" ? item.route.trim() : catalogRoute;
  if (!route) return null;
  return tr("erEmergencyOrders.medicationRoute").replace("{route}", route);
}

function medicationDirectionsForEvent(
  event: OrderEventRow,
  orders: OrderRow[],
  tr: (key: string) => string
): string | null {
  const order = orders.find((row) => row.id === event.orderId);
  if (!order || order.type !== "MEDICATION") return null;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemId = orderItemIdFromEventMetadata(event.metadata);
  if (itemId) {
    const item = items.find((it) => String((it as Record<string, unknown>).id ?? "") === itemId) as
      | Record<string, unknown>
      | undefined;
    return medicationDirectionsLine(item?.notes, tr);
  }
  const directions = items
    .map((it) => medicationDirectionsLine((it as Record<string, unknown>).notes, tr))
    .filter((line): line is string => Boolean(line));
  return directions.length > 0 ? [...new Set(directions)].join(" · ") : null;
}

/** Tokens that must never beat a recoverable encounter-order line label. */
const GENERIC_ORDER_LINE_TITLE_TOKENS = new Set([
  "LAB_TEST",
  "IMAGING_STUDY",
  "MEDICATION",
  "CARE",
  "SUPPLY",
  "IVP",
]);

function isLikelyGenericOrderLineTitle(s: string): boolean {
  const v = s.trim();
  if (!v) return true;
  if (GENERIC_ORDER_LINE_TITLE_TOKENS.has(v)) return true;
  if (/^[A-Z][A-Z0-9_]+$/.test(v) && v.includes("_")) return true;
  return false;
}

function resolveOrderEventTitleFromEncounterOrders(
  e: OrderEventRow,
  language: SupportedLanguage,
  tr: (k: string) => string,
  orders: Pick<OrderRow, "id" | "items">[]
): string {
  const ord = orders.find((o) => o.id === e.orderId);
  if (!ord) return "";
  const rawItems = Array.isArray(ord.items) ? ord.items : [];
  const sorted = [...rawItems].sort((a, b) =>
    String((a as Record<string, unknown>).id ?? "").localeCompare(String((b as Record<string, unknown>).id ?? ""))
  );
  const oid = orderItemIdFromEventMetadata(e.metadata);
  const labelOne = (it: unknown) =>
    getOrderItemDisplayLabelForLanguage(
      it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
      language,
      tr
    ).trim();

  if (oid) {
    const it = sorted.find((x) => String((x as Record<string, unknown>).id ?? "") === oid);
    return it ? labelOne(it) : "";
  }
  const labels = sorted.map((it) => labelOne(it)).filter(Boolean);
  return [...new Set(labels)].join(" · ");
}

function eventLinePrimaryTitle(
  e: OrderEventRow,
  language: SupportedLanguage,
  tr: (k: string) => string,
  orders: Pick<OrderRow, "id" | "items">[]
): string {
  const en = typeof e.lineLabelEn === "string" ? e.lineLabelEn.trim() : "";
  const fr = typeof e.lineLabelFr === "string" ? e.lineLabelFr.trim() : "";
  const fromEncounter = resolveOrderEventTitleFromEncounterOrders(e, language, tr, orders).trim();
  const apiPreferred = language === "fr" ? fr || en : en || fr;
  const apiOk = apiPreferred.length > 0 && !isLikelyGenericOrderLineTitle(apiPreferred);
  if (apiOk) return apiPreferred;
  if (fromEncounter) return fromEncounter;
  if (apiPreferred) return apiPreferred;
  const legacy = e.order?.displayName?.trim();
  if (legacy) return legacy;
  return e.orderId.trim();
}

function lifecycleOutcomeSubLabel(metadata: unknown, tr: (k: string) => string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const lo = (metadata as { lifecycleOutcome?: unknown }).lifecycleOutcome;
  if (lo === "VERIFIED") return tr("orderEvent.resultVerified");
  if (lo === "RESULTED") return tr("orderEvent.resultRecorded");
  if (lo === "ACKNOWLEDGED") return tr("orderEvent.resultClinicianAcknowledged");
  return null;
}

function marActionOutcomeSubLabel(metadata: unknown, tr: (k: string) => string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const ma = (metadata as { marAction?: unknown }).marAction;
  if (ma === "administered") return tr("orderEvent.medicationCompleted");
  if (ma === "refused") return tr("orderEvent.medicationOutcomeRefused");
  if (ma === "not_available") return tr("orderEvent.medicationOutcomeNotAvailable");
  if (ma === "md_changed") return tr("orderEvent.medicationOutcomeMdChanged");
  return null;
}

function medicationCancellationSubLabel(e: OrderEventRow, tr: (k: string) => string): string | null {
  if (e.eventType !== "CANCELLED") return null;
  if (e.order?.type === "MEDICATION") return tr("orderEvent.medicationCancelled");
  if (e.order?.type === "CARE") return tr("orderEvent.careOrderCancelled");
  return null;
}

function orderLineItemStatusLabel(st: string, tr: (k: string) => string): string {
  const key = `encounterChrome.orderItemChart.${st}`;
  const resolved = tr(key);
  return resolved !== key ? resolved : st.trim() || "—";
}

function hasAnyRole(roles: string[] | undefined, ...codes: string[]): boolean {
  if (!roles?.length) return false;
  const set = new Set(roles.map((r) => String(r).toUpperCase()));
  for (const c of codes) {
    if (set.has(String(c).toUpperCase())) return true;
  }
  return false;
}

function itemStatusAllowsAcknowledge(st: string): boolean {
  return st === "PLACED" || st === "PENDING";
}

function itemStatusAllowsStart(st: string): boolean {
  return st === "ACKNOWLEDGED";
}

function itemStatusAllowsComplete(st: string): boolean {
  return st === "IN_PROGRESS";
}

function isBedsideAdministerMedicationRow(row: Record<string, unknown>): boolean {
  return (
    String(row.catalogItemType ?? "") === "MEDICATION" &&
    String(row.medicationFulfillmentIntent ?? "") === "ADMINISTER_CHART"
  );
}

/** CARE / procedure lines (order.type CARE) — distinct from lab/imaging result lifecycle subtitles. */
function careProcedureCompletedSubLabel(
  e: OrderEventRow,
  metadata: unknown,
  tr: (k: string) => string
): string | null {
  if (e.eventType !== "COMPLETED") return null;
  if (e.order?.type !== "CARE") return null;
  if (lifecycleOutcomeSubLabel(metadata, tr)) return null;
  return tr("orderEvent.careProcedureCompleted");
}

export function EmergencyErOrdersPanel({
  encounterId,
  facilityId,
  canPrescribe,
  encounterForOrderModal,
  onRefetchEncounter,
  onOrdersCreated,
  encounterType,
  vitalsJsonForTraumaProtocol,
  roles,
  cdsIntent,
  onConsumeIntent,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  encounterForOrderModal: EncounterPatientForOrder | null | undefined;
  onRefetchEncounter: () => Promise<void>;
  onOrdersCreated?: () => void | Promise<void>;
  /** Pour assistant protocole trauma (urgences + triage activé). Absent tant que le triage n&apos;est pas chargé. */
  encounterType?: string | null;
  vitalsJsonForTraumaProtocol?: unknown | null;
  roles?: string[];
  /** CDS v2 — one-shot preselect intent (workspace only). */
  cdsIntent?: string | null;
  onConsumeIntent?: () => void;
}) {
  const { t, language } = useI18n();
  const [layoutMode, setLayoutMode] = useState<DiagnosisOrdersLayoutMode>("desktopDense");
  const canUseRnOrderAuthority = hasAnyRole(roles, "RN") && !canPrescribe;
  const [ordersRaw, setOrdersRaw] = useState<unknown[] | null>(null);
  const [orderEventsRaw, setOrderEventsRaw] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [cancelBusyItemId, setCancelBusyItemId] = useState<string | null>(null);
  const [cancelLineModalItemId, setCancelLineModalItemId] = useState<string | null>(null);
  const [lineActionBusy, setLineActionBusy] = useState<string | null>(null);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProcedureLauncher, setShowProcedureLauncher] = useState(false);
  const [procedureLauncherInitialStep, setProcedureLauncherInitialStep] =
    useState<ErProcedureLauncherStep | null>(null);
  const [createModalInitialTab, setCreateModalInitialTab] = useState<OrderModalTab>("LAB");
  const [pendingCancel, setPendingCancel] = useState<PendingLineCancel | null>(null);
  const [scheduledSubmitFlash, setScheduledSubmitFlash] = useState<string | null>(null);
  const [orderInfusionError, setOrderInfusionError] = useState<string | null>(null);
  const pendingCancelRef = useRef<PendingLineCancel | null>(null);
  const scheduleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushInProgressRef = useRef(false);
  const flushPendingCancelRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveDiagnosisOrdersLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    pendingCancelRef.current = pendingCancel;
  }, [pendingCancel]);

  const [, setInfusionUiTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setInfusionUiTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setEventLoading(true);
      try {
        const [orders, events] = await Promise.all([
          fetchOrdersForEncounter(facilityId, encounterId),
          fetchOrderEventsForEncounter(facilityId, encounterId),
        ]);
        if (!cancelled) setOrdersRaw(Array.isArray(orders) ? orders : []);
        if (!cancelled) setOrderEventsRaw(Array.isArray(events) ? events : []);
      } catch {
        if (!cancelled) setOrdersRaw(null);
        if (!cancelled) setOrderEventsRaw(null);
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) setEventLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, ordersRefresh]);

  const labelsByDomain = useMemo(() => {
    if (!ordersRaw) return null;
    const rec: Record<ErOrderDomain, string[]> = {
      LAB: extractActiveLineLabelsForDomain(ordersRaw, "LAB", language, t),
      IMAGING: extractActiveLineLabelsForDomain(ordersRaw, "IMAGING", language, t),
      MEDICATION: extractActiveLineLabelsForDomain(ordersRaw, "MEDICATION", language, t),
      CARE: extractActiveLineLabelsForDomain(ordersRaw, "CARE", language, t),
    };
    return rec;
  }, [ordersRaw, language, t]);

  const openModal = (tab: OrderModalTab) => {
    setCreateModalInitialTab(tab);
    setShowCreateModal(true);
  };

  const parsedOrders = useMemo(() => {
    if (!Array.isArray(ordersRaw)) return [];
    return ordersRaw
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      .map((row) => ({
        id: String(row.id ?? ""),
        type: (row.type as ErOrderDomain) ?? "CARE",
        status: String(row.status ?? ""),
        createdAt: typeof row.createdAt === "string" ? row.createdAt : null,
        authority: row.authority ?? { source: row.source },
        createdByDisplay: row.createdByDisplay,
        lastActionDisplay: row.lastActionDisplay,
        cancellationReason: typeof row.cancellationReason === "string" ? row.cancellationReason : null,
        items: Array.isArray(row.items) ? row.items : [],
      }))
      .filter((o) => o.id);
  }, [ordersRaw]);

  const parsedEvents = useMemo((): OrderEventRow[] => {
    if (!Array.isArray(orderEventsRaw)) return [];
    return orderEventsRaw
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      .map((row) => ({
        id: String(row.id ?? ""),
        orderId: String(row.orderId ?? ""),
        eventType: String(row.eventType ?? "") as OrderEventRow["eventType"],
        performedByDisplayName:
          typeof row.performedByDisplayName === "string" ? row.performedByDisplayName : null,
        performedAt: String(row.performedAt ?? ""),
        roleSnapshot: typeof row.roleSnapshot === "string" ? row.roleSnapshot : null,
        note: typeof row.note === "string" ? row.note : null,
        metadata: row.metadata,
        lineLabelEn: typeof row.lineLabelEn === "string" ? row.lineLabelEn : null,
        lineLabelFr: typeof row.lineLabelFr === "string" ? row.lineLabelFr : null,
        order:
          row.order && typeof row.order === "object"
            ? ({
                displayName:
                  typeof (row.order as Record<string, unknown>).displayName === "string"
                    ? ((row.order as Record<string, unknown>).displayName as string)
                    : null,
                cancellationReason:
                  typeof (row.order as Record<string, unknown>).cancellationReason === "string"
                    ? ((row.order as Record<string, unknown>).cancellationReason as string)
                    : null,
                type:
                  typeof (row.order as Record<string, unknown>).type === "string"
                    ? ((row.order as Record<string, unknown>).type as string)
                    : null,
              } satisfies OrderEventRow["order"])
            : null,
      }))
      .filter((e) => e.id && e.orderId && e.performedAt);
  }, [orderEventsRaw]);

  const activeOrderGroups = useMemo(() => {
    return parsedOrders
      .filter((o) => orderHasAnyActiveItemForEr(o))
      .map((o) => ({
        order: o,
        lines: (Array.isArray(o.items) ? o.items : []).filter((it) =>
          isOrderItemActiveForErDashboard(it as Record<string, unknown>)
        ),
      }));
  }, [parsedOrders]);

  const careItemsWithEnterpriseProcedure = useMemo(() => {
    const out: Array<{ id: string; enterpriseProcedureId: string }> = [];
    for (const order of parsedOrders) {
      if (order.type !== "CARE") continue;
      for (const it of order.items) {
        const row = it as Record<string, unknown>;
        const id = String(row.id ?? "").trim();
        const enterpriseProcedureId = careItemEnterpriseProcedureId(row);
        if (!id || !enterpriseProcedureId) continue;
        out.push({ id, enterpriseProcedureId });
      }
    }
    return out;
  }, [parsedOrders]);

  const [documentedProcedureTypes, setDocumentedProcedureTypes] = useState<string[]>([]);

  useEffect(() => {
    if (!careItemsWithEnterpriseProcedure.length || !encounterId || !facilityId) {
      setDocumentedProcedureTypes([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/procedures`, { facilityId });
        if (!cancelled) {
          setDocumentedProcedureTypes(parseEncounterDocumentedProcedureTypes(data));
        }
      } catch {
        if (!cancelled) setDocumentedProcedureTypes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [careItemsWithEnterpriseProcedure.length, encounterId, facilityId, ordersRefresh]);


  const completedFromEvents = useMemo(
    () => parsedEvents.filter((e) => e.eventType === "COMPLETED"),
    [parsedEvents]
  );

  const completedFromEventsForMerge = useMemo(
    () => completedFromEvents.filter((e) => shouldIncludeCompletedOrderEventInErMerge(e, parsedOrders)),
    [completedFromEvents, parsedOrders]
  );

  /** Completed lines: events plus item-level fallback when no COMPLETED event exists for that line (e.g. legacy lab/imaging paths). */
  const completedRows = useMemo((): OrderEventRow[] => {
    const fromEvents = completedFromEventsForMerge;
    const coveredItemIds = new Set<string>();
    for (const e of fromEvents) {
      const oid = orderItemIdFromEventMetadata(e.metadata);
      if (oid) coveredItemIds.add(oid);
    }

    const fallback: OrderEventRow[] = [];
    for (const o of parsedOrders) {
      if (o.status === "CANCELLED") continue;
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const row = it as Record<string, unknown>;
        if (!isOrderItemCompletedForErDashboard(row)) continue;
        const itemId = String(row.id ?? "");
        if (!itemId || coveredItemIds.has(itemId)) continue;
        coveredItemIds.add(itemId);
        const nurse = row.completedByNurse as { firstName?: string; lastName?: string } | undefined;
        const performedByDisplayName = nurse
          ? `${nurse.firstName ?? ""} ${nurse.lastName ?? ""}`.trim() || null
          : null;
        const completedAt = row.completedAt;
        const updatedAt = row.updatedAt;
        const performedAt =
          completedAt instanceof Date
            ? completedAt.toISOString()
            : typeof completedAt === "string" && completedAt.trim()
              ? completedAt
              : updatedAt instanceof Date
                ? updatedAt.toISOString()
                : typeof updatedAt === "string" && updatedAt.trim()
                  ? updatedAt
                  : "";
        if (!performedAt) continue;
        fallback.push({
          id: `er-fallback-completed-${itemId}`,
          orderId: o.id,
          eventType: "COMPLETED",
          performedByDisplayName,
          performedAt,
          roleSnapshot: null,
          note: null,
          metadata: { orderItemId: itemId },
          order: {
            displayName: getOrderItemDisplayLabelForLanguage(
              it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
              language,
              t
            ),
            cancellationReason: null,
            type: o.type,
          },
        });
      }
    }

    return [...fromEvents, ...fallback].sort(
      (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
    );
  }, [completedFromEventsForMerge, parsedOrders, language, t]);

  const cancelledEvents = useMemo(
    () => parsedEvents.filter((e) => e.eventType === "CANCELLED"),
    [parsedEvents]
  );

  const flushPendingCancel = useCallback(async () => {
    const p = pendingCancelRef.current;
    if (!p || flushInProgressRef.current) return;
    flushInProgressRef.current = true;
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    pendingCancelRef.current = null;
    setPendingCancel(null);
    setCancelBusyItemId(p.orderItemId);
    try {
      await apiFetch(`/orders/items/${p.orderItemId}/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: p.payload.cancellationReason,
          ...(p.payload.cancellationDetails ? { cancellationDetails: p.payload.cancellationDetails } : {}),
        }),
      });
      setOrdersRefresh((x) => x + 1);
      setScheduledSubmitFlash(t("erEmergencyOrders.cancelUndoExpired"));
      window.setTimeout(() => setScheduledSubmitFlash(null), 5000);
    } finally {
      setCancelBusyItemId(null);
      flushInProgressRef.current = false;
    }
  }, [facilityId, t]);

  useEffect(() => {
    flushPendingCancelRef.current = flushPendingCancel;
  }, [flushPendingCancel]);

  const scheduleCancel = useCallback((orderItemId: string, payload: CancelOrderConfirmPayload) => {
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    const next: PendingLineCancel = {
      orderItemId,
      payload,
      expiresAt: Date.now() + SCHEDULED_LINE_CANCEL_MS,
    };
    pendingCancelRef.current = next;
    setPendingCancel(next);
    scheduleTimerRef.current = setTimeout(() => {
      scheduleTimerRef.current = null;
      void flushPendingCancelRef.current?.();
    }, SCHEDULED_LINE_CANCEL_MS);
  }, []);

  const undoCancel = useCallback(() => {
    if (scheduleTimerRef.current) {
      clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }
    pendingCancelRef.current = null;
    setPendingCancel(null);
  }, []);

  const confirmLineCancelFromModal = (payload: CancelOrderConfirmPayload) => {
    if (!cancelLineModalItemId) return;
    scheduleCancel(cancelLineModalItemId, payload);
    setCancelLineModalItemId(null);
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && pendingCancelRef.current) {
        void flushPendingCancelRef.current?.();
      }
    };
    const onPageHide = () => {
      if (pendingCancelRef.current) void flushPendingCancelRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scheduleTimerRef.current) {
        clearTimeout(scheduleTimerRef.current);
        scheduleTimerRef.current = null;
      }
      if (pendingCancelRef.current) {
        void flushPendingCancelRef.current?.();
      }
    };
  }, []);

  const runOrderItemLifecycleAction = async (itemId: string, op: "acknowledge" | "start" | "complete" | "nurse") => {
    const busyKey = `${itemId}:${op}`;
    setLineActionBusy(busyKey);
    setOrderInfusionError(null);
    let postCompleteDocReminderKey: string | null = null;
    if (op === "complete") {
      for (const order of parsedOrders) {
        if (order.type !== "CARE") continue;
        const item = order.items.find(
          (it) => String((it as Record<string, unknown>).id ?? "") === itemId
        ) as Record<string, unknown> | undefined;
        if (!item) continue;
        const enterpriseProcedureId = careItemEnterpriseProcedureId(item);
        if (!enterpriseProcedureId) continue;
        const linkage = resolveProcedureDocumentationLinkage({
          enterpriseProcedureId,
          orderItemId: itemId,
          orderStatus: "COMPLETED",
          documentedProcedureTypes,
        });
        postCompleteDocReminderKey = procedureDocumentationCompletionReminderKey(linkage.recommendedAction);
        break;
      }
    }
    try {
      const path =
        op === "nurse"
          ? `/orders/items/${itemId}/nurse-complete`
          : `/orders/items/${itemId}/${op === "acknowledge" ? "acknowledge" : op}`;
      await apiFetch(path, { method: "POST", facilityId });
      setOrdersRefresh((x) => x + 1);
      if (postCompleteDocReminderKey) {
        setScheduledSubmitFlash(t(postCompleteDocReminderKey));
        window.setTimeout(() => setScheduledSubmitFlash(null), 8000);
      }
    } finally {
      setLineActionBusy(null);
    }
  };

  const runInfusionAction = async (itemId: string, op: "start" | "stop") => {
    const busyKey = `${itemId}:infusion-${op}`;
    setLineActionBusy(busyKey);
    setOrderInfusionError(null);
    try {
      if (op === "start") await startMedicationInfusion(itemId, facilityId);
      else await stopMedicationInfusion(itemId, facilityId);
      setOrdersRefresh((x) => x + 1);
      setScheduledSubmitFlash(
        op === "start" ? t("erEmergencyOrders.infusionStarted") : t("erEmergencyOrders.infusionStopped")
      );
      window.setTimeout(() => setScheduledSubmitFlash(null), 5000);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setOrderInfusionError(
        normalizeUserFacingError(raw.trim() || null, language) || t("erEmergencyOrders.infusionActionError")
      );
    } finally {
      setLineActionBusy(null);
    }
  };

  const nowMs = Date.now();

  const touchBtn = (base: React.CSSProperties = btn) => erOrdersTouchButtonStyle(base, layoutMode);
  const usesOrderCards = diagnosisOrdersUsesCardLayout(layoutMode);
  const orderCardFieldLabels = {
    status: t("erEmergencyOrders.tableLastAction"),
    time: t("erEmergencyOrders.tableTime"),
    issued: t("erEmergencyOrders.tableIssued"),
    attribution: t("erEmergencyOrders.tableTitle"),
  };

  /** Quels rôles peuvent ouvrir une commande depuis ce panneau : prescripteurs (PROVIDER/ADMIN) + RN (ordres infirmiers / verbaux). LAB/RADIOLOGY/PHARMACY/FRONT_DESK/BILLING : non. */
  const canOpenOrderQuickActions = canPrescribe || hasAnyRole(roles, "RN");
  const canOpenProcedureDocumentation = canPrescribe || hasAnyRole(roles, "RN", "ADMIN");

  const openProcedureDocumentation = (step: ErProcedureLauncherStep) => {
    setProcedureLauncherInitialStep(step);
    setShowProcedureLauncher(true);
  };

  const renderCareExecutionCategoryBadge = (item: Record<string, unknown>) => {
    const enterpriseProcedureId = careItemEnterpriseProcedureId(item);
    if (!enterpriseProcedureId) return null;
    const profile = resolveProcedureExecutionProfile({ enterpriseProcedureId });
    if (!profile) return null;
    return <ProcedureExecutionCategoryBadge category={profile.executionRoleCategory} />;
  };

  const renderCareProcedureDocumentationLinkage = (
    item: Record<string, unknown> | undefined,
    orderItemId: string,
    orderStatus: string
  ) => {
    if (!item) return null;
    const enterpriseProcedureId = careItemEnterpriseProcedureId(item);
    if (!enterpriseProcedureId) return null;
    const linkage = resolveProcedureDocumentationLinkage({
      enterpriseProcedureId,
      orderItemId,
      orderStatus,
      documentedProcedureTypes,
    });
    const launcherStep = linkage.documentationTemplateId
      ? documentationTemplateIdToLauncherStep(
          linkage.documentationTemplateId as EnterpriseProcedureDocumentationTemplateId
        )
      : null;
    return (
      <ProcedureOrderDocumentationLinkage
        linkage={linkage}
        canOpenDocumentation={canOpenProcedureDocumentation}
        onOpenProcedureDocumentation={
          launcherStep
            ? () => openProcedureDocumentation(launcherStep as ErProcedureLauncherStep)
            : undefined
        }
      />
    );
  };

  const renderCareProcedureBillingReadiness = (
    item: Record<string, unknown> | undefined,
    orderStatus: string
  ) => {
    if (!item) return null;
    const enterpriseProcedureId = careItemEnterpriseProcedureId(item);
    if (!enterpriseProcedureId) return null;
    const readiness = resolveProcedureBillingReadiness({
      enterpriseProcedureId,
      orderItemStatus: orderStatus,
      documentedProcedureTypes,
      facilityChargeMasterLinked: false,
    });
    return <ProcedureBillingReadinessIndicator readiness={readiness} />;
  };

  return (
    <MedoraCard leftAccentColor="#7c3aed" variant="default">
      <MedoraCardInner>
        <div data-testid="er-orders-panel-layout" data-layout-mode={layoutMode}>
        {roles !== undefined && canOpenOrderQuickActions ? (
          <TraumaProtocolAssistPanel
            encounterId={encounterId}
            facilityId={facilityId}
            encounterType={encounterType}
            vitalsJson={vitalsJsonForTraumaProtocol ?? null}
            roles={roles}
            canPrescribe={canPrescribe}
            onRefetchEncounter={onRefetchEncounter}
            onOrdersApplied={async () => {
              setOrdersRefresh((x) => x + 1);
              await onOrdersCreated?.();
            }}
            cdsIntent={cdsIntent}
            onConsumeIntent={onConsumeIntent}
          />
        ) : null}
        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
        ) : labelsByDomain == null ? (
          <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{t("erEmergencyOrders.loadOrdersError")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: layoutMode === "tabletCard" ? 8 : 12, width: "100%" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: layoutMode === "tabletCard" ? 8 : 12,
                width: "100%",
                alignItems: "stretch",
              }}
            >
            {canOpenOrderQuickActions ? (
              <div style={diagnosisOrdersQuickActionGridStyle(layoutMode)}>
                <button type="button" onClick={() => openModal("LAB")} style={touchBtn()}>
                  {t("erEmergencyOrders.quickLab")}
                </button>
                <button type="button" onClick={() => openModal("IMAGING")} style={touchBtn()}>
                  {t("erEmergencyOrders.quickImaging")}
                </button>
                <button type="button" onClick={() => openModal("MEDICATION")} style={touchBtn()}>
                  {t("erEmergencyOrders.quickMedication")}
                </button>
                <button type="button" onClick={() => openModal("CARE")} style={touchBtn()}>
                  {t("erEmergencyOrders.quickCare")}
                </button>
              </div>
            ) : null}

            <div style={diagnosisOrdersDomainGridStyle(layoutMode)}>
              {DOMAIN_ORDER.map((d) => {
                const lines = labelsByDomain[d];
                const empty = lines.length === 0;
                return (
                  <div
                    key={d}
                    style={{
                      ...diagnosisOrdersDomainSummaryTileStyle(layoutMode),
                      border: empty ? "1px dashed #cbd5e1" : "1px solid #e2e8f0",
                      backgroundColor: empty ? "#fafafa" : "#fff",
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: empty ? 0 : 3 }}>{t(domainHeadingKey(d))}</div>
                    {empty ? (
                      <div style={{ color: "#64748b" }}>{t("erEmergencyOrders.emptyDomain")}</div>
                    ) : (
                      <ul style={diagnosisOrdersDomainSummaryListStyle(layoutMode)}>
                        {lines.slice(0, 12).map((line, i) => (
                          <li key={`${d}-${i}`} style={{ marginBottom: 2, overflowWrap: "anywhere", whiteSpace: "normal" }}>
                            {line}
                          </li>
                        ))}
                        {lines.length > 12 ? (
                          <li style={{ color: "#64748b", listStyle: "none", marginLeft: -14 }}>
                            {t("erEmergencyOrders.moreItems").replace(
                              "{count}",
                              String(lines.length - 12)
                            )}
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
            </div>

            <div style={diagnosisOrdersSectionDividerStyle(layoutMode)}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.openOrdersTitle")}
              </div>
              {pendingCancel ? (
                <div
                  role="status"
                  style={{
                    marginBottom: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #fcd34d",
                    background: "#fffbeb",
                    fontSize: 12,
                    color: "#78350f",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ flex: "1 1 220px" }}>{t("erEmergencyOrders.pendingCancel")}</span>
                  <button type="button" style={touchBtn()} onClick={undoCancel}>
                    {t("erEmergencyOrders.undoCancel")}
                  </button>
                  <button
                    type="button"
                    style={{
                      ...btn,
                      border: "1px solid #fcd34d",
                      backgroundColor: "#fff7ed",
                      color: "#9a3412",
                    }}
                    onClick={() => void flushPendingCancel()}
                  >
                    {t("erEmergencyOrders.cancelNow")}
                  </button>
                </div>
              ) : null}
              {orderInfusionError ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: 8,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    fontSize: 12,
                    color: "#991b1b",
                    lineHeight: 1.45,
                  }}
                >
                  {orderInfusionError}
                </div>
              ) : null}
              {scheduledSubmitFlash ? (
                <div
                  role="status"
                  style={{
                    marginBottom: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    fontSize: 12,
                    color: "#166534",
                  }}
                >
                  {scheduledSubmitFlash}
                </div>
              ) : null}
              {activeOrderGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.openOrdersEmpty")}</div>
              ) : usesOrderCards ? (
                <ul style={diagnosisOrdersListStyle(layoutMode)}>
                  {activeOrderGroups.map(({ order: o, lines }, groupIdx) => {
                    const authorityLine = formatOrderAuthority(o, t);
                    const attributionLines = formatOrderAttributionLines(o, t, language);
                    const issuedPrimary = attributionLines[0] ?? authorityLine;
                    const timeStr =
                      o.createdAt != null && String(o.createdAt).trim()
                        ? new Date(String(o.createdAt)).toLocaleString(language === "fr" ? "fr-FR" : "en-US")
                        : "—";
                    const categoryLabel = t(domainHeadingKey(o.type as ErOrderDomain));
                    return (
                      <React.Fragment key={o.id}>
                        <li
                          style={{
                            listStyle: "none",
                            minWidth: 0,
                            ...(layoutMode === "tabletCard" ? { gridColumn: "1 / -1" } : {}),
                          }}
                        >
                          <ErOrderGroupHeaderCard layoutMode={layoutMode}>
                            {categoryLabel} · {o.type}
                          </ErOrderGroupHeaderCard>
                        </li>
                        {lines.map((raw) => {
                              const item = raw as Record<string, unknown>;
                              const itemId = String(item.id ?? "");
                              const st = String(item.status ?? "");
                              const cat = String(item.catalogItemType ?? "");
                              const label = getOrderItemDisplayLabelForLanguage(
                                item as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
                                language,
                                t
                              );
                              const directionsLine =
                                o.type === "MEDICATION" ? medicationDirectionsLine(item.notes, t) : null;
                              const routeLine = o.type === "MEDICATION" ? medicationRouteLine(item, t) : null;
                              const busy = lineActionBusy;
                              const canAttemptLineCancel = hasAnyRole(
                                roles,
                                "RN",
                                "PROVIDER",
                                "LAB",
                                "RADIOLOGY",
                                "PHARMACY",
                                "ADMIN"
                              );
                              const linePendingCancel = pendingCancel?.orderItemId === itemId;
                              const showLineCancel =
                                canAttemptLineCancel && isOrderItemCancellableLineForEr(item);
                              const lineCancelDisabled =
                                cancelBusyItemId === itemId || pendingCancel !== null;
                              const routeSnapshot = medicationRouteSnapshotForInfusionCheck(item);
                              const catRow =
                                item.catalogMedication && typeof item.catalogMedication === "object"
                                  ? (item.catalogMedication as Record<string, unknown>)
                                  : null;
                              const isInfusionLifecycleMed =
                                isBedsideAdministerMedicationRow(item) &&
                                isMedicationInfusionCandidate({
                                  route: routeSnapshot.trim() || null,
                                  medicationLabel: medicationInfusionClassificationText(item) || null,
                                  code: typeof catRow?.code === "string" ? catRow.code : null,
                                  genericName: typeof catRow?.genericName === "string" ? catRow.genericName : null,
                                  metadata: null,
                                  catalogAdministrationType:
                                    typeof catRow?.administrationType === "string"
                                      ? catRow.administrationType
                                      : null,
                                });
                              const infusionTl = isInfusionLifecycleMed
                                ? findMedicationInfusionTimelineFromOrderEvents(parsedEvents, o.id, itemId)
                                : { active: null, lastCompleted: null };
                              const activeInfusion = infusionTl.active;

                              const lineBtns: React.ReactNode[] = [];
                              if (isInfusionLifecycleMed && hasAnyRole(roles, "RN", "ADMIN")) {
                                if (!activeInfusion) {
                                  lineBtns.push(
                                    <button
                                      key="infusion-start"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:infusion-start`}
                                      onClick={() => void runInfusionAction(itemId, "start")}
                                    >
                                      {busy === `${itemId}:infusion-start`
                                        ? t("erEmergencyOrders.infusionStarting")
                                        : t("erEmergencyOrders.startInfusion")}
                                    </button>
                                  );
                                } else {
                                  lineBtns.push(
                                    <button
                                      key="infusion-stop"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:infusion-stop`}
                                      onClick={() => void runInfusionAction(itemId, "stop")}
                                    >
                                      {busy === `${itemId}:infusion-stop`
                                        ? t("erEmergencyOrders.infusionStopping")
                                        : t("erEmergencyOrders.stopInfusion")}
                                    </button>
                                  );
                                }
                              } else if (isBedsideAdministerMedicationRow(item) && hasAnyRole(roles, "RN", "ADMIN")) {
                                lineBtns.push(
                                  <button
                                    key="nurse"
                                    type="button"
                                    style={touchBtn()}
                                    disabled={busy === `${itemId}:nurse`}
                                    onClick={() => void runOrderItemLifecycleAction(itemId, "nurse")}
                                  >
                                    {busy === `${itemId}:nurse`
                                      ? t("erEmergencyOrders.lineActionBusy")
                                      : t("erEmergencyOrders.nurseMarkBedsideComplete")}
                                  </button>
                                );
                              } else {
                                const deptOkAck = deptAllowsOrderLineAction(
                                  o.type,
                                  cat,
                                  item,
                                  roles,
                                  "acknowledge"
                                );
                                const deptOkComplete = deptAllowsOrderLineAction(
                                  o.type,
                                  cat,
                                  item,
                                  roles,
                                  "complete"
                                );
                                if (deptOkAck && itemStatusAllowsAcknowledge(st)) {
                                  lineBtns.push(
                                    <button
                                      key="ack"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:acknowledge`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "acknowledge")}
                                    >
                                      {busy === `${itemId}:acknowledge`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.acknowledgeOrder")}
                                    </button>
                                  );
                                }
                                if (deptOkAck && itemStatusAllowsStart(st)) {
                                  lineBtns.push(
                                    <button
                                      key="start"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:start`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "start")}
                                    >
                                      {busy === `${itemId}:start`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.startOrder")}
                                    </button>
                                  );
                                }
                                if (deptOkComplete && itemStatusAllowsComplete(st)) {
                                  lineBtns.push(
                                    <button
                                      key="complete"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:complete`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "complete")}
                                    >
                                      {busy === `${itemId}:complete`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.completeOrder")}
                                    </button>
                                  );
                                }
                              }
                              const activeStatusSection =
                                isInfusionLifecycleMed && activeInfusion ? (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#0369a1",
                                      lineHeight: 1.45,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4,
                                    }}
                                  >
                                    <div style={{ fontWeight: 700 }}>
                                      {t("infusionTimeline.infusionStatusInfusing")}
                                    </div>
                                    {activeInfusion.infusionStartedAtIso ? (
                                      <div style={{ color: "#0c4a6e" }}>
                                        {t("infusionTimeline.infusionStartedAt").replace(
                                          "{at}",
                                          new Date(activeInfusion.infusionStartedAtIso).toLocaleString(
                                            language === "fr" ? "fr-FR" : "en-US",
                                            { dateStyle: "short", timeStyle: "short" }
                                          )
                                        )}
                                      </div>
                                    ) : null}
                                    {(() => {
                                      const startedMs = activeInfusion.infusionStartedAtIso
                                        ? new Date(activeInfusion.infusionStartedAtIso).getTime()
                                        : NaN;
                                      if (Number.isNaN(startedMs)) return null;
                                      return (
                                        <div style={{ color: "#0c4a6e" }}>
                                          {formatInfusionElapsedForI18n(nowMs - startedMs, t)}
                                        </div>
                                      );
                                    })()}
                                    {(() => {
                                      const byParts = [
                                        activeInfusion.startedByDisplayName,
                                        activeInfusion.startedByTitle,
                                      ].filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
                                      if (!byParts.length) return null;
                                      return (
                                        <div style={{ color: "#0c4a6e" }}>
                                          {t("infusionTimeline.infusionStartedBy").replace(
                                            "{by}",
                                            byParts.join(t("infusionTimeline.infusionTimelineDivider"))
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  orderLineItemStatusLabel(st, t)
                                );
                              const activePendingCancelSection = linePendingCancel ? (
                                <div
                                  style={{
                                    marginTop: 8,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 9999,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: "#92400e",
                                      background: "#fef3c7",
                                      border: "1px solid #fcd34d",
                                    }}
                                  >
                                    {t("erEmergencyOrders.pendingCancelLine")}
                                  </span>
                                  <button type="button" style={touchBtn()} onClick={undoCancel}>
                                    {t("erEmergencyOrders.undoCancel")}
                                  </button>
                                </div>
                              ) : null;
                              const activeCancelControl = showLineCancel ? (
                                <button
                                  type="button"
                                  style={erOrdersTouchButtonStyle(
                                    {
                                      ...cancelOrderCompactX,
                                      ...(lineCancelDisabled ? { opacity: 0.45, cursor: "not-allowed" } : {}),
                                    },
                                    layoutMode
                                  )}
                                  disabled={lineCancelDisabled}
                                  title={t("cancelOrderModal.cancelOrderLineAria")}
                                  aria-label={t("cancelOrderModal.cancelOrderLineAria")}
                                  aria-busy={cancelBusyItemId === itemId}
                                  onClick={() => {
                                    if (lineCancelDisabled) return;
                                    setCancelLineModalItemId(itemId);
                                  }}
                                >
                                  <span aria-hidden>{cancelBusyItemId === itemId ? "…" : "×"}</span>
                                </button>
                              ) : null;
                              return (
                                <li key={itemId} style={{ minWidth: 0, listStyle: "none" }}>
                                  <ErOrderLineCard
                                    layoutMode={layoutMode}
                                    categoryLabel={categoryLabel}
                                    issuedPrimary={issuedPrimary}
                                    timeStr={timeStr}
                                    orderTitle={label}
                                    orderSubLines={
                                      <>
                                        {routeLine ? (
                                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{routeLine}</div>
                                        ) : null}
                                        {directionsLine ? (
                                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                                        ) : null}
                                        {o.type === "CARE"
                                          ? renderCareExecutionCategoryBadge(item)
                                          : null}
                                        {o.type === "CARE"
                                          ? renderCareProcedureDocumentationLinkage(item, itemId, st)
                                          : null}
                                        {o.type === "CARE"
                                          ? renderCareProcedureBillingReadiness(item, st)
                                          : null}
                                      </>
                                    }
                                    statusSection={activeStatusSection}
                                    titleSection={authorityLine}
                                    actions={
                                      lineBtns.length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{lineBtns}</div>
                                      ) : null
                                    }
                                    cancelControl={activeCancelControl}
                                    pendingCancelSection={activePendingCancelSection}
                                    highlightPending={linePendingCancel}
                                    fieldLabels={orderCardFieldLabels}
                                  />
                                </li>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                </ul>
              ) : (
                <div style={diagnosisOrdersTableScrollWrapStyle(layoutMode)}>
                  <table style={diagnosisOrdersTableStyle(layoutMode, 720)}>
                    <thead>
                      <tr>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableCategory")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableIssued")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableTime")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableOrder")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableLastAction")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableTitle")}
                        </th>
                        <th
                          scope="col"
                          aria-label={t("cancelOrderModal.cancelOrderLineAria")}
                          title={t("cancelOrderModal.cancelOrderLineAria")}
                          style={{ ...ordersTableTh, borderRight: "none", width: 44, textAlign: "center", color: "#64748b" }}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {activeOrderGroups.map(({ order: o, lines }, groupIdx) => {
                        const authorityLine = formatOrderAuthority(o, t);
                        const attributionLines = formatOrderAttributionLines(o, t, language);
                        const issuedPrimary = attributionLines[0] ?? authorityLine;
                        const timeStr =
                          o.createdAt != null && String(o.createdAt).trim()
                            ? new Date(String(o.createdAt)).toLocaleString(language === "fr" ? "fr-FR" : "en-US")
                            : "—";
                        const categoryLabel = t(domainHeadingKey(o.type as ErOrderDomain));
                        return (
                          <React.Fragment key={o.id}>
                            <tr
                              style={{
                                background: "#f1f5f9",
                                borderTop: groupIdx > 0 ? "3px solid #475569" : "2px solid #cbd5e1",
                              }}
                            >
                              <td
                                colSpan={7}
                                style={{
                                  ...ordersTableTdBorder,
                                  padding: "8px 10px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  borderRight: "none",
                                }}
                              >
                                <span>
                                  {categoryLabel} · {o.type}
                                </span>
                              </td>
                            </tr>
                            {lines.map((raw) => {
                              const item = raw as Record<string, unknown>;
                              const itemId = String(item.id ?? "");
                              const st = String(item.status ?? "");
                              const cat = String(item.catalogItemType ?? "");
                              const label = getOrderItemDisplayLabelForLanguage(
                                item as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
                                language,
                                t
                              );
                              const directionsLine =
                                o.type === "MEDICATION" ? medicationDirectionsLine(item.notes, t) : null;
                              const routeLine = o.type === "MEDICATION" ? medicationRouteLine(item, t) : null;
                              const busy = lineActionBusy;
                              const canAttemptLineCancel = hasAnyRole(
                                roles,
                                "RN",
                                "PROVIDER",
                                "LAB",
                                "RADIOLOGY",
                                "PHARMACY",
                                "ADMIN"
                              );
                              const linePendingCancel = pendingCancel?.orderItemId === itemId;
                              const showLineCancel =
                                canAttemptLineCancel && isOrderItemCancellableLineForEr(item);
                              const lineCancelDisabled =
                                cancelBusyItemId === itemId || pendingCancel !== null;
                              const routeSnapshot = medicationRouteSnapshotForInfusionCheck(item);
                              const catRow =
                                item.catalogMedication && typeof item.catalogMedication === "object"
                                  ? (item.catalogMedication as Record<string, unknown>)
                                  : null;
                              const isInfusionLifecycleMed =
                                isBedsideAdministerMedicationRow(item) &&
                                isMedicationInfusionCandidate({
                                  route: routeSnapshot.trim() || null,
                                  medicationLabel: medicationInfusionClassificationText(item) || null,
                                  code: typeof catRow?.code === "string" ? catRow.code : null,
                                  genericName: typeof catRow?.genericName === "string" ? catRow.genericName : null,
                                  metadata: null,
                                  catalogAdministrationType:
                                    typeof catRow?.administrationType === "string"
                                      ? catRow.administrationType
                                      : null,
                                });
                              const infusionTl = isInfusionLifecycleMed
                                ? findMedicationInfusionTimelineFromOrderEvents(parsedEvents, o.id, itemId)
                                : { active: null, lastCompleted: null };
                              const activeInfusion = infusionTl.active;

                              const lineBtns: React.ReactNode[] = [];
                              if (isInfusionLifecycleMed && hasAnyRole(roles, "RN", "ADMIN")) {
                                if (!activeInfusion) {
                                  lineBtns.push(
                                    <button
                                      key="infusion-start"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:infusion-start`}
                                      onClick={() => void runInfusionAction(itemId, "start")}
                                    >
                                      {busy === `${itemId}:infusion-start`
                                        ? t("erEmergencyOrders.infusionStarting")
                                        : t("erEmergencyOrders.startInfusion")}
                                    </button>
                                  );
                                } else {
                                  lineBtns.push(
                                    <button
                                      key="infusion-stop"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:infusion-stop`}
                                      onClick={() => void runInfusionAction(itemId, "stop")}
                                    >
                                      {busy === `${itemId}:infusion-stop`
                                        ? t("erEmergencyOrders.infusionStopping")
                                        : t("erEmergencyOrders.stopInfusion")}
                                    </button>
                                  );
                                }
                              } else if (isBedsideAdministerMedicationRow(item) && hasAnyRole(roles, "RN", "ADMIN")) {
                                lineBtns.push(
                                  <button
                                    key="nurse"
                                    type="button"
                                    style={touchBtn()}
                                    disabled={busy === `${itemId}:nurse`}
                                    onClick={() => void runOrderItemLifecycleAction(itemId, "nurse")}
                                  >
                                    {busy === `${itemId}:nurse`
                                      ? t("erEmergencyOrders.lineActionBusy")
                                      : t("erEmergencyOrders.nurseMarkBedsideComplete")}
                                  </button>
                                );
                              } else {
                                const deptOkAck = deptAllowsOrderLineAction(
                                  o.type,
                                  cat,
                                  item,
                                  roles,
                                  "acknowledge"
                                );
                                const deptOkComplete = deptAllowsOrderLineAction(
                                  o.type,
                                  cat,
                                  item,
                                  roles,
                                  "complete"
                                );
                                if (deptOkAck && itemStatusAllowsAcknowledge(st)) {
                                  lineBtns.push(
                                    <button
                                      key="ack"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:acknowledge`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "acknowledge")}
                                    >
                                      {busy === `${itemId}:acknowledge`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.acknowledgeOrder")}
                                    </button>
                                  );
                                }
                                if (deptOkAck && itemStatusAllowsStart(st)) {
                                  lineBtns.push(
                                    <button
                                      key="start"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:start`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "start")}
                                    >
                                      {busy === `${itemId}:start`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.startOrder")}
                                    </button>
                                  );
                                }
                                if (deptOkComplete && itemStatusAllowsComplete(st)) {
                                  lineBtns.push(
                                    <button
                                      key="complete"
                                      type="button"
                                      style={touchBtn()}
                                      disabled={busy === `${itemId}:complete`}
                                      onClick={() => void runOrderItemLifecycleAction(itemId, "complete")}
                                    >
                                      {busy === `${itemId}:complete`
                                        ? t("erEmergencyOrders.lineActionBusy")
                                        : t("erEmergencyOrders.completeOrder")}
                                    </button>
                                  );
                                }
                              }
                              return (
                                <tr
                                  key={itemId}
                                  style={{
                                    verticalAlign: "top",
                                    ...(linePendingCancel ? { background: "rgba(254, 243, 199, 0.28)" } : {}),
                                  }}
                                >
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#334155", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                    {categoryLabel}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#64748b", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: 200 }}>
                                    {issuedPrimary}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#64748b", whiteSpace: "nowrap" }}>
                                    {timeStr}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#0f172a", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: 280 }}>
                                    <div style={{ fontWeight: 600 }}>{label}</div>
                                    {routeLine ? (
                                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{routeLine}</div>
                                    ) : null}
                                    {directionsLine ? (
                                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                                    ) : null}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#334155", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                                    <div style={{ marginBottom: lineBtns.length > 0 || isInfusionLifecycleMed ? 6 : 0 }}>
                                      {isInfusionLifecycleMed && activeInfusion ? (
                                        <div style={{ fontSize: 12, color: "#0369a1", lineHeight: 1.45, display: "flex", flexDirection: "column", gap: 4 }}>
                                          <div style={{ fontWeight: 700 }}>{t("infusionTimeline.infusionStatusInfusing")}</div>
                                          {activeInfusion.infusionStartedAtIso ? (
                                            <div style={{ color: "#0c4a6e" }}>
                                              {t("infusionTimeline.infusionStartedAt").replace(
                                                "{at}",
                                                new Date(activeInfusion.infusionStartedAtIso).toLocaleString(
                                                  language === "fr" ? "fr-FR" : "en-US",
                                                  { dateStyle: "short", timeStyle: "short" }
                                                )
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : (
                                        orderLineItemStatusLabel(st, t)
                                      )}
                                    </div>
                                    {lineBtns.length > 0 ? (
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{lineBtns}</div>
                                    ) : null}
                                    {linePendingCancel ? (
                                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 9999, fontSize: 11, fontWeight: 600, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" }}>
                                          {t("erEmergencyOrders.pendingCancelLine")}
                                        </span>
                                        <button type="button" style={touchBtn()} onClick={undoCancel}>
                                          {t("erEmergencyOrders.undoCancel")}
                                        </button>
                                      </div>
                                    ) : null}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "8px 8px", color: "#64748b", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: 220 }}>
                                    {authorityLine}
                                  </td>
                                  <td style={{ ...ordersTableTdBorder, padding: "6px 8px", textAlign: "center", verticalAlign: "middle", borderRight: "none" }}>
                                    {showLineCancel ? (
                                      <button
                                        type="button"
                                        style={{
                                          ...cancelOrderCompactX,
                                          ...(lineCancelDisabled ? { opacity: 0.45, cursor: "not-allowed" } : {}),
                                        }}
                                        disabled={lineCancelDisabled}
                                        title={t("cancelOrderModal.cancelOrderLineAria")}
                                        aria-label={t("cancelOrderModal.cancelOrderLineAria")}
                                        aria-busy={cancelBusyItemId === itemId}
                                        onClick={() => {
                                          if (lineCancelDisabled) return;
                                          setCancelLineModalItemId(itemId);
                                        }}
                                      >
                                        <span aria-hidden>{cancelBusyItemId === itemId ? "…" : "×"}</span>
                                      </button>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={diagnosisOrdersSectionDividerStyle(layoutMode)}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.completedOrdersTitle")}
              </div>
              {eventLoading ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</div>
              ) : completedRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.completedOrdersEmpty")}</div>
              ) : usesOrderCards ? (
                <ul style={diagnosisOrdersListStyle(layoutMode)}>
                  {completedRows.map((e) => {
                    const outcomeLine = lifecycleOutcomeSubLabel(e.metadata, t);
                    const marLine = marActionOutcomeSubLabel(e.metadata, t);
                    const careProcLine = careProcedureCompletedSubLabel(e, e.metadata, t);
                    const secondaryLine = outcomeLine ?? marLine ?? careProcLine;
                    const itemIdEv = orderItemIdFromEventMetadata(e.metadata);
                    const metaRec =
                      e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
                        ? (e.metadata as Record<string, unknown>)
                        : null;
                    const stopSk =
                      metaRec && typeof metaRec.infusionSessionKey === "string" ? metaRec.infusionSessionKey : null;
                    let infusionStopTimeline: ReturnType<
                      typeof findMedicationInfusionTimelineFromOrderEvents
                    >["lastCompleted"] = null;
                    if (isMedicationInfusionStopOrderEvent(e) && itemIdEv && e.orderId && stopSk) {
                      const tl = findMedicationInfusionTimelineFromOrderEvents(parsedEvents, e.orderId, itemIdEv);
                      if (tl.lastCompleted?.infusionSessionKey === stopSk) {
                        infusionStopTimeline = tl.lastCompleted;
                      }
                    }
                    const directionsLine = medicationDirectionsForEvent(e, parsedOrders, t);
                    const completedOrder = parsedOrders.find((order) => order.id === e.orderId);
                    const authorityLine = completedOrder ? formatOrderAuthority(completedOrder, t) : null;
                    const attributionLines = completedOrder
                      ? formatOrderAttributionLines(completedOrder, t, language)
                      : [];
                    const issuedPrimary = attributionLines[0] ?? authorityLine ?? "—";
                    const typeKey = (completedOrder?.type ?? e.order?.type ?? "CARE") as ErOrderDomain;
                    const categoryLabel = t(domainHeadingKey(typeKey));
                    const primaryTitle = eventLinePrimaryTitle(e, language, t, parsedOrders);
                    const performedWhen = new Date(e.performedAt).toLocaleString(
                      language === "fr" ? "fr-FR" : "en-US"
                    );
                    const titleCell = formatErOrderEventAttributionCell(completedOrder, e, t, language);
                    const statusSection = infusionStopTimeline ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          fontSize: 12,
                          color: "#134e4a",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#0f766e" }}>
                          {t("infusionTimeline.infusionCompleted")}
                        </span>
                        <span>
                          {t("infusionTimeline.infusionStartedAt").replace(
                            "{at}",
                            infusionStopTimeline.infusionStartedAtIso &&
                              !Number.isNaN(new Date(infusionStopTimeline.infusionStartedAtIso).getTime())
                              ? new Date(infusionStopTimeline.infusionStartedAtIso).toLocaleString(
                                  language === "fr" ? "fr-FR" : "en-US",
                                  { dateStyle: "short", timeStyle: "short" }
                                )
                              : t("common.dash")
                          )}
                        </span>
                        <span>
                          {t("infusionTimeline.infusionStoppedAt").replace(
                            "{at}",
                            infusionStopTimeline.infusionStoppedAtIso &&
                              !Number.isNaN(new Date(infusionStopTimeline.infusionStoppedAtIso).getTime())
                              ? new Date(infusionStopTimeline.infusionStoppedAtIso).toLocaleString(
                                  language === "fr" ? "fr-FR" : "en-US",
                                  { dateStyle: "short", timeStyle: "short" }
                                )
                              : t("common.dash")
                          )}
                        </span>
                        <span>{formatInfusionDurationForI18n(infusionStopTimeline.durationMinutes, t)}</span>
                      </div>
                    ) : (
                      secondaryLine ?? t("orderEvent.completed")
                    );
                    const titleSection = (
                      <>
                        <div>{titleCell}</div>
                        {authorityLine ? <div style={{ fontSize: 11, marginTop: 4 }}>{authorityLine}</div> : null}
                        {attributionLines.slice(1).map((line) => (
                          <div key={line} style={{ fontSize: 11, marginTop: 4 }}>
                            {line}
                          </div>
                        ))}
                      </>
                    );
                    const completedItemRow =
                      itemIdEv && completedOrder
                        ? (completedOrder.items.find(
                            (it) => String((it as Record<string, unknown>).id ?? "") === itemIdEv
                          ) as Record<string, unknown> | undefined)
                        : undefined;
                    return (
                      <li key={e.id} style={{ minWidth: 0, listStyle: "none" }}>
                        <ErOrderEventCard
                          layoutMode={layoutMode}
                          categoryLabel={categoryLabel}
                          issuedPrimary={issuedPrimary}
                          timeStr={performedWhen}
                          orderTitle={primaryTitle}
                          orderSubLines={
                            <>
                              {directionsLine ? (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                              ) : null}
                              {typeKey === "CARE" && itemIdEv
                                ? renderCareProcedureDocumentationLinkage(
                                    completedItemRow,
                                    itemIdEv,
                                    String(completedItemRow?.status ?? "COMPLETED")
                                  )
                                : null}
                              {typeKey === "CARE" && completedItemRow
                                ? renderCareProcedureBillingReadiness(
                                    completedItemRow,
                                    String(completedItemRow?.status ?? "COMPLETED")
                                  )
                                : null}
                            </>
                          }
                          statusSection={statusSection}
                          titleSection={titleSection}
                          fieldLabels={orderCardFieldLabels}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={diagnosisOrdersTableScrollWrapStyle(layoutMode)}>
                  <table style={diagnosisOrdersTableStyle(layoutMode, 640)}>
                    <thead>
                      <tr>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableCategory")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableIssued")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableTime")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableOrder")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableLastAction")}
                        </th>
                        <th scope="col" style={{ ...ordersTableTh, borderRight: "none" }}>
                          {t("erEmergencyOrders.tableTitle")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedRows.map((e) => {
                        const outcomeLine = lifecycleOutcomeSubLabel(e.metadata, t);
                        const marLine = marActionOutcomeSubLabel(e.metadata, t);
                        const careProcLine = careProcedureCompletedSubLabel(e, e.metadata, t);
                        const secondaryLine = outcomeLine ?? marLine ?? careProcLine;
                        const itemIdEv = orderItemIdFromEventMetadata(e.metadata);
                        const metaRec =
                          e.metadata && typeof e.metadata === "object" && !Array.isArray(e.metadata)
                            ? (e.metadata as Record<string, unknown>)
                            : null;
                        const stopSk =
                          metaRec && typeof metaRec.infusionSessionKey === "string"
                            ? metaRec.infusionSessionKey
                            : null;
                        let infusionStopTimeline: ReturnType<
                          typeof findMedicationInfusionTimelineFromOrderEvents
                        >["lastCompleted"] = null;
                        if (isMedicationInfusionStopOrderEvent(e) && itemIdEv && e.orderId && stopSk) {
                          const tl = findMedicationInfusionTimelineFromOrderEvents(
                            parsedEvents,
                            e.orderId,
                            itemIdEv
                          );
                          if (tl.lastCompleted?.infusionSessionKey === stopSk) {
                            infusionStopTimeline = tl.lastCompleted;
                          }
                        }
                        const directionsLine = medicationDirectionsForEvent(e, parsedOrders, t);
                        const completedOrder = parsedOrders.find((order) => order.id === e.orderId);
                        const authorityLine = completedOrder ? formatOrderAuthority(completedOrder, t) : null;
                        const attributionLines = completedOrder ? formatOrderAttributionLines(completedOrder, t, language) : [];
                        const issuedPrimary = attributionLines[0] ?? authorityLine ?? "—";
                        const typeKey = (completedOrder?.type ?? e.order?.type ?? "CARE") as ErOrderDomain;
                        const categoryLabel = t(domainHeadingKey(typeKey));
                        const primaryTitle = eventLinePrimaryTitle(e, language, t, parsedOrders);
                        const performedWhen = new Date(e.performedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US");
                        const titleCell = formatErOrderEventAttributionCell(completedOrder, e, t, language);
                        return (
                          <tr key={e.id} style={{ verticalAlign: "top" }}>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#334155",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {categoryLabel}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 200,
                              }}
                            >
                              {issuedPrimary}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {performedWhen}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#0f172a",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 280,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{primaryTitle}</div>
                              {directionsLine ? (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                              ) : null}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#334155",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {infusionStopTimeline ? (
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                    fontSize: 12,
                                    color: "#134e4a",
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: "#0f766e" }}>
                                    {t("infusionTimeline.infusionCompleted")}
                                  </span>
                                  <span>
                                    {t("infusionTimeline.infusionStartedAt").replace(
                                      "{at}",
                                      infusionStopTimeline.infusionStartedAtIso &&
                                        !Number.isNaN(new Date(infusionStopTimeline.infusionStartedAtIso).getTime())
                                        ? new Date(infusionStopTimeline.infusionStartedAtIso).toLocaleString(
                                            language === "fr" ? "fr-FR" : "en-US",
                                            { dateStyle: "short", timeStyle: "short" }
                                          )
                                        : t("common.dash")
                                    )}
                                  </span>
                                  <span>
                                    {t("infusionTimeline.infusionStoppedAt").replace(
                                      "{at}",
                                      infusionStopTimeline.infusionStoppedAtIso &&
                                        !Number.isNaN(new Date(infusionStopTimeline.infusionStoppedAtIso).getTime())
                                        ? new Date(infusionStopTimeline.infusionStoppedAtIso).toLocaleString(
                                            language === "fr" ? "fr-FR" : "en-US",
                                            { dateStyle: "short", timeStyle: "short" }
                                          )
                                        : t("common.dash")
                                    )}
                                  </span>
                                  <span>{formatInfusionDurationForI18n(infusionStopTimeline.durationMinutes, t)}</span>
                                  <span>
                                    {t("infusionTimeline.infusionStartedBy").replace(
                                      "{by}",
                                      (() => {
                                        const parts = [
                                          infusionStopTimeline.startedByDisplayName,
                                          infusionStopTimeline.startedByTitle,
                                        ].filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
                                        return parts.length
                                          ? parts.join(t("infusionTimeline.infusionTimelineDivider"))
                                          : t("common.dash");
                                      })()
                                    )}
                                  </span>
                                  <span>
                                    {t("infusionTimeline.infusionStoppedBy").replace(
                                      "{by}",
                                      (() => {
                                        const parts = [
                                          infusionStopTimeline.stoppedByDisplayName,
                                          infusionStopTimeline.stoppedByTitle,
                                        ].filter((x): x is string => typeof x === "string" && Boolean(x.trim()));
                                        return parts.length
                                          ? parts.join(t("infusionTimeline.infusionTimelineDivider"))
                                          : t("common.dash");
                                      })()
                                    )}
                                  </span>
                                </div>
                              ) : (
                                secondaryLine ?? t("orderEvent.completed")
                              )}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 220,
                                borderRight: "none",
                              }}
                            >
                              <div>{titleCell}</div>
                              {authorityLine ? (
                                <div style={{ fontSize: 11, marginTop: 4 }}>{authorityLine}</div>
                              ) : null}
                              {attributionLines.slice(1).map((line) => (
                                <div key={line} style={{ fontSize: 11, marginTop: 4 }}>
                                  {line}
                                </div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={diagnosisOrdersSectionDividerStyle(layoutMode)}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.cancelledOrdersTitle")}
              </div>
              {eventLoading ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</div>
              ) : cancelledEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.cancelledOrdersEmpty")}</div>
              ) : usesOrderCards ? (
                <ul style={diagnosisOrdersListStyle(layoutMode)}>
                  {cancelledEvents.map((e) => {
                    const medCancelLine = medicationCancellationSubLabel(e, t);
                    const directionsLine = medicationDirectionsForEvent(e, parsedOrders, t);
                    const cancelledOrder = parsedOrders.find((order) => order.id === e.orderId);
                    const authorityLine = cancelledOrder ? formatOrderAuthority(cancelledOrder, t) : null;
                    const attributionLines = cancelledOrder
                      ? formatOrderAttributionLines(cancelledOrder, t, language)
                      : [];
                    const issuedPrimary = attributionLines[0] ?? authorityLine ?? "—";
                    const typeKey = (cancelledOrder?.type ?? e.order?.type ?? "CARE") as ErOrderDomain;
                    const categoryLabel = t(domainHeadingKey(typeKey));
                    const primaryTitle = eventLinePrimaryTitle(e, language, t, parsedOrders);
                    const performedWhen = new Date(e.performedAt).toLocaleString(
                      language === "fr" ? "fr-FR" : "en-US"
                    );
                    const cancelReason = formatCancellationReasonForDisplay(e.note || e.order?.cancellationReason, t);
                    const titleCell = formatErOrderEventAttributionCell(cancelledOrder, e, t, language);
                    const statusSection = (
                      <>
                        <div>{t("orderEvent.cancelled")}</div>
                        {medCancelLine ? (
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{medCancelLine}</div>
                        ) : null}
                        <div style={{ fontSize: 11, marginTop: 4 }}>
                          {t("orderEvent.cancelReason")}: {cancelReason}
                        </div>
                      </>
                    );
                    const titleSection = (
                      <>
                        <div>{titleCell}</div>
                        {authorityLine ? <div style={{ fontSize: 11, marginTop: 4 }}>{authorityLine}</div> : null}
                        {attributionLines.slice(1).map((line) => (
                          <div key={line} style={{ fontSize: 11, marginTop: 4 }}>
                            {line}
                          </div>
                        ))}
                      </>
                    );
                    return (
                      <li key={e.id} style={{ minWidth: 0, listStyle: "none" }}>
                        <ErOrderEventCard
                          layoutMode={layoutMode}
                          categoryLabel={categoryLabel}
                          issuedPrimary={issuedPrimary}
                          timeStr={performedWhen}
                          orderTitle={primaryTitle}
                          orderSubLines={
                            directionsLine ? (
                              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                            ) : null
                          }
                          statusSection={statusSection}
                          titleSection={titleSection}
                          fieldLabels={orderCardFieldLabels}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div style={diagnosisOrdersTableScrollWrapStyle(layoutMode)}>
                  <table style={diagnosisOrdersTableStyle(layoutMode, 640)}>
                    <thead>
                      <tr>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableCategory")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableIssued")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableTime")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableOrder")}
                        </th>
                        <th scope="col" style={ordersTableTh}>
                          {t("erEmergencyOrders.tableLastAction")}
                        </th>
                        <th scope="col" style={{ ...ordersTableTh, borderRight: "none" }}>
                          {t("erEmergencyOrders.tableTitle")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cancelledEvents.map((e) => {
                        const medCancelLine = medicationCancellationSubLabel(e, t);
                        const directionsLine = medicationDirectionsForEvent(e, parsedOrders, t);
                        const cancelledOrder = parsedOrders.find((order) => order.id === e.orderId);
                        const authorityLine = cancelledOrder ? formatOrderAuthority(cancelledOrder, t) : null;
                        const attributionLines = cancelledOrder ? formatOrderAttributionLines(cancelledOrder, t, language) : [];
                        const issuedPrimary = attributionLines[0] ?? authorityLine ?? "—";
                        const typeKey = (cancelledOrder?.type ?? e.order?.type ?? "CARE") as ErOrderDomain;
                        const categoryLabel = t(domainHeadingKey(typeKey));
                        const primaryTitle = eventLinePrimaryTitle(e, language, t, parsedOrders);
                        const performedWhen = new Date(e.performedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US");
                        const cancelReason = formatCancellationReasonForDisplay(e.note || e.order?.cancellationReason, t);
                        const titleCell = formatErOrderEventAttributionCell(cancelledOrder, e, t, language);
                        return (
                          <tr key={e.id} style={{ verticalAlign: "top" }}>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#334155",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              {categoryLabel}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 200,
                              }}
                            >
                              {issuedPrimary}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {performedWhen}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#0f172a",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 280,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{primaryTitle}</div>
                              {directionsLine ? (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{directionsLine}</div>
                              ) : null}
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#b91c1c",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                              }}
                            >
                              <div>{t("orderEvent.cancelled")}</div>
                              {medCancelLine ? (
                                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{medCancelLine}</div>
                              ) : null}
                              <div style={{ fontSize: 11, marginTop: 4 }}>
                                {t("orderEvent.cancelReason")}: {cancelReason}
                              </div>
                            </td>
                            <td
                              style={{
                                ...ordersTableTdBorder,
                                padding: "8px 8px",
                                color: "#64748b",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                maxWidth: 220,
                                borderRight: "none",
                              }}
                            >
                              <div>{titleCell}</div>
                              {authorityLine ? (
                                <div style={{ fontSize: 11, marginTop: 4 }}>{authorityLine}</div>
                              ) : null}
                              {attributionLines.slice(1).map((line) => (
                                <div key={line} style={{ fontSize: 11, marginTop: 4 }}>
                                  {line}
                                </div>
                              ))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </MedoraCardInner>

      <CancelOrderModal
        variant="orderLine"
        open={cancelLineModalItemId !== null}
        orderId={cancelLineModalItemId}
        submitting={cancelBusyItemId !== null && cancelBusyItemId === cancelLineModalItemId}
        onClose={() => {
          if (cancelBusyItemId) return;
          setCancelLineModalItemId(null);
        }}
        onConfirm={confirmLineCancelFromModal}
      />
      {showCreateModal ? (
        <CreateOrderModal
          key={`${encounterId}-${createModalInitialTab}-${ordersRefresh}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          canUseRnOrderAuthority={canUseRnOrderAuthority}
          isRn={hasAnyRole(roles, "RN")}
          encounter={
            encounterForOrderModal?.patient
              ? {
                  patient: {
                    firstName: encounterForOrderModal.patient.firstName ?? undefined,
                    lastName: encounterForOrderModal.patient.lastName ?? undefined,
                    mrn: encounterForOrderModal.patient.mrn ?? undefined,
                  },
                }
              : undefined
          }
          initialOrderTab={createModalInitialTab}
          medicationOrderMode="ER_ADMINISTER_ONLY"
          onClose={() => setShowCreateModal(false)}
          onRefetchEncounter={onRefetchEncounter}
          onOpenEkgProcedureDocumentation={() => {
            setShowCreateModal(false);
            openProcedureDocumentation("EKG");
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            setOrdersRefresh((x) => x + 1);
            await onOrdersCreated?.();
          }}
        />
      ) : null}
      {showProcedureLauncher ? (
        <EmergencyProcedureLauncherModal
          open={showProcedureLauncher}
          onClose={() => {
            setShowProcedureLauncher(false);
            setProcedureLauncherInitialStep(null);
          }}
          encounterId={encounterId}
          facilityId={facilityId}
          initialStep={procedureLauncherInitialStep}
          onRecorded={() => {
            setShowProcedureLauncher(false);
            setProcedureLauncherInitialStep(null);
            setOrdersRefresh((x) => x + 1);
            void onRefetchEncounter();
            void onOrdersCreated?.();
          }}
        />
      ) : null}
    </MedoraCard>
  );
}
