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
import { ER_IV_LIFECYCLE_ORDER_TYPE } from "@/features/emergency/erIvOrderLifecycle";
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
  order?: {
    displayName?: string | null;
    cancellationReason?: string | null;
    type?: string | null;
  } | null;
};

function lifecycleOutcomeSubLabel(metadata: unknown, tr: (k: string) => string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const lo = (metadata as { lifecycleOutcome?: unknown }).lifecycleOutcome;
  if (lo === "VERIFIED") return tr("orderEvent.resultVerified");
  if (lo === "RESULTED") return tr("orderEvent.resultAcknowledged");
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
  if (e.order?.type === ER_IV_LIFECYCLE_ORDER_TYPE) return tr("orderEvent.ivCancelled");
  return null;
}

function careLineCompletedSubLabel(
  e: OrderEventRow,
  metadata: unknown,
  tr: (k: string) => string
): string | null {
  if (e.eventType !== "COMPLETED") return null;
  if (e.order?.type !== ER_IV_LIFECYCLE_ORDER_TYPE) return null;
  if (lifecycleOutcomeSubLabel(metadata, tr)) return null;
  return tr("orderEvent.ivCompleted");
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

  const activeOrders = useMemo(() => parsedOrders.filter((o) => orderHasAnyActiveItemForEr(o)), [parsedOrders]);

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

  const orderDisplayName = (order: OrderRow): string => {
    const items = Array.isArray(order.items) ? order.items : [];
    const activeItem = items.find((it) => isOrderItemActiveForErDashboard(it as Record<string, unknown>));
    const it = activeItem ?? items[0];
    if (!it) return order.type;
    return getOrderItemDisplayLabelForLanguage(
      it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
      language,
      t
    );
  };

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
              {activeOrders.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>{t("erEmergencyOrders.openOrdersEmpty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {activeOrders.map((o) => (
                    <div
                      key={o.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "8px 10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#0f172a" }}>{orderDisplayName(o)}</div>
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
                  ))}
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
                    const careLine = careLineCompletedSubLabel(e, e.metadata, t);
                    const secondaryLine = outcomeLine ?? marLine ?? careLine;
                    return (
                    <div key={e.id} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px" }}>
                      <div style={{ fontSize: 12, color: "#0f172a", fontWeight: 600 }}>
                        {e.order?.displayName || e.orderId}
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
                        {e.order?.displayName || e.orderId}
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
