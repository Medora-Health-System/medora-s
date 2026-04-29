"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { getPendingCreateOrdersForEncounter, mergeOrders } from "@/lib/offline/pendingEncounterOrders";
import { listQueueItems } from "@/lib/offline/offlineQueue";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { isOrderItemIdUuid } from "@/lib/orderItemIdUuid";
import { isOrderItemPendingNurseMedication } from "@/lib/nurseMedicationWorkload";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import { resolveMedicationMarActionFromStorage } from "@medora/shared";

type AdminRow = {
  id: string;
  orderItemId: string | null;
  medicationLabelSnapshot?: string | null;
  administeredAt: string;
  notes: string | null;
  /** From API (`findByEncounter`) or offline queue payload when present. */
  marAction?: string | null;
  administeredBy: { id: string; firstName: string; lastName: string };
  pendingSync?: boolean;
};

type OrderItemApi = {
  id?: string;
  catalogItemType?: string | null;
  medicationFulfillmentIntent?: string | null;
  status?: string | null;
  route?: string | null;
  intendedAdministrationAt?: string | null;
  catalogMedication?: {
    route?: string | null;
    ndc11?: string | null;
    ndcDisplay?: string | null;
    billingUnitType?: string | null;
  } | null;
};

const RECENT_MS = 24 * 60 * 60 * 1000;

/** Fenêtre avant l’heure prévue : affichage « bientôt dû » (jaune), sans logique de planification. */
const INTENDED_DUE_SOON_BEFORE_MS = 60 * 60 * 1000;

type IntendedUrgency = "overdue" | "dueSoon";

function intendedTimingUrgency(
  intendedAtIso: string | null | undefined,
  nowMs: number,
  isAdministered: boolean
): IntendedUrgency | null {
  if (isAdministered) return null;
  const raw = intendedAtIso != null ? String(intendedAtIso).trim() : "";
  if (!raw) return null;
  const due = new Date(raw).getTime();
  if (Number.isNaN(due)) return null;
  if (nowMs > due) return "overdue";
  const msUntil = due - nowMs;
  if (msUntil >= 0 && msUntil <= INTENDED_DUE_SOON_BEFORE_MS) return "dueSoon";
  return null;
}

type MarAction = "administered" | "refused" | "not_available" | "md_changed";

function actionLabel(a: MarAction, tr: (k: string) => string): string {
  return tr(`marTab.actions.${a}`);
}

function buildMarNotes(action: MarAction, routeLine: string | undefined, userNotes: string, tr: (k: string) => string): string {
  const lines = [`${tr("marTab.noteActionPrefix")} ${actionLabel(action, tr)}`];
  if (routeLine?.trim()) lines.push(`${tr("marTab.noteRoutePrefix")} ${routeLine.trim()}`);
  const n = userNotes.trim();
  if (n) lines.push(n);
  return lines.join("\n");
}

/**
 * Resolved MAR clinical outcome: prefer persisted `marAction` (ER-3.2), then legacy notes parse.
 * `OrderItem.status` only answers active vs terminal lifecycle for the Orders dashboard.
 */
function latestMarClinicalActionForRow(latest: AdminRow | undefined): MarAction | undefined {
  if (!latest) return undefined;
  return resolveMedicationMarActionFromStorage({
    marAction: latest.marAction ?? null,
    notes: latest.notes,
  });
}

async function getPendingMedicationAdminsFromQueue(
  facilityId: string,
  encounterId: string,
  pendingSyncFirstName: string,
  pendingSyncLastName: string
): Promise<AdminRow[]> {
  const endpoint = `/encounters/${encounterId}/medication-administrations`;
  const all = await listQueueItems();
  const out: AdminRow[] = [];
  for (const item of all) {
    if (item.status !== "pending" && item.status !== "failed" && item.status !== "syncing") continue;
    if (item.type !== "medication_administration") continue;
    if (item.facilityId !== facilityId) continue;
    if (item.endpoint !== endpoint) continue;
    const payload =
      item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
        ? (item.payload as Record<string, unknown>)
        : {};
    const rawOid = payload.orderItemId;
    const orderItemId =
      typeof rawOid === "string" ? rawOid : typeof rawOid === "number" ? String(rawOid) : null;
    const administeredAt =
      typeof payload.administeredAt === "string" ? payload.administeredAt : item.createdAt;
    const notes = typeof payload.notes === "string" ? payload.notes : null;
    const marAction = typeof payload.marAction === "string" ? payload.marAction : null;
    out.push({
      id: `local:${item.id}`,
      orderItemId,
      medicationLabelSnapshot: null,
      administeredAt,
      notes,
      marAction,
      administeredBy: { id: "pending-sync", firstName: pendingSyncFirstName, lastName: pendingSyncLastName },
      pendingSync: true,
    });
  }
  return out;
}

