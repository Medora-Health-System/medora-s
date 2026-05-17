"use client";

import React, { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { tOrderItemStatusForWorklist, tOrderPriority, tPathwayType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { worklistItemIsTerminal, worklistItemNeedsAcknowledge } from "@/lib/worklistLabRadUi";
import { pairPassesLabRadReconciliationFilters } from "@/lib/worklistLabRadReconciliation";
import { analyzeLabRadWorklistItem } from "@/features/orders/labRadiologyOperationalReconciliationUi";
import { LabRadiologyReconciliationBadges } from "@/components/worklists/LabRadiologyReconciliationBadges";
import { orderIsCancelled, WORKLIST_ORDER_CANCELLED_BADGE_STYLE } from "@/lib/worklistOrderCancelledUi";
import {
  getEncounterPatientLabelFromCache,
  getPendingImagingOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardActionsMediaStyle,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  getPriorityBadgeSoft,
  getPriorityBorder,
} from "@/components/medora-card";

function patientInitials(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  const f = (p?.firstName ?? "").trim();
  const l = (p?.lastName ?? "").trim();
  const a = f.charAt(0) || "";
  const b = l.charAt(0) || f.charAt(1) || "";
  return (a + b).toUpperCase() || "?";
}

function fullPatientName(p: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  return `${(p?.firstName ?? "").trim()} ${(p?.lastName ?? "").trim()}`.trim() || DISPLAY_DASH;
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

const ACTIVE_WORKLIST_STATUSES = new Set(["PLACED", "ACKNOWLEDGED", "IN_PROGRESS", "PENDING"]);
const COMPLETED_WORKLIST_STATUSES = new Set(["COMPLETED", "RESULTED", "VERIFIED"]);

function isCompletedWorklistStatus(status: unknown): boolean {
  return COMPLETED_WORKLIST_STATUSES.has(String(status ?? ""));
}

function isActiveWorklistStatus(status: unknown): boolean {
  const s = String(status ?? "");
  return ACTIVE_WORKLIST_STATUSES.has(s) || !isCompletedWorklistStatus(s);
}

function PendingEncounterPatientBlock({
  facilityId,
  encounterId,
  children,
}: {
  facilityId: string;
  encounterId: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
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
          <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span> {mrn}
        </p>
        {children}
      </div>
    </div>
  );
}

export default function RadWorklistPage() {
  const { t, language } = useI18n();
  const { facilityId: facilityIdFromHook, ready } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  /** Dernière action worklist mise en file hors ligne uniquement. */
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNeedsReconciliation, setFilterNeedsReconciliation] = useState(false);
  const [filterAdjustedTime, setFilterAdjustedTime] = useState(false);
  const [filterDelayedWorkflow, setFilterDelayedWorkflow] = useState(false);

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
    const pendingP = getPendingImagingOrderRowsForFacility(facilityId, language);
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
          getOrderItemDisplayLabelFromLocale(item, language),
          tOrderPriority(t, pc),
          orderIsCancelled(order)
            ? t("worklistDepartments.shared.orderCancelledBadge")
            : tOrderItemStatusForWorklist(t, String(item.status)),
          order.pathwaySession ? tPathwayType(t, order.pathwaySession.type) : "",
        ].join(" ");
        if (rowMatchesSearch(searchQuery, blob)) out.push({ order, item });
      }
    }
    return out;
  }, [queue, searchQuery, t, language]);

  const filteredPendingLocal = useMemo(() => {
    return pendingLocal.filter((row) => {
      const blob = [
        ...row.itemLabels,
        tOrderPriority(t, String(row.priority ?? "ROUTINE")),
        row.encounterId,
        t("worklistDepartments.shared.syncPendingStatus"),
      ].join(" ");
      return rowMatchesSearch(searchQuery, blob);
    });
  }, [pendingLocal, searchQuery, t]);

  const reconciliationByItemId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof analyzeLabRadWorklistItem>>();
    for (const { order, item } of filteredQueuePairs) {
      map.set(
        item.id,
        analyzeLabRadWorklistItem({
          domain: "RADIOLOGY",
          order: { id: order.id, createdAt: order.createdAt, type: order.type },
          item,
          siblingItems: Array.isArray(order.items) ? order.items : [],
        })
      );
    }
    return map;
  }, [filteredQueuePairs]);

  const reconciliationFilteredPairs = useMemo(() => {
    if (!filterNeedsReconciliation && !filterAdjustedTime && !filterDelayedWorkflow) {
      return filteredQueuePairs;
    }
    return filteredQueuePairs.filter(({ item }) => {
      const analysis = reconciliationByItemId.get(item.id);
      if (!analysis) return false;
      return pairPassesLabRadReconciliationFilters(analysis, {
        needsReconciliation: filterNeedsReconciliation,
        adjustedTime: filterAdjustedTime,
        delayedWorkflow: filterDelayedWorkflow,
      });
    });
  }, [
    filteredQueuePairs,
    reconciliationByItemId,
    filterNeedsReconciliation,
    filterAdjustedTime,
    filterDelayedWorkflow,
  ]);

  const activeQueuePairs = useMemo(
    () => reconciliationFilteredPairs.filter(({ item }) => isActiveWorklistStatus(item.status)),
    [reconciliationFilteredPairs]
  );

  const completedQueuePairs = useMemo(
    () => reconciliationFilteredPairs.filter(({ item }) => isCompletedWorklistStatus(item.status)),
    [reconciliationFilteredPairs]
  );

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
      setQueuedActionNotice(queued ? t("worklistDepartments.shared.actionQueuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("worklistDepartments.shared.worklistActionAckFailed"));
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
      setQueuedActionNotice(queued ? t("worklistDepartments.shared.actionQueuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("worklistDepartments.shared.worklistActionStartFailed"));
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
      setQueuedActionNotice(queued ? t("worklistDepartments.shared.actionQueuedNotice") : null);
      loadQueue();
    } catch (error) {
      alert(t("worklistDepartments.shared.worklistActionCompleteFailed"));
    }
  };

  const renderActions = (order: any, item: any) => {
    const encounterHref = order.encounterId ? `/app/encounters/${order.encounterId}` : null;
    if (orderIsCancelled(order) || worklistItemIsTerminal(item.status)) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
          <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir}>
            {t("common.view")}
          </Link>
          {encounterHref ? (
            <Link href={encounterHref} style={btnGhost}>
              {t("worklistDepartments.shared.openEncounter")}
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {worklistItemNeedsAcknowledge(item.status) && (
            <button type="button" onClick={() => void handleAcknowledge(item.id)} style={btnGhost}>
              {t("worklistDepartments.shared.acknowledge")}
            </button>
          )}
          {item.status === "ACKNOWLEDGED" && (
            <button type="button" onClick={() => void handleStart(item.id)} style={btnGhost}>
              {t("worklistDepartments.shared.start")}
            </button>
          )}
          {item.status === "IN_PROGRESS" && (
            <button type="button" onClick={() => void handleComplete(item.id)} style={btnGhost}>
              {t("worklistDepartments.shared.complete")}
            </button>
          )}
        </div>
        <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir}>
          {t("common.view")}
        </Link>
        {encounterHref ? (
          <Link href={encounterHref} style={btnGhost}>
            {t("worklistDepartments.shared.openEncounter")}
          </Link>
        ) : null}
      </div>
    );
  };

  const renderQueueList = (pairs: { order: any; item: any }[]) => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
      {pairs.map(({ order, item }) => {
        const patient = order.encounter?.patient;
        const pc = String(order.priority ?? "ROUTINE");
        const pSoft = getPriorityBadgeSoft(pc);
        const borderLeft = getPriorityBorder(pc);
        const reconciliation = reconciliationByItemId.get(item.id);
        return (
          <li key={item.id}>
            <MedoraCard
              className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
              leftAccentColor={borderLeft}
              variant="default"
            >
              <MedoraCardInner>
                <MedoraCardIdentity initials={patientInitials(patient)}>
                  <MedoraCardTitle
                    title={fullPatientName(patient)}
                    subline={
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span>{" "}
                        {(patient?.mrn ?? "").trim() || t("common.dash")}
                      </p>
                    }
                  />
                  <MedoraCardBadgeRow>
                    <MedoraCardBadge preset="neutral">
                      {t("common.imagingStudy")} · {getOrderItemDisplayLabelFromLocale(item, language)}
                    </MedoraCardBadge>
                    {orderIsCancelled(order) ? (
                      <span style={WORKLIST_ORDER_CANCELLED_BADGE_STYLE}>
                        {t("worklistDepartments.shared.orderCancelledBadge")}
                      </span>
                    ) : (
                      <MedoraCardBadge preset="neutral">
                        {tOrderItemStatusForWorklist(t, String(item.status))}
                      </MedoraCardBadge>
                    )}
                    {order.pathwaySession ? (
                      <MedoraCardBadge preset="pathway">
                        {tPathwayType(t, order.pathwaySession.type)}
                      </MedoraCardBadge>
                    ) : null}
                  </MedoraCardBadgeRow>
                  {formatOrderAttributionLines(order, t, language).map((line) => (
                    <p key={line} style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
                      {line}
                    </p>
                  ))}
                  {reconciliation?.badges.length ? (
                    <LabRadiologyReconciliationBadges badges={reconciliation.badges} t={t} compact />
                  ) : null}
                </MedoraCardIdentity>

                <MedoraCardActions railBorderTopColor="#f1f5f9">
                  <MedoraCardBadge soft={pSoft}>{tOrderPriority(t, pc)}</MedoraCardBadge>
                  {renderActions(order, item)}
                </MedoraCardActions>
              </MedoraCardInner>
            </MedoraCard>
          </li>
        );
      })}
    </ul>
  );

  const renderSectionEmpty = (message: string) => (
    <div
      style={{
        borderRadius: 16,
        border: "1px dashed #cbd5e1",
        backgroundColor: "rgba(255,255,255,0.9)",
        padding: "20px 18px",
        color: "#64748b",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );

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
            {t("worklistDepartments.radiology.title")}
          </h1>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 720, lineHeight: 1.55 }}>
            {t("worklistDepartments.radiology.subtitle")}
          </p>
        </header>

        {!loading && (queue.length > 0 || pendingLocal.length > 0) ? (
          <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("worklistDepartments.shared.searchPlaceholderRad")}
              autoComplete="off"
              aria-label={t("worklistDepartments.shared.searchAria")}
              style={searchInputStyle}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filterNeedsReconciliation}
                  onChange={(e) => setFilterNeedsReconciliation(e.target.checked)}
                />
                {t("labRadReconciliation.filterNeedsReconciliation")}
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filterAdjustedTime}
                  onChange={(e) => setFilterAdjustedTime(e.target.checked)}
                />
                {t("labRadReconciliation.filterAdjustedTime")}
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={filterDelayedWorkflow}
                  onChange={(e) => setFilterDelayedWorkflow(e.target.checked)}
                />
                {t("labRadReconciliation.filterDelayedWorkflow")}
              </label>
            </div>
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
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#334155" }}>{t("worklistDepartments.radiology.empty")}</p>
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
                  {t("worklistDepartments.shared.emptySearch")}
                </p>
                <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b" }}>
                  {t("worklistDepartments.shared.searchHintAdjust")}
                </p>
              </div>
            ) : (
              <>
                <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    {t("worklistDepartments.shared.activeSectionTitle")}
                  </h2>
                  {activeQueuePairs.length > 0
                    ? renderQueueList(activeQueuePairs)
                    : renderSectionEmpty(t("worklistDepartments.shared.activeSectionEmpty"))}
                </section>

                <section style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>
                    {t("worklistDepartments.shared.completedSectionTitle")}
                  </h2>
                  {completedQueuePairs.length > 0
                    ? renderQueueList(completedQueuePairs)
                    : renderSectionEmpty(t("worklistDepartments.shared.completedSectionEmpty"))}
                </section>

            {pendingLocal.length > 0 ? (
              <div style={{ marginTop: 32 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#0f172a" }}>
                  {t("worklistDepartments.shared.syncPendingTitle")}
                </h2>
                <p style={{ fontSize: 13, color: "#856404", marginBottom: 12 }}>
                  {t("worklistDepartments.shared.syncPendingDescription")}
                </p>
                {filteredPendingLocal.length > 0 ? (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredPendingLocal.map((row) => {
                    const pc = String(row.priority ?? "ROUTINE");
                    const pSoft = getPriorityBadgeSoft(pc);
                    const borderLeft = getPriorityBorder(pc);
                    return (
                      <li key={row.queueItemId}>
                        <MedoraCard
                          className="transition-shadow duration-150 ease-out hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                          leftAccentColor={borderLeft}
                          variant="pendingSync"
                        >
                          <MedoraCardInner>
                            <div style={{ display: "flex", minWidth: 0, flex: "1 1 220px" }}>
                              <PendingEncounterPatientBlock facilityId={row.facilityId} encounterId={row.encounterId}>
                                <MedoraCardBadgeRow>
                                  <MedoraCardBadge preset="neutral">
                                    {t("common.imagingStudy")} · {row.itemLabels.filter(Boolean).join(", ") || t("common.dash")}
                                  </MedoraCardBadge>
                                  <MedoraCardBadge preset="syncPending">
                                    {t("worklistDepartments.shared.syncPendingStatus")}
                                  </MedoraCardBadge>
                                </MedoraCardBadgeRow>
                              </PendingEncounterPatientBlock>
                            </div>
                            <MedoraCardActions railBorderTopColor="#fde68a">
                              <MedoraCardBadge soft={pSoft}>{tOrderPriority(t, pc)}</MedoraCardBadge>
                              <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={btnVoir}>
                                {t("worklistDepartments.shared.visitLink")}
                              </Link>
                            </MedoraCardActions>
                          </MedoraCardInner>
                        </MedoraCard>
                      </li>
                    );
                  })}
                </ul>
                ) : searchQuery.trim() ? (
                  <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                    {t("worklistDepartments.shared.emptyLocalSearch")}
                  </p>
                ) : null}
              </div>
            ) : null}
              </>
            )}
          </div>
        )}
        <MedoraCardActionsMediaStyle />
      </div>
    </div>
  );
}
