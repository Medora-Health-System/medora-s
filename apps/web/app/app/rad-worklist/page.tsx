"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getOrderItemStatusLabel } from "@/constants/orderStatusLabels";
import { getOrderPriorityLabelFr, getPathwayTypeLabelFr, ui } from "@/lib/uiLabels";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { worklistItemIsTerminal, worklistItemNeedsAcknowledge } from "@/lib/worklistLabRadUi";
import { orderIsCancelled, WORKLIST_ORDER_CANCELLED_BADGE_STYLE } from "@/lib/worklistOrderCancelledUi";
import {
  getEncounterPatientLabelFromCache,
  getPendingImagingOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";

const PRIORITY_BORDER: Record<string, string> = {
  ROUTINE: "#94a3b8",
  URGENT: "#f97316",
  STAT: "#ef4444",
};

const PRIORITY_BADGE_SOFT: Record<string, { bg: string; text: string; border: string }> = {
  ROUTINE: { bg: "#f4f4f5", text: "#52525b", border: "#e4e4e7" },
  URGENT: { bg: "#fff7ed", text: "#c2410c", border: "#fdba74" },
  STAT: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

function priorityBorder(p: string) {
  return PRIORITY_BORDER[p] ?? PRIORITY_BORDER.ROUTINE;
}

function priorityBadgeSoft(p: string) {
  return PRIORITY_BADGE_SOFT[p] ?? PRIORITY_BADGE_SOFT.ROUTINE;
}

function patientInitials(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || ui.common.dash;
}

function rowMatchesSearch(query: string, haystack: string): boolean {
  const t = query.trim().toLowerCase();
  if (!t) return true;
  const b = haystack.toLowerCase();
  return t
    .split(/\s+/)
    .filter(Boolean)
    .every((tok) => b.includes(tok));
}

const searchInputStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  padding: "0 12px",
  fontSize: 13,
  color: "#0f172a",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  width: "100%",
  maxWidth: 480,
  boxSizing: "border-box",
};

const btnGhost: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  color: "#334155",
};

const btnVoir: React.CSSProperties = {
  display: "inline-flex",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #0f172a",
  backgroundColor: "#0f172a",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center",
};