export function MedicationAdministrationTab({
  encounterId,
  facilityId,
  encounterStatus,
}: {
  encounterId: string;
  facilityId: string;
  encounterStatus: string;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const [orders, setOrders] = useState<unknown[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Affichage immédiat si l’enregistrement MAR est seulement mis en file (pas encore confirmé serveur). */
  const [marQueuedOfflineNotice, setMarQueuedOfflineNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [modalItem, setModalItem] = useState<{
    orderItemId: string;
    label: string;
    authorityLine: string;
    attributionLines: string[];
    highRiskWarning: string | null;
    routeHint: string;
    ndcHint: string;
    billingUnitHint: string;
  } | null>(null);
  const [modalAction, setModalAction] = useState<MarAction>("administered");
  const [modalRoute, setModalRoute] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalDoseValue, setModalDoseValue] = useState("");
  const [modalDoseUnit, setModalDoseUnit] = useState("");
  const [modalAdminQty, setModalAdminQty] = useState("");
  const [modalBillingQty, setModalBillingQty] = useState("");
  const [modalNdc, setModalNdc] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [pendingAdmins, pendingOrders] = await Promise.all([
      getPendingMedicationAdminsFromQueue(
        facilityId,
        encounterId,
        t("marTab.pendingSyncFirstName"),
        t("marTab.pendingSyncLastName")
      ).catch(() => [] as AdminRow[]),
      getPendingCreateOrdersForEncounter(facilityId, encounterId).catch(() => [] as Record<string, unknown>[]),
    ]);

    try {
      const [o, a] = await Promise.all([
        apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
        apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
      ]);

      const serverOrders = Array.isArray(o) ? o : [];
      const serverAdmins = Array.isArray(a) ? (a as AdminRow[]) : [];

      setOrders(mergeOrders(serverOrders, pendingOrders));
      setAdmins([...serverAdmins, ...pendingAdmins]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("marTab.loadFailed"));
      setOrders(mergeOrders([], pendingOrders));
      setAdmins(pendingAdmins);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const adminsByOrderItemId = useMemo(() => {
    const m = new Map<string, AdminRow[]>();
    for (const r of admins) {
      if (!r.orderItemId) continue;
      const list = m.get(r.orderItemId) ?? [];
      list.push(r);
      m.set(r.orderItemId, list);
    }
    for (const [k, list] of m.entries()) {
      list.sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime());
      m.set(k, list);
    }
    return m;
  }, [admins]);

  const taskRows = useMemo(() => {
    const rows: {
      orderItemId: string;
      label: string;
      routeHint: string;
      ndcHint: string;
      billingUnitHint: string;
      intendedAt?: string | null;
      authorityLine: string;
      attributionLines: string[];
      highRiskWarning: string | null;
    }[] = [];
    for (const order of orders) {
      if ((order as { status?: string }).status === "CANCELLED") continue;
      const items = (order as { items?: OrderItemApi[] }).items ?? [];
      for (const it of items) {
        if (!it.id) continue;
        if (String(it.id).startsWith("local:")) continue;
        if (!isOrderItemPendingNurseMedication(it)) continue;
        const label = getOrderItemDisplayLabelForLanguage(
          it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
          language as SupportedLanguage,
          t
        );
        rows.push({
          orderItemId: it.id,
          label,
          authorityLine: formatOrderAuthority(order as Record<string, unknown>, t),
          attributionLines: formatOrderAttributionLines(order as Record<string, unknown>, t, language),
          highRiskWarning: highRiskMedicationWarning({ ...it, label }, t),
          routeHint: it.route?.trim() || it.catalogMedication?.route?.trim() || "",
          ndcHint: it.catalogMedication?.ndcDisplay?.trim() || it.catalogMedication?.ndc11?.trim() || "",
          billingUnitHint: it.catalogMedication?.billingUnitType?.trim() || "",
          intendedAt: it.intendedAdministrationAt ?? null,
        });
      }
    }
    return rows;
  }, [orders, language, t]);

  const openModal = (row: (typeof taskRows)[0]) => {
    setModalItem({
      orderItemId: row.orderItemId,
      label: row.label,
      authorityLine: row.authorityLine,
      attributionLines: row.attributionLines,
      highRiskWarning: row.highRiskWarning,
      routeHint: row.routeHint,
      ndcHint: row.ndcHint,
      billingUnitHint: row.billingUnitHint,
    });
    setModalAction("administered");
    setModalRoute(row.routeHint);
    setModalNotes("");
    setModalDoseValue("");
    setModalDoseUnit(row.billingUnitHint);
    setModalAdminQty("");
    setModalBillingQty("");
    setModalNdc(row.ndcHint);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalItem(null);
  };

  const submitModal = async () => {
    if (!modalItem || encounterStatus !== "OPEN") return;
    const orderItemId =
      typeof modalItem.orderItemId === "string" ? modalItem.orderItemId.trim() : "";
    if (!isOrderItemIdUuid(orderItemId)) {
      console.warn("MAR blocked: invalid orderItemId", modalItem.orderItemId);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const routeLine = modalRoute.trim() || modalItem.routeHint;
      const body: Record<string, unknown> = {
        orderItemId,
        marAction: modalAction,
        administeredAt: new Date().toISOString(),
        ...(routeLine ? { route: routeLine } : {}),
        ...(modalDoseValue.trim() ? { doseValue: Number(modalDoseValue) } : {}),
        ...(modalDoseUnit.trim() ? { doseUnit: modalDoseUnit.trim() } : {}),
        ...(modalAdminQty.trim() ? { administeredQuantity: Number(modalAdminQty) } : {}),
        ...(modalBillingQty.trim() ? { billingQuantity: Number(modalBillingQty) } : {}),
        ...(modalNdc.trim() ? { ndc: modalNdc.trim() } : {}),
        ...(modalDoseUnit.trim() ? { quantityUnit: modalDoseUnit.trim() } : {}),
        notes: buildMarNotes(modalAction, routeLine, modalNotes, t),
      };
      const res = await apiFetch(`/encounters/${encounterId}/medication-administrations`, {
        method: "POST",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      if (queued) {
        setMarQueuedOfflineNotice(true);
      } else {
        setMarQueuedOfflineNotice(false);
      }
      setModalItem(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("marTab.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const isOpen = encounterStatus === "OPEN";
  const nowMs = Date.now();

  return (
    <div style={{ maxWidth: 900 }}>
      {error ? (
        <p style={{ color: "#c62828", fontSize: 14, marginTop: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      {marQueuedOfflineNotice ? (
        <div
          role="alert"
          style={{
            marginBottom: 12,
            marginTop: error ? 8 : 0,
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #ef9a9a",
            backgroundColor: "#ffebee",
            fontSize: 13,
            color: "#b71c1c",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {t("marTab.offlineNotice")}
        </div>
      ) : null}

      <h3 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{t("marTab.title")}</h3>
      {!isOpen ? <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#616161" }}>{t("marTab.closedHint")}</p> : null}

      {loading ? (
        <p>{t("common.loading")}</p>
      ) : taskRows.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.emptyTasks")}</p>
      ) : (
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 280,
              backgroundColor: "white",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd", backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 13 }}>{t("marTab.columnMedication")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 13 }}>{t("marTab.columnStatus")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 13 }}>{t("marTab.columnWhen")}</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 13 }}>{t("marTab.columnActions")}</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row) => {
                const list = adminsByOrderItemId.get(row.orderItemId) ?? [];
                const latest = list[0];
                const latestTime = latest ? new Date(latest.administeredAt).getTime() : 0;
                const marActionResolved = latestMarClinicalActionForRow(latest);
                const marSaysAdministered = marActionResolved === "administered";
                const marRowLocked = Boolean(latest?.pendingSync || marSaysAdministered);
                const recentWindow = latestTime > 0 && nowMs - latestTime < RECENT_MS;

                let statusCell: React.ReactNode;

                if (latest?.pendingSync) {
                  statusCell = (
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        backgroundColor: "#fff3cd",
                        color: "#856404",
                        fontWeight: 600,
                      }}
                    >
                      {t("marTab.statusPendingSync")}
                    </span>
                  );
                } else if (marSaysAdministered) {
                  statusCell = <span>🟢 {t("marTab.statusAdministered")}</span>;
                } else if (latest && !marSaysAdministered) {
                  statusCell = (
                    <span>
                      🟠 {actionLabel(marActionResolved as MarAction, t)}
                      {recentWindow ? ` · ${t("marTab.statusRecentLabel")}` : ""}
                    </span>
                  );
                } else {
                  statusCell = <span>🔴 {t("marTab.statusPending")}</span>;
                }

                const timeCell = latest
                  ? new Date(latest.administeredAt).toLocaleString(dateLocale)
                  : t("common.dash");

                const displayName =
                  latest?.medicationLabelSnapshot?.trim() || row.label;

                const intendedLine =
                  row.intendedAt != null && String(row.intendedAt).trim() !== ""
                    ? new Date(row.intendedAt as string).toLocaleString(dateLocale)
                    : null;

                const intendedUrgency = intendedLine
                  ? intendedTimingUrgency(row.intendedAt, nowMs, marSaysAdministered)
                  : null;
                const intendedLineStyle: React.CSSProperties =
                  intendedUrgency === "overdue"
                    ? {
                        fontSize: 12,
                        marginTop: 4,
                        padding: "6px 8px",
                        borderRadius: 4,
                        color: "#b71c1c",
                        backgroundColor: "#ffebee",
                        fontWeight: 600,
                      }
                    : intendedUrgency === "dueSoon"
                      ? {
                          fontSize: 12,
                          marginTop: 4,
                          padding: "6px 8px",
                          borderRadius: 4,
                          color: "#e65100",
                          backgroundColor: "#fff8e1",
                          fontWeight: 600,
                        }
                      : { fontSize: 12, color: "#424242", marginTop: 4 };

                return (
                  <tr
                    key={row.orderItemId}
                    style={{
                      borderBottom: "1px solid #eee",
                      verticalAlign: "top",
                      backgroundColor: latest?.pendingSync ? "#fff8e1" : undefined,
                    }}
                  >
                    <td style={{ padding: "12px 8px", fontSize: 14, wordBreak: "break-word" }}>
                      <div style={{ fontWeight: 600 }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                        {row.authorityLine}
                      </div>
                      {row.attributionLines.map((line) => (
                        <div key={line} style={{ fontSize: 12, color: "#64748b", marginTop: 4, overflowWrap: "anywhere" }}>
                          {line}
                        </div>
                      ))}
                      {intendedLine ? (
                        <div
                          style={intendedLineStyle}
                          title={
                            intendedUrgency === "overdue"
                              ? t("marTab.intendedOverdueTitle")
                              : intendedUrgency === "dueSoon"
                                ? t("marTab.intendedDueSoonTitle")
                                : undefined
                        }
                      >
                          {t("marTab.intendedPrefix")} {intendedLine}
                        </div>
                      ) : null}
                      {row.routeHint ? (
                        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                          {t("marTab.routePrefix")} {row.routeHint}
                        </div>
                      ) : null}
                      {row.highRiskWarning ? (
                        <div style={{ fontSize: 12, color: "#b45309", marginTop: 4, fontWeight: 600 }}>
                          {row.highRiskWarning}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: "12px 8px", fontSize: 14 }}>{statusCell}</td>
                    <td style={{ padding: "12px 8px", fontSize: 14, whiteSpace: "nowrap" }}>{timeCell}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <button
                        type="button"
                        disabled={!isOpen || submitting || marRowLocked}
                        onClick={() => openModal(row)}
                        style={{
                          padding: "10px 14px",
                          fontSize: 14,
                          minHeight: 44,
                          width: "100%",
                          maxWidth: 200,
                          backgroundColor: isOpen && !marRowLocked ? "#2e7d32" : "#bdbdbd",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: isOpen && !marRowLocked ? "pointer" : "not-allowed",
                          fontWeight: 600,
                        }}
                      >
                        {t("marTab.administer")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ margin: "24px 0 8px 0", fontSize: 16 }}>{t("marTab.historyTitle")}</h3>
      {loading ? null : admins.length === 0 ? (
        <p style={{ color: "#666", fontSize: 14 }}>{t("marTab.empty")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {admins
            .slice()
            .sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())
            .map((r) => {
              const oid = r.orderItemId;
              const label =
                r.medicationLabelSnapshot?.trim() ||
                (oid
                  ? taskRows.find((tr) => tr.orderItemId === oid)?.label ?? t("common.dash")
                  : t("marTab.noLinkedOrder"));
              return (
                <li
                  key={r.id}
                  style={{
                    padding: "12px 14px",
                    marginBottom: 8,
                    backgroundColor: "#fafafa",
                    borderRadius: 8,
                    border: "1px solid #eee",
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div style={{ color: "#555", marginTop: 4 }}>
                    {new Date(r.administeredAt).toLocaleString(dateLocale)} · {r.administeredBy.firstName}{" "}
                    {r.administeredBy.lastName}
                  </div>
                  {r.notes?.trim() ? (
                    <pre
                      style={{
                        margin: "8px 0 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontFamily: "inherit",
                        fontSize: 13,
                        color: "#333",
                      }}
                    >
                      {r.notes.trim()}
                    </pre>
                  ) : null}
                </li>
              );
            })}
        </ul>
      )}

      {modalItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mar-modal-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 12,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 16,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="mar-modal-title" style={{ margin: "0 0 12px 0", fontSize: 17 }}>
              {t("marTab.modalTitle")}
            </h4>
            <p style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 600, wordBreak: "break-word" }}>{modalItem.label}</p>
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>
              {modalItem.authorityLine}
            </p>
            {modalItem.attributionLines.map((line) => (
              <p key={line} style={{ margin: "0 0 6px 0", fontSize: 13, color: "#64748b", overflowWrap: "anywhere" }}>
                {line}
              </p>
            ))}
            {modalItem.highRiskWarning ? (
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>
                {modalItem.highRiskWarning}
              </p>
            ) : null}

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.routeOptional")}
            </label>
            <input
              type="text"
              value={modalRoute}
              onChange={(e) => setModalRoute(e.target.value)}
              placeholder={modalItem.routeHint || t("marTab.routePlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.ndcLabel")}
            </label>
            <input
              type="text"
              value={modalNdc}
              onChange={(e) => setModalNdc(e.target.value)}
              placeholder={modalItem.ndcHint || t("marTab.ndcPlaceholder")}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 14,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalDoseValue}
                onChange={(e) => setModalDoseValue(e.target.value)}
                placeholder={t("marTab.doseValuePlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
              <input
                type="text"
                value={modalDoseUnit}
                onChange={(e) => setModalDoseUnit(e.target.value)}
                placeholder={modalItem.billingUnitHint || t("marTab.doseUnitPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalAdminQty}
                onChange={(e) => setModalAdminQty(e.target.value)}
                placeholder={t("marTab.adminQuantityPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
              <input
                type="number"
                min={0}
                step="0.0001"
                value={modalBillingQty}
                onChange={(e) => setModalBillingQty(e.target.value)}
                placeholder={t("marTab.billingQuantityPlaceholder")}
                disabled={submitting}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1px solid #ccc", fontSize: 16 }}
              />
            </div>

            <span style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
              {t("marTab.actionHeading")}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {(
                [
                  "administered",
                  "refused",
                  "not_available",
                  "md_changed",
                ] as const
              ).map((a) => (
                <label
                  key={a}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 15,
                    padding: "10px 8px",
                    borderRadius: 8,
                    border: modalAction === a ? "2px solid #2e7d32" : "1px solid #ddd",
                    cursor: submitting ? "default" : "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="mar-action"
                    checked={modalAction === a}
                    onChange={() => setModalAction(a)}
                    disabled={submitting}
                  />
                  {actionLabel(a, t)}
                </label>
              ))}
            </div>

            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>{t("marTab.notesLabel")}</label>
            <textarea
              value={modalNotes}
              onChange={(e) => setModalNotes(e.target.value)}
              rows={3}
              disabled={submitting}
              style={{
                width: "100%",
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                border: "1px solid #ccc",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "#666" }}>{t("marTab.timestampHint")}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#fff",
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {t("marTab.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitModal()}
                disabled={submitting}
                style={{
                  padding: "12px 18px",
                  fontSize: 15,
                  borderRadius: 8,
                  border: "none",
                  background: "#1a1a1a",
                  color: "white",
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: 44,
                }}
              >
                {submitting ? t("common.loading") : t("marTab.save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
