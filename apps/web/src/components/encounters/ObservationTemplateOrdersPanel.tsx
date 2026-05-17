"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { CancelOrderModal, type CancelOrderConfirmPayload } from "@/components/orders";
import { apiFetch } from "@/lib/apiClient";
import { fetchOrderEventsForEncounter } from "@/lib/clinicalWorklistApi";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import {
  flattenObservationTemplateOrders,
  type ObservationTemplateOrderRow,
} from "@/lib/observationTemplateOrderRows";
import type { ObservationTemplateLineLifecyclePhase } from "@medora/shared";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

export function ObservationTemplateOrdersPanel({
  encounterId,
  facilityId,
  orders,
  encounterOpen,
  roles,
  onOrdersUpdated,
}: {
  encounterId: string;
  facilityId: string;
  orders: unknown[];
  encounterOpen: boolean;
  roles: string[];
  onOrdersUpdated?: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [orderEvents, setOrderEvents] = useState<unknown[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [lineActionBusy, setLineActionBusy] = useState<string | null>(null);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isRn = roles.includes("RN") || roles.includes("ADMIN");
  const canAct = encounterOpen && isRn;

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const events = await fetchOrderEventsForEncounter(facilityId, encounterId);
      setOrderEvents(events);
    } catch {
      setOrderEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents, orders]);

  const rows = useMemo(
    () => flattenObservationTemplateOrders(orders, orderEvents, language),
    [orders, orderEvents, language]
  );

  const runLineAction = async (itemId: string, action: string, fn: () => Promise<void>) => {
    setLineActionBusy(`${itemId}:${action}`);
    setFeedback(null);
    try {
      await fn();
      await loadEvents();
      await onOrdersUpdated?.();
    } catch (e) {
      setFeedback({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterChrome.observationTemplateOrders.actionFailed"),
      });
    } finally {
      setLineActionBusy(null);
    }
  };

  const acknowledgeItem = (itemId: string) =>
    runLineAction(itemId, "acknowledge", async () => {
      await apiFetch(`/orders/items/${itemId}/acknowledge`, { method: "POST", facilityId });
      setFeedback({ type: "ok", text: t("encounterChrome.observationTemplateOrders.acknowledgedOk") });
    });

  const startItem = (itemId: string) =>
    runLineAction(itemId, "start", async () => {
      await apiFetch(`/orders/items/${itemId}/start`, { method: "POST", facilityId });
      setFeedback({ type: "ok", text: t("encounterChrome.observationTemplateOrders.startedOk") });
    });

  const completeItem = (row: ObservationTemplateOrderRow) =>
    runLineAction(row.itemId, "complete", async () => {
      if (row.lifecyclePhase === "ACKNOWLEDGED" && !row.allowsInProgressStart) {
        await apiFetch(`/orders/items/${row.itemId}/start`, { method: "POST", facilityId });
      }
      await apiFetch(`/orders/items/${row.itemId}/complete`, { method: "POST", facilityId });
      setFeedback({ type: "ok", text: t("encounterChrome.observationTemplateOrders.completedOk") });
    });

  const confirmCancelItem = async (payload: CancelOrderConfirmPayload) => {
    if (!cancelItemId || cancelSubmitting) return;
    setCancelSubmitting(true);
    setFeedback(null);
    try {
      await apiFetch(`/orders/items/${cancelItemId}/cancel`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancellationReason: payload.cancellationReason,
          ...(payload.cancellationDetails ? { cancellationDetails: payload.cancellationDetails } : {}),
        }),
      });
      setCancelItemId(null);
      await loadEvents();
      await onOrdersUpdated?.();
      setFeedback({ type: "ok", text: t("encounterChrome.ordersTab.orderCanceledOk") });
    } catch (e) {
      setFeedback({
        type: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterChrome.ordersTab.cancelFailed"),
      });
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (rows.length === 0 && !eventsLoading) return null;

  const shell: React.CSSProperties = {
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    background: MEDORA_CARD_SHELL.background,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
    overflow: "hidden",
  };

  return (
    <div style={shell}>
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {t("encounterChrome.observationTemplateOrders.title")}
        </h3>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          {t("encounterChrome.observationTemplateOrders.subtitle")}
        </p>
      </div>

      {feedback ? (
        <div
          role="status"
          style={{
            margin: "10px 14px 0",
            padding: "10px 12px",
            borderRadius: 10,
            fontSize: 13,
            background: feedback.type === "ok" ? "#f0fdf4" : "#fef2f2",
            color: feedback.type === "ok" ? "#166534" : "#b91c1c",
            border: `1px solid ${feedback.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {feedback.text}
        </div>
      ) : null}

      <div style={{ padding: "12px 14px 14px", overflowX: "auto" }}>
        {eventsLoading ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {[
                  "tableOrder",
                  "tableLifecycle",
                  "tableOrdered",
                  "tableAckBy",
                  "tablePerformed",
                  "tableActions",
                ].map((key) => (
                  <th
                    key={key}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {t(`encounterChrome.observationTemplateOrders.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ObservationTemplateOrderRowView
                  key={row.itemId}
                  row={row}
                  language={language}
                  t={t}
                  canAct={canAct}
                  lineActionBusy={lineActionBusy}
                  onAcknowledge={() => void acknowledgeItem(row.itemId)}
                  onStart={() => void startItem(row.itemId)}
                  onComplete={() => void completeItem(row)}
                  onCancel={() => {
                    setFeedback(null);
                    setCancelItemId(row.itemId);
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <CancelOrderModal
        variant="orderLine"
        open={cancelItemId !== null}
        orderId={cancelItemId}
        submitting={cancelSubmitting}
        onClose={() => {
          if (!cancelSubmitting) setCancelItemId(null);
        }}
        onConfirm={confirmCancelItem}
      />
    </div>
  );
}

function ObservationTemplateOrderRowView({
  row,
  language,
  t,
  canAct,
  lineActionBusy,
  onAcknowledge,
  onStart,
  onComplete,
  onCancel,
}: {
  row: ObservationTemplateOrderRow;
  language: "fr" | "en";
  t: (key: string) => string;
  canAct: boolean;
  lineActionBusy: string | null;
  onAcknowledge: () => void;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const phase = row.lifecyclePhase;
  const terminal = phase === "COMPLETED" || phase === "CANCELLED";
  const showAck = canAct && phase === "ORDERED";
  const showStart = canAct && row.allowsInProgressStart && phase === "ACKNOWLEDGED";
  const showComplete =
    canAct &&
    (phase === "IN_PROGRESS" || (phase === "ACKNOWLEDGED" && !row.allowsInProgressStart));
  const showCancel = canAct && !terminal;

  const busy = (action: string) => lineActionBusy === `${row.itemId}:${action}`;

  return (
    <tr style={{ borderTop: "1px solid #e2e8f0", opacity: phase === "CANCELLED" ? 0.75 : 1 }}>
      <td style={{ padding: "10px 12px", fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{row.label}</td>
      <td style={{ padding: "10px 12px", fontSize: 12 }}>
        <LifecycleChip phase={phase} t={t} />
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155" }}>
        <div>{row.orderedBy ?? t("common.dash")}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {row.orderedAtIso
            ? formatEncounterChromeDateTime(row.orderedAtIso, language)
            : t("common.dash")}
        </div>
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155" }}>
        <div>{row.acknowledgedBy ?? t("common.dash")}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {row.acknowledgedAtIso
            ? formatEncounterChromeDateTime(row.acknowledgedAtIso, language)
            : t("common.dash")}
        </div>
      </td>
      <td style={{ padding: "10px 12px", fontSize: 12, color: "#334155" }}>
        <div>{row.performedBy ?? t("common.dash")}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {row.completedAtIso
            ? formatEncounterChromeDateTime(row.completedAtIso, language)
            : t("common.dash")}
        </div>
      </td>
      <td style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {showAck ? (
            <button type="button" disabled={busy("acknowledge")} onClick={onAcknowledge} style={actionBtnStyle(false)}>
              {busy("acknowledge")
                ? t("encounterChrome.observationTemplateOrders.acknowledging")
                : t("encounterChrome.observationTemplateOrders.acknowledge")}
            </button>
          ) : null}
          {showStart ? (
            <button type="button" disabled={busy("start")} onClick={onStart} style={actionBtnStyle(false)}>
              {busy("start")
                ? t("encounterChrome.observationTemplateOrders.starting")
                : t("encounterChrome.observationTemplateOrders.start")}
            </button>
          ) : null}
          {showComplete ? (
            <button type="button" disabled={busy("complete")} onClick={onComplete} style={actionBtnStyle(false)}>
              {busy("complete")
                ? t("encounterChrome.observationTemplateOrders.completing")
                : t("encounterChrome.observationTemplateOrders.complete")}
            </button>
          ) : null}
          {phase === "ACKNOWLEDGED" && !showStart && !showComplete && !showAck ? (
            <span style={statePillStyle("#dcfce7", "#166534", "#86efac")}>
              {t("encounterChrome.observationTemplateOrders.acknowledgedState")}
            </span>
          ) : null}
          {phase === "COMPLETED" ? (
            <span style={statePillStyle("#f1f5f9", "#334155", "#cbd5e1")}>
              {t("encounterChrome.observationTemplateOrders.completedState")}
            </span>
          ) : null}
          {showCancel ? (
            <button type="button" onClick={onCancel} style={actionBtnStyle(true)}>
              {t("encounterChrome.observationTemplateOrders.cancelLine")}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function LifecycleChip({
  phase,
  t,
}: {
  phase: ObservationTemplateLineLifecyclePhase;
  t: (key: string) => string;
}) {
  const key = `encounterChrome.observationTemplateOrders.lifecycle.${phase}`;
  const styles: Record<ObservationTemplateLineLifecyclePhase, { bg: string; color: string; border: string }> = {
    ORDERED: { bg: "#fff3cd", color: "#856404", border: "#fde68a" },
    ACKNOWLEDGED: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
    IN_PROGRESS: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
    COMPLETED: { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" },
    CANCELLED: { bg: "#ffebee", color: "#b71c1c", border: "#fecaca" },
  };
  const s = styles[phase];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {t(key)}
    </span>
  );
}

function statePillStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    fontSize: 12,
    fontWeight: 600,
    color,
    padding: "4px 10px",
    borderRadius: 6,
    background: bg,
    border: `1px solid ${border}`,
  };
}

function actionBtnStyle(danger: boolean): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    cursor: "pointer",
    border: danger ? "1px solid #e57373" : "1px solid #cbd5e1",
    background: "#fff",
    color: danger ? "#c62828" : "#0f172a",
  };
}
