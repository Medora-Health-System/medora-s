"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { apiFetch } from "@/lib/apiClient";
import Link from "next/link";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { tOrderItemStatusForWorklist, tOrderPriority, tPathwayType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  worklistItemIsTerminal,
  resolveLabRadQueueWorkflowAction,
  isRadiologyWorkflowActor,
  shouldShowDeptWorklistReadOnlyNotice,
  deptWorklistReadOnlyNoticeKey,
  type WorklistItemWorkflowAction,
} from "@/lib/worklistLabRadUi";
import { postWorklistItemWorkflowAction } from "@/lib/worklistLabRadWorkflowApi";
import {
  orderItemLifecycleIdempotentToastKey,
  orderItemLifecycleStaleStateMessageKey,
  shouldTreatLifecycleErrorAsStaleState,
} from "@/lib/mutateOrderItemLifecycleAction";
import {
  createOrderLifecycleMutationHandlers,
  mergeWorklistPayload,
  runOrderItemLifecycleUiMutation,
} from "@/lib/orderItemLifecycleUiSync";
import { subscribeToOrderItem } from "@/lib/orderStateSyncStore";
import {
  isOrderItemAnyWorkflowPending,
  isOrderItemWorkflowPending,
  orderItemWorkflowPendingKey,
  WORKLIST_WORKFLOW_BUSY_LABEL_KEY,
  workflowActionFailureMessageKey,
} from "@/lib/orderItemWorkflowUi";
import { DeptWorklistReadOnlyNotice } from "@/components/worklists/DeptWorklistReadOnlyNotice";
import { summarizeLabRadWorklistOperational, type LabRadWorklistSortMode } from "@medora/shared";
import {
  analyzeLabRadWorklistOperationalRow,
  type LabRadWorklistOperationalRow,
} from "@/features/orders/labRadiologyOperationalEscalationUi";
import { LabRadiologyOperationalBadges } from "@/components/worklists/LabRadiologyOperationalBadges";
import { LabRadiologyWorklistSummaryStrip } from "@/components/worklists/LabRadiologyWorklistSummaryStrip";
import { LabRadiologyWorklistOperationalToolbar } from "@/components/worklists/LabRadiologyWorklistOperationalToolbar";
import {
  pairPassesLabRadOperationalFilters,
  sortLabRadWorklistPairs,
  type LabRadWorklistOperationalFilters,
} from "@/lib/worklistLabRadOperational";
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
import {
  ancillaryTouchControlStyle,
  ancillaryWorklistFiltersRowStyle,
  ancillaryWorklistPageInnerStyle,
  ancillaryWorklistPageShellStyle,
  ancillaryWorklistQueueListStyle,
  ancillaryWorklistSearchInputStyle,
  resolveAncillaryLayoutMode,
  type AncillaryLayoutMode,
} from "@/features/ancillary/ancillaryResponsiveLayout";

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

const btnGhostBase: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  color: "#334155",
  textDecoration: "none",
};