function PendingEncounterPatientBlock({
  facilityId,
  encounterId,
  children,
}: {
  facilityId: string;
  encounterId: string;
  children?: React.ReactNode;
}) {
  const [name, setName] = useState("…");
  const [mrn, setMrn] = useState("—");
  useEffect(() => {
    void getEncounterPatientLabelFromCache(facilityId, encounterId).then((p) => {
      setName(p.label);
      setMrn(p.mrn);
    });
  }, [facilityId, encounterId]);
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <div style={{ display: "flex", gap: 16, minWidth: 0, flex: 1 }}>
      <div
        aria-hidden
        style={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: "50%",
          backgroundColor: "#f1f5f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 600,
          color: "#334155",
          border: "1px solid #e2e8f0",
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "#0f172a",
            lineHeight: 1.25,
          }}
        >
          {name}
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
          <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span> {mrn}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function RadWorklistPage() {
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Dernière action worklist mise en file hors ligne uniquement. */
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  const loadQueue = async () => {
    if (!facilityId) return;
    setLoading(true);
    const pendingP = getPendingImagingOrderRowsForFacility(facilityId);
    try {
      const data = await apiFetch("/worklists/radiology", { facilityId });
      setQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load radiology worklist:", error);
      setQueue([]);
    }
    const pendingRows = await pendingP;
    setPendingLocal(pendingRows);
    setLoading(false);
  };

  const filteredQueuePairs = useMemo(() => {
    const out: { order: any; item: any }[] = [];
    for (const order of Array.isArray(queue) ? queue : []) {
      if (!Array.isArray(order.items)) continue;
      const pc = String(order.priority ?? "ROUTINE");
      for (const item of order.items) {
        const patient = order.encounter?.patient;
        const blob = [
          fullPatientName(patient),
          (patient?.mrn ?? "").trim(),
          getOrderItemDisplayLabelFr(item),
          getOrderPriorityLabelFr(pc),
          orderIsCancelled(order) ? "Annulée" : getOrderItemStatusLabel(item.status),
          order.pathwaySession ? getPathwayTypeLabelFr(order.pathwaySession.type) : "",
        ].join(" ");
        if (rowMatchesSearch(searchQuery, blob)) out.push({ order, item });
      }
    }
    return out;
  }, [queue, searchQuery]);

  const filteredPendingLocal = useMemo(() => {
    return pendingLocal.filter((row) => {
      const blob = [
        ...row.itemLabels,
        getOrderPriorityLabelFr(String(row.priority ?? "ROUTINE")),
        row.encounterId,
        "En attente de synchronisation",
      ].join(" ");
      return rowMatchesSearch(searchQuery, blob);
    });
  }, [pendingLocal, searchQuery]);

  const handleAcknowledge = async (itemId: string) => {
    if (!facilityId) return;
    const item = (Array.isArray(queue) ? queue : [])
      .flatMap((o: any) => (Array.isArray(o.items) ? o.items : []))
      .find((i: any) => i.id === itemId);
    if (!item) return;
    if (item.status !== "PLACED" && item.status !== "PENDING" && item.status !== "SIGNED") {
      console.warn("ACK blocked: invalid state", item.status);
      return;
    }
    try {
      const res = await apiFetch(`/orders/items/${itemId}/acknowledge`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(
        queued
          ? "Action enregistrée sur cet appareil, en attente de synchronisation. Pas encore confirmée côté serveur."
          : null
      );
      loadQueue();
    } catch (error) {
      alert("Impossible d'acquitter");
    }
  };

  const handleStart = async (itemId: string) => {
    if (!facilityId) return;
    try {
      const res = await apiFetch(`/orders/items/${itemId}/start`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(
        queued
          ? "Action enregistrée sur cet appareil, en attente de synchronisation. Pas encore confirmée côté serveur."
          : null
      );
      loadQueue();
    } catch (error) {
      alert("Impossible de démarrer");
    }
  };

  const handleComplete = async (itemId: string) => {
    if (!facilityId) return;
    try {
      const res = await apiFetch(`/orders/items/${itemId}/complete`, {
        method: "POST",
        facilityId,
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setQueuedActionNotice(
        queued
          ? "Action enregistrée sur cet appareil, en attente de synchronisation. Pas encore confirmée côté serveur."
          : null
      );
      loadQueue();
    } catch (error) {
      alert("Impossible de terminer");
    }
  };

  const renderActions = (order: any, item: any) => {
    if (orderIsCancelled(order)) {
      return (
        <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir}>
          {ui.common.view}
        </Link>
      );
    }
    if (worklistItemIsTerminal(item.status)) {
      return (
        <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir}>
          {ui.common.view}
        </Link>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {worklistItemNeedsAcknowledge(item.status) && (
            <button type="button" onClick={() => void handleAcknowledge(item.id)} style={btnGhost}>
              {ui.lab.acknowledge}
            </button>
          )}
          {item.status === "ACKNOWLEDGED" && (
            <button type="button" onClick={() => void handleStart(item.id)} style={btnGhost}>
              {ui.lab.start}
            </button>
          )}
          {item.status === "IN_PROGRESS" && (
            <button type="button" onClick={() => void handleComplete(item.id)} style={btnGhost}>
              {ui.lab.complete}
            </button>
          )}
        </div>
        <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir}>
          {ui.common.view}
        </Link>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {ui.radiology.title}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            {ui.radiology.subtitle}
          </p>
        </header>

        {!loading && (queue.length > 0 || pendingLocal.length > 0) ? (
          <div style={{ marginBottom: 16 }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par patient, NIR ou examen..."
              autoComplete="off"
              aria-label="Rechercher dans la liste"
              style={searchInputStyle}
            />
          </div>
        ) : null}

        {queuedActionNotice ? (
          <div
            role="alert"
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #ef9a9a",
              backgroundColor: "#ffebee",
              fontSize: 13,
              fontWeight: 600,
              color: "#b71c1c",
              lineHeight: 1.45,
              maxWidth: 720,
            }}
          >
            {queuedActionNotice}
          </div>
        ) : null}

        {loading && queue.length === 0 && pendingLocal.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  padding: 16,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: "#f1f5f9" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 16, width: "45%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "30%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                    <div style={{ height: 12, width: "75%", borderRadius: 4, backgroundColor: "#f1f5f9" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : queue.length === 0 && pendingLocal.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              borderRadius: 16,
              border: "1px dashed #cbd5e1",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: "48px 24px",
              textAlign: "center",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>{ui.radiology.empty}</p>
          </div>
        ) : (
          <div style={{ marginTop: 24 }}>
            {searchQuery.trim() &&
            filteredQueuePairs.length === 0 &&
            filteredPendingLocal.length === 0 &&
            (queue.length > 0 || pendingLocal.length > 0) ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px dashed #cbd5e1",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  padding: "48px 24px",
                  textAlign: "center",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                }}
              >
                <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>
                  Aucun résultat pour cette recherche.
                </p>
                <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>Modifiez les termes ou effacez la recherche.</p>
              </div>
            ) : (
              <>
                {filteredQueuePairs.length > 0 ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {filteredQueuePairs.map(({ order, item }) => {
                    const patient = order.encounter?.patient;
                    const pc = String(order.priority ?? "ROUTINE");
                    const pSoft = priorityBadgeSoft(pc);
                    const borderLeft = priorityBorder(pc);
                    const statusLabel = orderIsCancelled(order) ? (
                      <span style={WORKLIST_ORDER_CANCELLED_BADGE_STYLE}>Annulée</span>
                    ) : (
                      getOrderItemStatusLabel(item.status)
                    );
                    return (
                      <li key={item.id}>
                        <article
                          className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                          style={{
                            overflow: "hidden",
                            borderRadius: 16,
                            border: "1px solid #e2e8f0",
                            backgroundColor: "#fff",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                            borderLeftWidth: 4,
                            borderLeftStyle: "solid",
                            borderLeftColor: borderLeft,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 16,
                              padding: 16,
                              alignItems: "stretch",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", minWidth: 0, flex: "1 1 220px", gap: 16 }}>
                              <div
                                aria-hidden
                                style={{
                                  flexShrink: 0,
                                  width: 44,
                                  height: 44,
                                  borderRadius: "50%",
                                  backgroundColor: "#f1f5f9",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "#334155",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {patientInitials(patient)}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h2
                                  style={{
                                    margin: 0,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {fullPatientName(patient)}
                                </h2>
                                <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "#64748b" }}>
                                  <span style={{ fontWeight: 600, color: "#475569" }}>{ui.common.nir}</span>{" "}
                                  {(patient?.mrn ?? "").trim() || ui.common.dash}
                                </p>
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 10px",
                                      borderRadius: 9999,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      backgroundColor: "#f8fafc",
                                      color: "#334155",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    {ui.common.study} · {getOrderItemDisplayLabelFr(item)}
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 10px",
                                      borderRadius: 9999,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      backgroundColor: "#f8fafc",
                                      color: "#334155",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    {statusLabel}
                                  </span>
                                  {order.pathwaySession && (
                                    <span
                                      style={{
                                        display: "inline-block",
                                        padding: "4px 10px",
                                        borderRadius: 9999,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        backgroundColor: "#e0f2fe",
                                        color: "#0369a1",
                                        border: "1px solid #bae6fd",
                                      }}
                                    >
                                      {getPathwayTypeLabelFr(order.pathwaySession.type)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div
                              className="worklist-meta-rail"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                alignItems: "flex-end",
                                flexShrink: 0,
                                minWidth: 160,
                                borderTop: "1px solid #f1f5f9",
                                paddingTop: 12,
                                width: "100%",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  backgroundColor: pSoft.bg,
                                  color: pSoft.text,
                                  border: `1px solid ${pSoft.border}`,
                                }}
                              >
                                {getOrderPriorityLabelFr(pc)}
                              </span>
                              {renderActions(order, item)}
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
              </ul>
                ) : null}

            {pendingLocal.length > 0 ? (
              <div style={{ marginTop: filteredQueuePairs.length > 0 ? 32 : 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#0f172a" }}>
                  En attente de synchronisation
                </h2>
                <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>
                  Ordres créés sur cet appareil, non encore synchronisés avec le serveur.
                </p>
                {filteredPendingLocal.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredPendingLocal.map((row) => {
                    const pc = String(row.priority ?? "ROUTINE");
                    const pSoft = priorityBadgeSoft(pc);
                    const borderLeft = priorityBorder(pc);
                    return (
                      <li key={row.queueItemId}>
                        <article
                          className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                          style={{
                            overflow: "hidden",
                            borderRadius: 16,
                            border: "1px solid #fde68a",
                            backgroundColor: "#fffbeb",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                            borderLeftWidth: 4,
                            borderLeftStyle: "solid",
                            borderLeftColor: borderLeft,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 16,
                              padding: 16,
                              alignItems: "stretch",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", minWidth: 0, flex: "1 1 220px" }}>
                              <PendingEncounterPatientBlock facilityId={row.facilityId} encounterId={row.encounterId}>
                                <div
                                  style={{
                                    marginTop: 10,
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 10px",
                                      borderRadius: 9999,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      backgroundColor: "#f8fafc",
                                      color: "#334155",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    {ui.common.study} · {row.itemLabels.filter(Boolean).join(", ") || ui.common.dash}
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "4px 10px",
                                      borderRadius: 9999,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      backgroundColor: "#fef3c7",
                                      color: "#92400e",
                                      border: "1px solid #fde68a",
                                    }}
                                  >
                                    En attente de synchronisation
                                  </span>
                                </div>
                              </PendingEncounterPatientBlock>
                            </div>
                            <div
                              className="worklist-meta-rail"
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 10,
                                alignItems: "flex-end",
                                flexShrink: 0,
                                minWidth: 160,
                                borderTop: "1px solid #fde68a",
                                paddingTop: 12,
                                width: "100%",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "4px 10px",
                                  borderRadius: 9999,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  backgroundColor: pSoft.bg,
                                  color: pSoft.text,
                                  border: `1px solid ${pSoft.border}`,
                                }}
                              >
                                {getOrderPriorityLabelFr(pc)}
                              </span>
                              <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={btnVoir}>
                                Consultation
                              </Link>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
                ) : searchQuery.trim() ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>Aucun résultat dans la file locale pour cette recherche.</p>
                ) : null}
              </div>
            ) : null}
              </>
            )}
          </div>
        )}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media (min-width: 640px) {
            .worklist-meta-rail { border-top: none !important; padding-top: 0 !important; align-items: flex-end !important; text-align: right !important; width: auto !important; }
          }
        `,
          }}
        />
      </div>
    </div>
  );
}
