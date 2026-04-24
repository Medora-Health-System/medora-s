"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchOrderEventsForEncounter, fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import type { SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { CreateOrderModal } from "@/components/orders";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";
import { MedoraCard, MedoraCardInner } from "@/components/medora-card";
import { type ErOrderDomain } from "@/features/emergency/erOrderWorkspace";
import { TraumaProtocolAssistPanel } from "@/features/emergency/TraumaProtocolAssistPanel";
import {
  isOrderItemActiveForErDashboard,
  isOrderItemCompletedForErDashboard,
  isParentOrderCancelled,
  orderHasAnyActiveItemForEr,
  orderItemIdFromEventMetadata,
  shouldIncludeCompletedOrderEventInErMerge,
} from "@/features/emergency/erOrderLifecycleUi";
import { apiFetch } from "@/lib/apiClient";
import {
  formatCancellationReasonForDisplay,
  ORDER_CANCEL_API_REASON_PATIENT_REQUEST,
} from "@/lib/orderCancelReasonDisplay";

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
  const [ordersRaw, setOrdersRaw] = useState<unknown[] | null>(null);
  const [orderEventsRaw, setOrderEventsRaw] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(true);
  const [cancelBusyOrderId, setCancelBusyOrderId] = useState<string | null>(null);
  const [lineActionBusy, setLineActionBusy] = useState<string | null>(null);
  const [resultReviewBusy, setResultReviewBusy] = useState<string | null>(null);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitialTab, setCreateModalInitialTab] = useState<OrderModalTab>("LAB");

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

  /** Lab/imaging lines with a department result (`RESULTED`) pending clinician acknowledgment / verification. */
  const resultReviewLines = useMemo(() => {
    const out: { orderId: string; orderType: string; item: Record<string, unknown> }[] = [];
    for (const o of parsedOrders) {
      if (o.status === "CANCELLED") continue;
      if (o.type !== "LAB" && o.type !== "IMAGING") continue;
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const row = it as Record<string, unknown>;
        if (String(row.status ?? "") !== "RESULTED") continue;
        const cat = String(row.catalogItemType ?? "");
        if (cat !== "LAB_TEST" && cat !== "IMAGING_STUDY") continue;
        out.push({ orderId: o.id, orderType: o.type, item: row });
      }
    }
    return out;
  }, [parsedOrders]);

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

  const onCancelOrder = async (orderId: string) => {
    setCancelBusyOrderId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/cancel`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({ cancellationReason: ORDER_CANCEL_API_REASON_PATIENT_REQUEST }),
      });
      setOrdersRefresh((x) => x + 1);
    } finally {
      setCancelBusyOrderId(null);
    }
  };

  const runOrderItemLifecycleAction = async (itemId: string, op: "acknowledge" | "start" | "complete" | "nurse") => {
    const busyKey = `${itemId}:${op}`;
    setLineActionBusy(busyKey);
    try {
      const path =
        op === "nurse"
          ? `/orders/items/${itemId}/nurse-complete`
          : `/orders/items/${itemId}/${op === "acknowledge" ? "acknowledge" : op}`;
      await apiFetch(path, { method: "POST", facilityId });
      setOrdersRefresh((x) => x + 1);
    } finally {
      setLineActionBusy(null);
    }
  };

  const runResultClinicianAction = async (orderItemId: string, op: "acknowledge" | "verify") => {
    const busyKey = `${orderItemId}:result-${op}`;
    setResultReviewBusy(busyKey);
    try {
      const path =
        op === "acknowledge"
          ? `/orders/${orderItemId}/result/acknowledge`
          : `/orders/${orderItemId}/result/verify`;
      await apiFetch(path, { method: "POST", facilityId });
      setOrdersRefresh((x) => x + 1);
    } finally {
      setResultReviewBusy(null);
    }
  };

  return (
    <MedoraCard leftAccentColor="#7c3aed" variant="default">
      <MedoraCardInner>
        {roles !== undefined ? (
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                width: "100%",
                alignItems: "stretch",
              }}
            >
            <div
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                alignContent: "start",
              }}
            >
              <button type="button" onClick={() => openModal("LAB")} style={btn}>
                {t("erEmergencyOrders.quickLab")}
              </button>
              <button type="button" onClick={() => openModal("IMAGING")} style={btn}>
                {t("erEmergencyOrders.quickImaging")}
              </button>
              <button type="button" onClick={() => openModal("MEDICATION")} style={btn}>
                {t("erEmergencyOrders.quickMedication")}
              </button>
              <button type="button" onClick={() => openModal("CARE")} style={btn}>
                {t("erEmergencyOrders.quickCare")}
              </button>
            </div>

            <div
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                alignContent: "start",
              }}
            >
              {DOMAIN_ORDER.map((d) => {
                const lines = labelsByDomain[d];
                const empty = lines.length === 0;
                return (
                  <div
                    key={d}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: empty ? "1px dashed #cbd5e1" : "1px solid #e2e8f0",
                      backgroundColor: empty ? "#fafafa" : "#fff",
                      fontSize: 11,
                      color: "#334155",
                      lineHeight: 1.35,
                      minHeight: 72,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{t(domainHeadingKey(d))}</div>
                    {empty ? (
                      <div style={{ color: "#64748b" }}>{t("erEmergencyOrders.emptyDomain")}</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 14, maxHeight: 120, overflow: "auto" }}>
                        {lines.slice(0, 12).map((line, i) => (
                          <li key={`${d}-${i}`} style={{ marginBottom: 2 }}>
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

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.openOrdersTitle")}
              </div>
              {activeOrderGroups.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.openOrdersEmpty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {activeOrderGroups.map(({ order: o, lines }) => (
                    <div
                      key={o.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{o.type}</span>
                        <button
                          type="button"
                          style={btn}
                          disabled={cancelBusyOrderId === o.id}
                          onClick={() => void onCancelOrder(o.id)}
                        >
                          {cancelBusyOrderId === o.id
                            ? t("erEmergencyOrders.cancelOrderBusy")
                            : t("erEmergencyOrders.cancelOrder")}
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
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
                          const busy = lineActionBusy;
                          const lineBtns: React.ReactNode[] = [];
                          if (isBedsideAdministerMedicationRow(item) && hasAnyRole(roles, "RN", "ADMIN")) {
                            lineBtns.push(
                              <button
                                key="nurse"
                                type="button"
                                style={btn}
                                disabled={busy === `${itemId}:nurse`}
                                onClick={() => void runOrderItemLifecycleAction(itemId, "nurse")}
                              >
                                {busy === `${itemId}:nurse`
                                  ? t("erEmergencyOrders.lineActionBusy")
                                  : t("erEmergencyOrders.nurseMarkBedsideComplete")}
                              </button>
                            );
                          } else {
                            const deptOk =
                              (o.type === "LAB" && hasAnyRole(roles, "LAB", "ADMIN")) ||
                              (o.type === "IMAGING" && hasAnyRole(roles, "RADIOLOGY", "ADMIN")) ||
                              (o.type === "MEDICATION" && hasAnyRole(roles, "PHARMACY", "ADMIN")) ||
                              ((o.type === "CARE" || cat === "SUPPLY") && hasAnyRole(roles, "RN", "ADMIN"));
                            if (deptOk && itemStatusAllowsAcknowledge(st)) {
                              lineBtns.push(
                                <button
                                  key="ack"
                                  type="button"
                                  style={btn}
                                  disabled={busy === `${itemId}:acknowledge`}
                                  onClick={() => void runOrderItemLifecycleAction(itemId, "acknowledge")}
                                >
                                  {busy === `${itemId}:acknowledge`
                                    ? t("erEmergencyOrders.lineActionBusy")
                                    : t("erEmergencyOrders.acknowledgeOrder")}
                                </button>
                              );
                            }
                            if (deptOk && itemStatusAllowsStart(st)) {
                              lineBtns.push(
                                <button
                                  key="start"
                                  type="button"
                                  style={btn}
                                  disabled={busy === `${itemId}:start`}
                                  onClick={() => void runOrderItemLifecycleAction(itemId, "start")}
                                >
                                  {busy === `${itemId}:start`
                                    ? t("erEmergencyOrders.lineActionBusy")
                                    : t("erEmergencyOrders.startOrder")}
                                </button>
                              );
                            }
                            if (deptOk && itemStatusAllowsComplete(st)) {
                              lineBtns.push(
                                <button
                                  key="complete"
                                  type="button"
                                  style={btn}
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
                            <div
                              key={itemId}
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                            >
                              <div style={{ fontSize: 12, color: "#0f172a", flex: "1 1 160px", minWidth: 0 }}>{label}</div>
                              {lineBtns.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{lineBtns}</div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.resultReviewTitle")}
              </div>
              {resultReviewLines.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.resultReviewEmpty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {resultReviewLines.map(({ orderId, orderType, item }) => {
                    const itemId = String(item.id ?? "");
                    const res = item.result as Record<string, unknown> | null | undefined;
                    const ackAt = res?.acknowledgedByProviderAt;
                    const ackName =
                      typeof res?.acknowledgedByDisplayFr === "string"
                        ? (res.acknowledgedByDisplayFr as string).trim()
                        : "";
                    const enteredName =
                      typeof res?.enteredByDisplayFr === "string"
                        ? (res.enteredByDisplayFr as string).trim()
                        : "";
                    const label = getOrderItemDisplayLabelForLanguage(
                      item as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
                      language,
                      t
                    );
                    const busy = resultReviewBusy;
                    const canAck = hasAnyRole(roles, "PROVIDER", "RN", "ADMIN");
                    const canVerify = hasAnyRole(roles, "PROVIDER", "ADMIN");
                    return (
                      <div
                        key={`${orderId}-${itemId}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "8px 10px",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>{label}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            {orderType} · {t("erEmergencyOrders.resultReviewDepartmentEntered")}
                            {enteredName ? `: ${enteredName}` : ""}
                          </div>
                          {ackAt ? (
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                              {t("erEmergencyOrders.resultReviewClinicianAcknowledged")}
                              {ackName ? `: ${ackName}` : ""} ·{" "}
                              {new Date(String(ackAt)).toLocaleString(language === "fr" ? "fr-FR" : "en-US")}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>
                              {t("erEmergencyOrders.resultReviewPendingAck")}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {canAck && !ackAt ? (
                            <button
                              type="button"
                              style={btn}
                              disabled={busy === `${itemId}:result-acknowledge`}
                              onClick={() => void runResultClinicianAction(itemId, "acknowledge")}
                            >
                              {busy === `${itemId}:result-acknowledge`
                                ? t("erEmergencyOrders.lineActionBusy")
                                : t("erEmergencyOrders.acknowledgeResult")}
                            </button>
                          ) : null}
                          {canVerify ? (
                            <button
                              type="button"
                              style={btn}
                              disabled={busy === `${itemId}:result-verify`}
                              onClick={() => void runResultClinicianAction(itemId, "verify")}
                            >
                              {busy === `${itemId}:result-verify`
                                ? t("erEmergencyOrders.lineActionBusy")
                                : t("erEmergencyOrders.verifyResult")}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.completedOrdersTitle")}
              </div>
              {eventLoading ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</div>
              ) : completedRows.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.completedOrdersEmpty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {completedRows.map((e) => {
                    const outcomeLine = lifecycleOutcomeSubLabel(e.metadata, t);
                    const marLine = marActionOutcomeSubLabel(e.metadata, t);
                    const careProcLine = careProcedureCompletedSubLabel(e, e.metadata, t);
                    const secondaryLine = outcomeLine ?? marLine ?? careProcLine;
                    return (
                    <div key={e.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>
                        {eventLinePrimaryTitle(e, language, t, parsedOrders)}
                      </div>
                      {secondaryLine ? (
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                          {secondaryLine}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {t("orderEvent.performedBy")}: {e.performedByDisplayName || "—"} •{" "}
                        {new Date(e.performedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")} •{" "}
                        {e.roleSnapshot ?? "—"}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {t("erEmergencyOrders.cancelledOrdersTitle")}
              </div>
              {eventLoading ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("common.loading")}</div>
              ) : cancelledEvents.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.cancelledOrdersEmpty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {cancelledEvents.map((e) => {
                    const medCancelLine = medicationCancellationSubLabel(e, t);
                    return (
                    <div key={e.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>
                        {eventLinePrimaryTitle(e, language, t, parsedOrders)}
                      </div>
                      {medCancelLine ? (
                        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                          {medCancelLine}
                        </div>
                      ) : null}
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {t("orderEvent.performedBy")}: {e.performedByDisplayName || "—"} •{" "}
                        {new Date(e.performedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-US")} •{" "}
                        {e.roleSnapshot ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        {t("orderEvent.cancelReason")}:{" "}
                        {formatCancellationReasonForDisplay(e.note || e.order?.cancellationReason, t)}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </MedoraCardInner>

      {showCreateModal ? (
        <CreateOrderModal
          key={`${encounterId}-${createModalInitialTab}-${ordersRefresh}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
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
          onClose={() => setShowCreateModal(false)}
          onRefetchEncounter={onRefetchEncounter}
          onSuccess={async () => {
            setShowCreateModal(false);
            setOrdersRefresh((x) => x + 1);
            await onOrdersCreated?.();
          }}
        />
      ) : null}
    </MedoraCard>
  );
}