const btnVoirBase: React.CSSProperties = {
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

function btnGhost(mode: AncillaryLayoutMode): React.CSSProperties {
  return ancillaryTouchControlStyle(btnGhostBase, mode);
}

function btnVoir(mode: AncillaryLayoutMode): React.CSSProperties {
  return ancillaryTouchControlStyle(btnVoirBase, mode);
}

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
  const { facilityId: facilityIdFromHook, ready, roles } = useFacilityAndRoles();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  /** Dernière action worklist mise en file hors ligne uniquement. */
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);
  const [pendingWorkflowAction, setPendingWorkflowAction] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<AncillaryLayoutMode>("desktopDense");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<LabRadWorklistSortMode>("OLDEST_FIRST");
  const [operationalFilters, setOperationalFilters] = useState<LabRadWorklistOperationalFilters>({
    needsReconciliation: false,
    adjustedTime: false,
    delayedWorkflow: false,
    needsEscalation: false,
    criticalDelay: false,
    awaitingResultOrFinalization: false,
    awaitingAcknowledgement: false,
    shiftHandoffReview: false,
    adjustedReconciled: false,
  });

  const isRadTechActor = isRadiologyWorkflowActor(roles);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => {
      setLayoutMode(resolveAncillaryLayoutMode(window.innerWidth));
    };
    applyLayoutMode();
    window.addEventListener("resize", applyLayoutMode);
    return () => window.removeEventListener("resize", applyLayoutMode);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || facilityIdFromHook || null);
  }, [facilityIdFromHook]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadQueue();
    const interval = setInterval(() => void loadQueue({ silent: true }), 10000);
    return () => clearInterval(interval);
  }, [ready, facilityId]);

  useEffect(() => {
    return subscribeToOrderItem(() => {
      setQueue((prev) => mergeWorklistPayload(prev));
    });
  }, []);

  const loadQueue = async (options?: { silent?: boolean }) => {
    if (!facilityId) return;
    const silent = Boolean(options?.silent) || hasLoadedOnceRef.current;
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    const pendingP = getPendingImagingOrderRowsForFacility(facilityId, language);
    try {
      const data = await apiFetch("/worklists/radiology", { facilityId });
      setQueue(mergeWorklistPayload(Array.isArray(data) ? data : []));
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error("Failed to load radiology worklist:", error);
      if (!silent) setQueue([]);
    }
    const pendingRows = await pendingP;
    setPendingLocal(pendingRows);
    if (silent) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
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

  const operationalByItemId = useMemo(() => {
    const map = new Map<string, LabRadWorklistOperationalRow>();
    for (const { order, item } of filteredQueuePairs) {
      map.set(
        item.id,
        analyzeLabRadWorklistOperationalRow({
          domain: "RADIOLOGY",
          order: {
            id: order.id,
            createdAt: order.createdAt,
            type: order.type,
            priority: order.priority,
          },
          item,
          siblingItems: Array.isArray(order.items) ? order.items : [],
        })
      );
    }
    return map;
  }, [filteredQueuePairs]);

  const operationalFilteredPairs = useMemo(() => {
    const withRow = filteredQueuePairs
      .map((pair) => ({
        ...pair,
        row: operationalByItemId.get(pair.item.id)!,
      }))
      .filter((p) => p.row);
    const filtered = withRow.filter((p) => pairPassesLabRadOperationalFilters(p.row, operationalFilters));
    return sortLabRadWorklistPairs(filtered, sortMode);
  }, [filteredQueuePairs, operationalByItemId, operationalFilters, sortMode]);

  const operationalSummary = useMemo(
    () =>
      summarizeLabRadWorklistOperational(
        filteredQueuePairs.map(({ item }) => {
          const row = operationalByItemId.get(item.id);
          return {
            escalation: row!.escalation,
            reconciliationFlags: row!.reconciliation.flags,
            isActive: isActiveWorklistStatus(item.status),
          };
        })
      ),
    [filteredQueuePairs, operationalByItemId]
  );

  const activeQueuePairs = useMemo(
    () => operationalFilteredPairs.filter(({ item }) => isActiveWorklistStatus(item.status)),
    [operationalFilteredPairs]
  );

  const completedQueuePairs = useMemo(
    () => operationalFilteredPairs.filter(({ item }) => isCompletedWorklistStatus(item.status)),
    [operationalFilteredPairs]
  );

  const handleWorkflowAction = async (
    action: WorklistItemWorkflowAction,
    itemId: string,
    itemStatus: string
  ) => {
    if (!facilityId || isOrderItemAnyWorkflowPending(pendingWorkflowAction, itemId)) return;
    setPendingWorkflowAction(orderItemWorkflowPendingKey(itemId, action));
    setQueuedActionNotice(null);
    try {
      const result = await runOrderItemLifecycleUiMutation({
        action,
        itemId,
        facilityId,
        currentStatus: itemStatus,
        mutate: (workflowAction, lineId, facId) =>
          postWorklistItemWorkflowAction(workflowAction, lineId, facId, itemStatus, {
            cacheScope: { worklists: ["radiology"] },
          }),
        handlers: createOrderLifecycleMutationHandlers({
          itemId,
          action,
          collectionKind: "worklist",
          applyCollection: (transform) => {
            setQueue((prev) => transform(prev) as typeof prev);
          },
        }),
      });
      setQueuedActionNotice(result.queued ? t("worklistDepartments.shared.actionQueuedNotice") : null);
      if (result.idempotent) {
        setQueuedActionNotice(t(orderItemLifecycleIdempotentToastKey(action)));
      }
      void loadQueue({ silent: true });
    } catch (error) {
      const httpStatus = (error as { status?: number }).status;
      if (shouldTreatLifecycleErrorAsStaleState(action, itemStatus, httpStatus)) {
        alert(t(orderItemLifecycleStaleStateMessageKey()));
        void loadQueue({ silent: true });
        return;
      }
      console.error("Radiology worklist workflow action failed:", error);
      alert(t(workflowActionFailureMessageKey(action, "worklist")));
    } finally {
      setPendingWorkflowAction(null);
    }
  };

  const workflowActionLabel = (
    action: WorklistItemWorkflowAction,
    itemId: string,
    idleKey: string
  ): string => {
    if (isOrderItemWorkflowPending(pendingWorkflowAction, itemId, action)) {
      return t(WORKLIST_WORKFLOW_BUSY_LABEL_KEY[action]);
    }
    return t(idleKey);
  };

  const renderActions = (order: any, item: any) => {
    const encounterHref = order.encounterId ? `/app/encounters/${order.encounterId}` : null;
    const showReadOnlyNotice = shouldShowDeptWorklistReadOnlyNotice({
      roles,
      kind: "radiology",
      status: item.status,
      orderCancelled: orderIsCancelled(order),
    });
    const workflowAction = resolveLabRadQueueWorkflowAction({
      status: item.status,
      orderCancelled: orderIsCancelled(order),
      viewerIsDeptActor: isRadTechActor,
    });
    const workflowBusy = isOrderItemAnyWorkflowPending(pendingWorkflowAction, item.id);
    const workflowLabel =
      workflowAction === "acknowledge"
        ? workflowActionLabel("acknowledge", item.id, "worklistDepartments.shared.acknowledge")
        : workflowAction === "start"
          ? workflowActionLabel("start", item.id, "worklistDepartments.shared.start")
          : workflowAction === "complete"
            ? workflowActionLabel("complete", item.id, "worklistDepartments.shared.complete")
            : null;

    if (orderIsCancelled(order) || worklistItemIsTerminal(item.status)) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
          <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir(layoutMode)}>
            {t("common.view")}
          </Link>
          {encounterHref ? (
            <Link href={encounterHref} style={btnGhost(layoutMode)}>
              {t("worklistDepartments.shared.openEncounter")}
            </Link>
          ) : null}
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", width: "100%" }}>
        {showReadOnlyNotice ? (
          <DeptWorklistReadOnlyNotice message={t(deptWorklistReadOnlyNoticeKey("radiology"))} />
        ) : null}
        {workflowAction && workflowLabel ? (
          <button
            type="button"
            data-testid={`rad-worklist-workflow-${workflowAction}-${item.id}`}
            disabled={workflowBusy}
            onClick={() => void handleWorkflowAction(workflowAction, item.id, String(item.status))}
            style={{
              ...btnVoir(layoutMode),
              cursor: workflowBusy ? "not-allowed" : "pointer",
              opacity: workflowBusy ? 0.7 : 1,
            }}
          >
            {workflowLabel}
          </button>
        ) : null}
        <Link href={`/app/rad-worklist/commande/${order.id}?ligne=${item.id}`} style={btnVoir(layoutMode)}>
          {t("common.view")}
        </Link>
        {encounterHref ? (
          <Link href={encounterHref} style={btnGhost(layoutMode)}>
            {t("worklistDepartments.shared.openEncounter")}
          </Link>
        ) : null}
      </div>
    );
  };

  const renderQueueList = (pairs: { order: any; item: any }[]) => (
    <ul style={ancillaryWorklistQueueListStyle(layoutMode)}>
      {pairs.map(({ order, item }) => {
        const patient = order.encounter?.patient;
        const pc = String(order.priority ?? "ROUTINE");
        const pSoft = getPriorityBadgeSoft(pc);
        const borderLeft = getPriorityBorder(pc);
        const operational = operationalByItemId.get(item.id);
        return (
          <li key={item.id} style={{ minWidth: 0 }}>
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
                  {operational ? (
                    <LabRadiologyOperationalBadges
                      escalationBadges={operational.escalationBadges}
                      reconciliationBadges={operational.reconciliation.badges}
                      t={t}
                      compact
                    />
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
    <div
      style={ancillaryWorklistPageShellStyle()}
      data-testid="rad-worklist-layout"
      data-layout-mode={layoutMode}
    >
      <div style={{ ...ancillaryWorklistPageInnerStyle(), padding: "0 16px" }}>
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
          <>
            {refreshing ? (
              <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#64748b" }}>{t("common.refreshing")}</p>
            ) : null}
            <LabRadiologyWorklistSummaryStrip summary={operationalSummary} t={t} />
            <div style={ancillaryWorklistFiltersRowStyle(layoutMode)}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("worklistDepartments.shared.searchPlaceholderRad")}
              autoComplete="off"
              aria-label={t("worklistDepartments.shared.searchAria")}
              style={ancillaryWorklistSearchInputStyle()}
            />
              <LabRadiologyWorklistOperationalToolbar
                filters={operationalFilters}
                onFiltersChange={setOperationalFilters}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                layoutMode={layoutMode}
                t={t}
              />
            </div>
          </>
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
                <ul style={ancillaryWorklistQueueListStyle(layoutMode)}>
                  {filteredPendingLocal.map((row) => {
                    const pc = String(row.priority ?? "ROUTINE");
                    const pSoft = getPriorityBadgeSoft(pc);
                    const borderLeft = getPriorityBorder(pc);
                    return (
                      <li key={row.queueItemId} style={{ minWidth: 0 }}>
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
                              <Link href={`/app/encounters/${row.encounterId}?tab=orders`} style={btnVoir(layoutMode)}>
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
