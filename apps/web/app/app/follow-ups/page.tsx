"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchUpcomingFollowUps,
  completeFollowUp,
  cancelFollowUp,
  type FollowUpRow,
} from "@/lib/followUpsApi";
import { CreateFollowUpModal } from "@/components/patient-chart";
import { encounterBcp47, tFollowUpStatus } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";
import { invalidateClinicFollowUpProjectionCache } from "@/lib/invalidateClinicFollowUpProjectionCache";

function formatDate(d: string | null | undefined, locale: string, emptyDash: string) {
  return d ? new Date(d).toLocaleDateString(locale) : emptyDash;
}

function statusBadge(status: string, t: (key: string) => string) {
  const style: React.CSSProperties =
    status === "OPEN"
      ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e3f2fd", color: "#1565c0" }
      : status === "COMPLETED"
        ? { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#e8f5e9", color: "#2e7d32" }
        : { padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, backgroundColor: "#f5f5f5", color: "#616161" };
  return <span style={style}>{tFollowUpStatus(t, status)}</span>;
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

function readInitialFilters(sp: URLSearchParams) {
  const dateFrom = sp.get("dateFrom") || sp.get("from");
  const dateTo = sp.get("dateTo") || sp.get("to");
  const status = sp.get("status");
  const actionable = sp.get("actionable") === "1" || sp.get("actionable") === "true";
  const endExclusive = sp.get("endExclusive");
  const statusFilter =
    status === "OPEN" || status === "COMPLETED" || status === "CANCELLED"
      ? status
      : actionable
        ? "OPEN"
        : "ALL";
  return {
    fromDate: dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom) ? dateFrom : getDefaultFrom(),
    toDate: dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : getDefaultTo(),
    statusFilter: statusFilter as "ALL" | "OPEN" | "COMPLETED" | "CANCELLED",
    actionable,
    endExclusive: endExclusive && !Number.isNaN(Date.parse(endExclusive)) ? endExclusive : null,
  };
}

export default function FollowUpsPage() {
  const { t, language } = useI18n();
  const dateLocale = encounterBcp47(language);
  const dash = t("common.dash");
  const searchParams = useSearchParams();
  const initial = useMemo(() => readInitialFilters(searchParams), [searchParams]);
  const { facilityId, roles, ready: rolesReady } = useFacilityAndRoles();
  const { isOffline } = useConnectivityStatus();
  const [items, setItems] = useState<FollowUpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "COMPLETED" | "CANCELLED">(
    initial.statusFilter
  );
  const [actionableMode, setActionableMode] = useState(initial.actionable);
  const [endExclusive, setEndExclusive] = useState<string | null>(initial.endExclusive);
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
    const toastHideTimer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(toastHideTimer);
  }, [toast]);

  useEffect(() => {
    const next = readInitialFilters(searchParams);
    setFromDate(next.fromDate);
    setToDate(next.toDate);
    setStatusFilter(next.statusFilter);
    setActionableMode(next.actionable);
    setEndExclusive(next.endExclusive);
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setLoadFailed(false);
    const cacheKey = `followups:${facilityId}:${fromDate}:${toDate}:${actionableMode}:${endExclusive ?? ""}`;
    try {
      const res = await fetchUpcomingFollowUps(facilityId, {
        from: actionableMode ? undefined : fromDate,
        to: toDate,
        endExclusive: actionableMode && endExclusive ? endExclusive : undefined,
        actionable: actionableMode,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        limit: 200,
      });
      setItems(res.items ?? []);
      void setCachedRecord("followups", cacheKey, res.items ?? [], { facilityId });
    } catch (e) {
      console.error("Failed to load follow-ups:", e);
      setLoadFailed(true);
      const cached = await getCachedRecord<FollowUpRow[]>("followups", cacheKey);
      if (cached?.data) {
        setItems(cached.data);
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [facilityId, fromDate, toDate, actionableMode, endExclusive, statusFilter]);

  useEffect(() => {
    if (facilityId) void load();
  }, [facilityId, load]);

  const afterMutation = useCallback(async () => {
    if (facilityId) invalidateClinicFollowUpProjectionCache(facilityId);
    await load();
  }, [facilityId, load]);

  const handleComplete = async (id: string) => {
    if (!facilityId || actionId) return;
    setActionId(id);
    try {
      const res = await completeFollowUp(facilityId, id);
      await afterMutation();
      if ((res as { queued?: boolean })?.queued) {
        showToast("ok", t("followUpsPage.toastOfflineSaved"));
      } else {
        showToast("ok", t("followUpsPage.toastCompleteOk"));
      }
    } catch (e) {
      console.error(e);
      showToast("err", t("followUpsPage.toastUpdateErr"));
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!facilityId || actionId) return;
    setActionId(id);
    try {
      const res = await cancelFollowUp(facilityId, id);
      await afterMutation();
      if ((res as { queued?: boolean })?.queued) {
        showToast("ok", t("followUpsPage.toastOfflineSaved"));
      } else {
        showToast("ok", t("followUpsPage.toastCancelOk"));
      }
    } catch (e) {
      console.error(e);
      showToast("err", t("followUpsPage.toastUpdateErr"));
    } finally {
      setActionId(null);
    }
  };

  const filteredSorted = items
    .filter((fu) => {
      if (statusFilter !== "ALL" && fu.status !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      const hay = `${fu.patient?.firstName ?? ""} ${fu.patient?.lastName ?? ""} ${fu.patient?.mrn ?? ""} ${fu.reason ?? ""} ${fu.createdBy?.firstName ?? ""} ${fu.createdBy?.lastName ?? ""}`.toLowerCase();
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
          <h1 style={{ margin: "0 0 8px 0" }}>{t("followUpsPage.title")}</h1>
          <p style={{ fontSize: 14, color: "#666", margin: 0 }}>{t("followUpsPage.intro")}</p>
          {actionableMode ? (
            <p style={{ fontSize: 12, color: "#0f766e", margin: "8px 0 0 0" }}>
              {t("followUpsPage.actionableFilterNote")}
            </p>
          ) : null}
          {isOffline && (
            <p style={{ fontSize: 12, color: "#8a4b08", margin: "8px 0 0 0" }}>
              {t("followUpsPage.offlineCacheNote")}
            </p>
          )}
        </div>
        {canCreate && (
          <button type="button" style={btnPrimary} onClick={() => setShowAddModal(true)}>
            {t("followUpsPage.addFollowUp")}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{t("followUpsPage.searchPatientOrReason")}</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("followUpsPage.searchPlaceholder")}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4, minWidth: 240 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{t("followUpsPage.statusLabel")}</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setActionableMode(false);
              setEndExclusive(null);
              setStatusFilter(e.target.value as "ALL" | "OPEN" | "COMPLETED" | "CANCELLED");
            }}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          >
            <option value="ALL">{t("followUpsPage.statusAll")}</option>
            <option value="OPEN">{t("followUpsPage.statusOpen")}</option>
            <option value="COMPLETED">{t("followUpsPage.statusCompleted")}</option>
            <option value="CANCELLED">{t("followUpsPage.statusCancelled")}</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{t("followUpsPage.dateFrom")}</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setActionableMode(false);
              setEndExclusive(null);
              setFromDate(e.target.value);
            }}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14 }}>{t("followUpsPage.dateTo")}</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setActionableMode(false);
              setEndExclusive(null);
              setToDate(e.target.value);
            }}
            style={{ padding: "8px 10px", fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
          />
        </label>
        <button type="button" style={{ ...btnSecondary, fontWeight: 600 }} onClick={() => void load()} disabled={loading}>
          {loading ? t("common.loading") : t("common.apply")}
        </button>
      </div>

      {loadFailed && !items.length ? (
        <div
          role="alert"
          style={{ padding: 24, backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#991b1b" }}
        >
          {t("followUpsPage.loadFailed")}
          <button type="button" style={{ ...btnSecondary, marginLeft: 12 }} onClick={() => void load()}>
            {t("followUpsPage.retry")}
          </button>
        </div>
      ) : loading && !filteredSorted.length ? (
        <div style={{ padding: 40, textAlign: "center", color: "#666" }}>{t("followUpsPage.loadingList")}</div>
      ) : filteredSorted.length === 0 ? (
        <div style={{ padding: 24, backgroundColor: "#fafafa", border: "1px solid #eee", borderRadius: 8, color: "#555" }}>
          {t("followUpsPage.emptyNone")}
          {canCreate ? ` ${t("followUpsPage.emptyHintCreate")}` : null}
        </div>
      ) : (
        <table style={tableStyles.table} data-testid="follow-ups-list-table">
          <thead>
            <tr>
              <th style={tableStyles.th}>{t("followUpsPage.colPatient")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colNir")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colFollowUpDate")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colTime")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colReason")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colStatus")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colCreatedMeta")}</th>
              <th style={tableStyles.th}>{t("followUpsPage.colActions")}</th>
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
                <td style={tableStyles.td}>{fu.patient?.mrn || dash}</td>
                <td style={tableStyles.td}>
                  {formatDate(fu.dueDate, dateLocale, dash)}
                  {isOverdue(fu) ? (
                    <div style={{ fontSize: 11, color: "#b26a00", marginTop: 2 }}>{t("followUpsPage.badgeOverdue")}</div>
                  ) : isToday(fu) && fu.status === "OPEN" ? (
                    <div style={{ fontSize: 11, color: "#1565c0", marginTop: 2 }}>{t("followUpsPage.badgeToday")}</div>
                  ) : null}
                </td>
                <td style={tableStyles.td}>
                  {new Date(fu.dueDate).toLocaleTimeString(dateLocale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={tableStyles.td}>{fu.reason || dash}</td>
                <td style={tableStyles.td}>{statusBadge(fu.status, t)}</td>
                <td style={tableStyles.td}>
                  <div style={{ fontSize: 12, color: "#555" }}>
                    {fu.createdBy
                      ? `${t("followUpsPage.createdByPrefix")} ${fu.createdBy.firstName} ${fu.createdBy.lastName}`
                      : t("followUpsPage.createdUnknown")}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                    {t("followUpsPage.createdOnPrefix")} {formatDate(fu.createdAt, dateLocale, dash)}
                  </div>
                  {fu.completedAt ? (
                    <div style={{ fontSize: 12, color: "#2e7d32", marginTop: 2 }}>
                      {t("followUpsPage.completedOnPrefix")} {formatDate(fu.completedAt, dateLocale, dash)}
                    </div>
                  ) : null}
                </td>
                <td style={tableStyles.td}>
                  <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href={`/app/patients/${fu.patientId}`} style={{ ...btnSecondary, textDecoration: "none", display: "inline-block" }}>
                      {t("followUpsPage.openChart")}
                    </Link>
                    {fu.encounterId ? (
                      <Link
                        href={`/app/encounters/${fu.encounterId}`}
                        style={{ ...btnSecondary, textDecoration: "none", display: "inline-block" }}
                      >
                        {t("followUpsPage.openEncounter")}
                      </Link>
                    ) : null}
                    {fu.status === "OPEN" && canCompleteCancel && (
                      <>
                        <button
                          type="button"
                          style={btnSecondary}
                          onClick={() => void handleComplete(fu.id)}
                          disabled={actionId !== null}
                        >
                          {actionId === fu.id ? "…" : t("followUpsPage.markComplete")}
                        </button>
                        <button
                          type="button"
                          style={btnSecondary}
                          onClick={() => void handleCancel(fu.id)}
                          disabled={actionId !== null}
                        >
                          {actionId === fu.id ? "…" : t("followUpsPage.cancelFollowUp")}
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

      {showAddModal && facilityId ? (
        <CreateFollowUpModal
          facilityId={facilityId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            if (facilityId) invalidateClinicFollowUpProjectionCache(facilityId);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
