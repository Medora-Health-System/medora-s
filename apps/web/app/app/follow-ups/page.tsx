"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchUpcomingFollowUps,
  completeFollowUp,
  cancelFollowUp,
  type FollowUpRow,
} from "@/lib/followUpsApi";
import { CreateFollowUpModal } from "@/components/patient-chart";
import { getFollowUpStatusLabelFr } from "@/lib/uiLabels";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";

function formatDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

function statusBadge(status: string) {
  const style: React.CSSProperties =
    status === "OPEN"
      ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e3f2fd", color: "#1565c0" }
      : status === "COMPLETED"
        ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e8f5e9", color: "#2e7d32" }
        : { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#f5f5f5", color: "#616161" };
  return <span style={style}>{getFollowUpStatusLabelFr(status)}</span>;
}

function isOverdue(item: FollowUpRow) {
  if (item.status !== "OPEN") return false;
  const due = new Date(item.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  const d0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return due.getTime() < d0;
}

function isToday(item: FollowUpRow) {
  const d = new Date(item.dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const t = new Date();
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  );
}

function getDefaultFrom() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function getDefaultTo() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function canCreateFollowUpRole(roles: string[]) {
  return (
    roles.includes("FRONT_DESK") ||
    roles.includes("RN") ||
    roles.includes("PROVIDER") ||
    roles.includes("ADMIN")
  );
}

function canManageFollowUpStatusRole(roles: string[]) {
  return roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN");
}

export default function FollowUpsPage() {
  const { facilityId, roles, ready: rolesReady } = useFacilityAndRoles();
  const { isOffline } = useConnectivityStatus();
  const [items, setItems] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(getDefaultFrom);
  const [toDate, setToDate] = useState(getDefaultTo);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "COMPLETED" | "CANCELLED">("ALL");
  const [actionId, setActionId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; message: string } | null>(null);

  const canCreate = rolesReady && canCreateFollowUpRole(roles);
  const canCompleteCancel = rolesReady && canManageFollowUpStatusRole(roles);

  const showToast = useCallback((type: "ok" | "err", message: string) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `followups:${facilityId}:${fromDate}:${toDate}`;
    try {
      const res = await fetchUpcomingFollowUps(facilityId, {
        from: fromDate,
        to: toDate,
        limit: 100,
      });
      setItems(res.items ?? []);
      void setCachedRecord("followups", cacheKey, res.items ?? [], { facilityId });
    } catch (e) {
      console.error("Failed to load follow-ups:", e);
      const cached = await getCachedRecord<FollowUpRow[]>("followups", cacheKey);
      setItems(cached?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [facilityId, fromDate, toDate]);

  useEffect(() => {
    if (facilityId) load();
  }, [facilityId, load]);

  const handleComplete = async (id: string) => {
    if (!facilityId || actionId) return;
    setActionId(id);
    try {
      const res = await completeFollowUp(facilityId, id);
      await load();
      if ((res as any)?.queued) {
        showToast("ok", "Mise à jour enregistrée hors ligne");
      } else {
        showToast("ok", "Suivi marqué comme terminé");
      }
    } catch (e) {
      console.error(e);
      showToast("err", "Impossible de mettre à jour le suivi");
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!facilityId || actionId) return;
    setActionId(id);
    try {
      const res = await cancelFollowUp(facilityId, id);
      await load();
      if ((res as any)?.queued) {
        showToast("ok", "Mise à jour enregistrée hors ligne");
      } else {
        showToast("ok", "Suivi annulé");
      }
    } catch (e) {
      console.error(e);
      showToast("err", "Impossible de mettre à jour le suivi");
    } finally {
      setActionId(null);
    }
  };

  const filteredSorted = items
    .filter((fu) => {
      if (statusFilter !== "ALL" && fu.status !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const hay = `${fu.patient?.firstName ?? ""} ${fu.patient?.lastName ?? ""} ${fu.patient?.mrn ?? ""} ${fu.reason ?? ""}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const rank = (x: FollowUpRow) => {
        if (isOverdue(x)) return 0;
        if (x.status === "OPEN" && isToday(x)) return 1;
        if (x.status === "OPEN") return 2;
        if (x.status === "COMPLETED") return 3;
        return 4;
      };
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const tableStyles = {
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
    th: { textAlign: "left" as const, padding: "10px 12px", borderBottom: "2px solid #ddd", fontWeight: 600 },
    td: { padding: "10px 12px", borderBottom: "1px solid #eee" },
  };
  const btnSecondary: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 13,
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  };
  const btnPrimary: React.CSSProperties = {
    padding: "10px 18px",
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    borderRadius: 4,
    background: "#1a1a1a",
    color: "white",
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 24, position: "relative" }}>
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2000,
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            backgroundColor: toast.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: toast.type === "ok" ? "#1b5e20" : "#b71c1c",
            border: `1px solid ${toast.type === "ok" ? "#a5d6a7" : "#ef9a9a"}`,
          }}
        >
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 8 }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0" }}>Suivis</h1>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
            Filtrer par plage de dates. Créer un suivi pour un patient (recherche par nom ou NIR).
          </p>
          {isOffline && (
            <p style={{ fontSize: 12, color: "#8a4b08", margin: "8px 0 0 0" }}>
              Données affichées depuis le cache local.
            </p>
          )}
        </div>
        {canCreate && (
          <button type="button" style={btnPrimary} onClick={() => setShowAddModal(true)}>
            Ajouter un suivi
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>Rechercher un patient ou un motif</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom, NIR, motif…"
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4, minWidth: 240 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "OPEN" | "COMPLETED" | "CANCELLED")}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          >
            <option value="ALL">Tous les statuts</option>
            <option value="OPEN">Planifiés</option>
            <option value="COMPLETED">Terminés</option>
            <option value="CANCELLED">Annulés</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>Du</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>Au</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>
        <button type="button" style={{ ...btnSecondary, fontWeight: 600 }} onClick={load} disabled={loading}>
          {loading ? "Chargement…" : "Appliquer"}
        </button>
      </div>

      {loading && !filteredSorted.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>Chargement des suivis…</div>
      ) : filteredSorted.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: "#fafafa", border: "1px solid #eee", borderRadius: 8, color: "#555" }}>
          Aucun suivi trouvé.
          {canCreate ? " Utilisez « Ajouter un suivi » pour en créer un." : null}
        </div>
      ) : (
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Patient</th>
              <th style={tableStyles.th}>NIR</th>
              <th style={tableStyles.th}>Date de suivi</th>
              <th style={tableStyles.th}>Heure</th>
              <th style={tableStyles.th}>Motif</th>
              <th style={tableStyles.th}>Statut</th>
              <th style={tableStyles.th}>Créé par / date</th>
              <th style={tableStyles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((fu) => (
              <tr key={fu.id} style={isOverdue(fu) ? { backgroundColor: "#fff8e1" } : undefined}>
                <td style={tableStyles.td}>
                  <Link href={`/app/patients/${fu.patientId}`} style={{ color: "#1565c0", textDecoration: "none" }}>
                    {fu.patient
                      ? `${fu.patient.firstName} ${fu.patient.lastName}${fu.patient.mrn ? ` (${fu.patient.mrn})` : ""}`
                      : fu.patientId}
                  </Link>
                </td>
                <td style={tableStyles.td}>{fu.patient?.mrn || "—"}</td>
                <td style={tableStyles.td}>
                  {formatDate(fu.dueDate)}
                  {isOverdue(fu) ? (
                    <div style={{ fontSize: 11, color: "#b26a00", marginTop: 2 }}>En retard</div>
                  ) : isToday(fu) && fu.status === "OPEN" ? (
                    <div style={{ fontSize: 11, color: "#1565c0", marginTop: 2 }}>Aujourd’hui</div>
                  ) : null}
                </td>
                <td style={tableStyles.td}>
                  {new Date(fu.dueDate).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={tableStyles.td}>{fu.reason || "—"}</td>
                <td style={tableStyles.td}>{statusBadge(fu.status)}</td>
                <td style={tableStyles.td}>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {fu.createdBy
                      ? `Créé par ${fu.createdBy.firstName} ${fu.createdBy.lastName}`
                      : "Créé par —"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    Créé le {formatDate(fu.createdAt)}
                  </div>
                  {fu.completedAt ? (
                    <div style={{ fontSize: 12, color: "#2e7d32", marginTop: 2 }}>
                      Terminé le {formatDate(fu.completedAt)}
                    </div>
                  ) : null}
                </td>
                <td style={tableStyles.td}>
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/app/patients/${fu.patientId}`} style={{ ...btnSecondary, textDecoration: "none", display: "inline-block" }}>
                      Ouvrir le dossier
                    </Link>
                  {fu.status === "OPEN" && canCompleteCancel && (
                    <>
                      <button
                        type="button"
                        style={btnSecondary}
                        onClick={() => handleComplete(fu.id)}
                        disabled={actionId !== null}
                      >
                        {actionId === fu.id ? "…" : "Marquer comme terminé"}
                      </button>
                      <button
                        type="button"
                        style={{ ...btnSecondary, color: "#c62828", borderColor: "#c62828" }}
                        onClick={() => handleCancel(fu.id)}
                        disabled={actionId !== null}
                      >
                        Annuler le suivi
                      </button>
                    </>
                  )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && facilityId && (
        <CreateFollowUpModal
          facilityId={facilityId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            void load();
            showToast(
              "ok",
              isOffline ? "Suivi enregistré hors ligne" : "Suivi ajouté"
            );
          }}
        />
      )}
    </div>
  );
}
