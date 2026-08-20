"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ENTERPRISE_ORDER_ORIGINS,
  enterpriseOrderOriginLabelKey,
  filterAmbulatoryLabRadWorklistOrders,
  formatEnterpriseOrderOriginDisplay,
  projectLabTechnicianKpis,
  projectRadiologyTechnicianKpis,
  sortTechnicianWorklistRows,
  type TechnicianWorkStatus,
  type TechnicianWorklistSortMode,
} from "@medora/shared";
import { OrderLifecycleErrorBoundary } from "@/components/orders/OrderLifecycleErrorBoundary";
import { LabRadTechnicianDetailDrawer } from "@/components/worklists/LabRadTechnicianDetailDrawer";
import {
  getPriorityBadgeSoft,
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardInner,
  getPriorityBorder,
} from "@/components/medora-card";
import { analyzeLabRadWorklistOperationalRow } from "@/features/orders/labRadiologyOperationalEscalationUi";
import {
  ancillaryTouchControlStyle,
  resolveAncillaryLayoutMode,
  type AncillaryLayoutMode,
} from "@/features/ancillary/ancillaryResponsiveLayout";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch } from "@/lib/apiClient";
import { tOrderItemStatusForWorklist, tOrderPriority } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import {
  projectLabRadTechnicianRow,
  rowMatchesSearch,
  shortOrderId,
  type LabRadTechnicianKind,
  type LabRadTechnicianProjectedRow,
} from "@/lib/labRadTechnicianWorklistModel";
import {
  orderItemLifecycleIdempotentToastKey,
  orderItemLifecycleStaleStateMessageKey,
  shouldTreatLifecycleErrorAsStaleState,
} from "@/lib/mutateOrderItemLifecycleAction";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";
import {
  createOrderLifecycleMutationHandlers,
  mergeWorklistPayload,
  runOrderItemLifecycleUiMutation,
} from "@/lib/orderItemLifecycleUiSync";
import {
  isOrderItemAnyWorkflowPending,
  isOrderItemWorkflowPending,
  orderItemWorkflowPendingKey,
  WORKLIST_WORKFLOW_BUSY_LABEL_KEY,
  workflowActionFailureMessageKey,
} from "@/lib/orderItemWorkflowUi";
import { ingestServerOrderPayload, subscribeToOrderItem } from "@/lib/orderStateSyncStore";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  getEncounterPatientLabelFromCache,
  getPendingImagingOrderRowsForFacility,
  getPendingLabOrderRowsForFacility,
  type PendingFacilityQueueRow,
} from "@/lib/offline/pendingEncounterOrders";
import {
  deptWorklistReadOnlyNoticeKey,
  isLabTestWorkflowActor,
  isRadiologyWorkflowActor,
  shouldShowDeptWorklistReadOnlyNotice,
  worklistItemAllowsComplete,
  worklistItemAllowsStart,
  worklistItemNeedsAcknowledge,
  type WorklistItemWorkflowAction,
} from "@/lib/worklistLabRadUi";
import {
  pairPassesLabRadOperationalFilters,
  type LabRadWorklistOperationalFilters,
} from "@/lib/worklistLabRadOperational";
import { postWorklistItemWorkflowAction } from "@/lib/worklistLabRadWorkflowApi";
import { orderIsCancelled } from "@/lib/worklistOrderCancelledUi";

const TABS: TechnicianWorkStatus[] = ["NEW", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

const EMPTY_OPS_FILTERS: LabRadWorklistOperationalFilters = {
  needsReconciliation: false,
  adjustedTime: false,
  delayedWorkflow: false,
  needsEscalation: false,
  criticalDelay: false,
  awaitingResultOrFinalization: false,
  awaitingAcknowledgement: false,
  shiftHandoffReview: false,
  adjustedReconciled: false,
};

const SELECT_STYLE: React.CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  padding: "0 10px",
  fontSize: 13,
  color: "#0f172a",
  minWidth: 140,
};

const SEARCH_STYLE: React.CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  backgroundColor: "#fff",
  padding: "0 12px",
  fontSize: 13,
  color: "#0f172a",
  width: "100%",
  maxWidth: 360,
  boxSizing: "border-box",
};

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 44,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  backgroundColor: "#2563eb",
  color: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const GHOST_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  minWidth: 44,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

function formatInstant(raw: string | Date | null | undefined, language: string): string {
  if (raw == null || raw === "") return DISPLAY_DASH;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return DISPLAY_DASH;
  return d.toLocaleString(language === "en" ? "en" : "fr", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function PendingEncounterPatientBlock({
  facilityId,
  encounterId,
}: {
  facilityId: string;
  encounterId: string;
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
  return (
    <div>
      <div style={{ fontWeight: 600, color: "#0f172a" }}>{name}</div>
      <div style={{ fontSize: 12, color: "#64748b" }}>
        {t("common.nir")} {mrn}
      </div>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: "critical" | "warn" | "default" }) {
  const valueColor =
    tone === "critical" ? "#b91c1c" : tone === "warn" ? "#c2410c" : "#0f172a";
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "10px 12px",
        minWidth: 0,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

export function LabRadTechnicianWorklistDashboard({ kind }: { kind: LabRadTechnicianKind }) {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const ambulatoryOnly =
    searchParams?.get("ambulatory") === "1" || searchParams?.get("source") === "clinic-care";
  const { facilityId: facilityIdFromHook, ready, roles } = useFacilityAndRoles();

  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [pendingLocal, setPendingLocal] = useState<PendingFacilityQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [queuedActionNotice, setQueuedActionNotice] = useState<string | null>(null);
  const [pendingWorkflowAction, setPendingWorkflowAction] = useState<string | null>(null);
  const pendingWorkflowActionRef = useRef<string | null>(null);
  const setPendingWorkflow = (key: string | null) => {
    pendingWorkflowActionRef.current = key;
    setPendingWorkflowAction(key);
  };
  const [layoutMode, setLayoutMode] = useState<AncillaryLayoutMode>("desktopDense");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TechnicianWorkStatus>("NEW");
  const [sortMode, setSortMode] = useState<TechnicianWorklistSortMode>("PRIORITY_NEWEST");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [modalityFilter, setModalityFilter] = useState<string>("ALL");
  const [operationalFilters, setOperationalFilters] =
    useState<LabRadWorklistOperationalFilters>(EMPTY_OPS_FILTERS);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const isDeptActor = kind === "lab" ? isLabTestWorkflowActor(roles) : isRadiologyWorkflowActor(roles);
  const worklistPath = kind === "lab" ? "/worklists/lab" : "/worklists/radiology";
  const cacheScope = kind === "lab" ? (["lab"] as const) : (["radiology"] as const);
  const detailBase = kind === "lab" ? "/app/lab-worklist/commande" : "/app/rad-worklist/commande";
  const testIdPrefix = kind === "lab" ? "lab" : "rad";

  const displayedQueue = useMemo(() => {
    const rows = Array.isArray(queue) ? queue : [];
    if (!ambulatoryOnly || !facilityId) return rows;
    return filterAmbulatoryLabRadWorklistOrders(rows, {
      facilityId,
      ambulatoryOnly: true,
    });
  }, [ambulatoryOnly, facilityId, queue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyLayoutMode = () => setLayoutMode(resolveAncillaryLayoutMode(window.innerWidth));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, facilityId, kind]);

  useEffect(() => {
    return subscribeToOrderItem(() => {
      setQueue((prev) => mergeWorklistPayload(prev));
    });
  }, []);

  const loadQueue = async (options?: { silent?: boolean }) => {
    if (!facilityId) return;
    const silent = Boolean(options?.silent) || hasLoadedOnceRef.current;
    if (silent) setRefreshing(true);
    else setLoading(true);

    const pendingP =
      kind === "lab"
        ? getPendingLabOrderRowsForFacility(facilityId, language)
        : getPendingImagingOrderRowsForFacility(facilityId, language);

    try {
      const data = await apiFetch(worklistPath, { facilityId });
      setQueue(ingestServerOrderPayload(Array.isArray(data) ? data : []));
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error(`Failed to load ${kind} worklist:`, error);
      if (!silent) setQueue([]);
    }

    const pendingRows = await pendingP;
    setPendingLocal(pendingRows);
    if (silent) setRefreshing(false);
    else setLoading(false);
  };

  const projectedRows = useMemo(() => {
    const out: LabRadTechnicianProjectedRow[] = [];
    for (const order of Array.isArray(displayedQueue) ? displayedQueue : []) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        const operational = analyzeLabRadWorklistOperationalRow({
          domain: kind === "lab" ? "LAB" : "RADIOLOGY",
          order: {
            id: order.id,
            createdAt: order.createdAt,
            type: order.type,
            priority: order.priority,
          },
          item,
          siblingItems: Array.isArray(order.items) ? order.items : [],
        });
        out.push(
          projectLabRadTechnicianRow({
            order,
            item,
            operational,
            studyOrTestLabel: getOrderItemDisplayLabelFromLocale(item, language),
          })
        );
      }
    }
    return out;
  }, [displayedQueue, kind, language]);

  const modalitiesAvailable = useMemo(() => {
    if (kind !== "radiology") return [] as string[];
    const set = new Set<string>();
    for (const row of projectedRows) {
      if (row.modality) set.add(row.modality);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [kind, projectedRows]);

  const filteredRows = useMemo(() => {
    return projectedRows.filter((row) => {
      if (priorityFilter !== "ALL" && row.priority.toUpperCase() !== priorityFilter) return false;
      if (originFilter !== "ALL" && row.origin !== originFilter) return false;
      if (kind === "radiology" && modalityFilter !== "ALL" && row.modality !== modalityFilter) {
        return false;
      }
      if (!pairPassesLabRadOperationalFilters(row.operational, operationalFilters)) return false;

      const blob = [
        row.patientName,
        row.patientMrn,
        row.studyOrTestLabel,
        shortOrderId(row.orderId),
        row.orderId,
        tOrderPriority(t, row.priority),
        orderIsCancelled(row.order)
          ? t("worklistDepartments.shared.orderCancelledBadge")
          : tOrderItemStatusForWorklist(t, String(row.item.status)),
        t(enterpriseOrderOriginLabelKey(row.origin) as Parameters<typeof t>[0]),
        row.locationLabel ?? "",
        row.modality ?? "",
      ].join(" ");
      return rowMatchesSearch(searchQuery, blob);
    });
  }, [
    projectedRows,
    priorityFilter,
    originFilter,
    modalityFilter,
    kind,
    operationalFilters,
    searchQuery,
    t,
  ]);

  const kpis = useMemo(() => {
    const kpiInputs = filteredRows.map((row) => ({
      workStatus: row.workStatus,
      completedAt: row.completedAt,
      criticalValue: row.criticalValue,
      awaitingCriticalAck: row.awaitingCriticalAck,
      awaitingFinalization: row.awaitingFinalization,
      overdue: row.overdue,
    }));
    return kind === "lab"
      ? projectLabTechnicianKpis(kpiInputs)
      : projectRadiologyTechnicianKpis(kpiInputs);
  }, [filteredRows, kind]);

  const tabCounts = useMemo(() => {
    const counts: Record<TechnicianWorkStatus, number> = {
      NEW: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const row of filteredRows) counts[row.workStatus] += 1;
    return counts;
  }, [filteredRows]);

  const tabRows = useMemo(() => {
    const scoped = filteredRows.filter((r) => r.workStatus === activeTab);
    return sortTechnicianWorklistRows(scoped, sortMode);
  }, [filteredRows, activeTab, sortMode]);

  const selectedRow = useMemo(
    () => tabRows.find((r) => r.itemId === selectedItemId) ?? filteredRows.find((r) => r.itemId === selectedItemId) ?? null,
    [tabRows, filteredRows, selectedItemId]
  );

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

  const handleWorkflowAction = async (
    action: WorklistItemWorkflowAction,
    itemId: string,
    itemStatus: string
  ) => {
    if (!facilityId || isOrderItemAnyWorkflowPending(pendingWorkflowActionRef.current, itemId)) {
      return null;
    }
    setPendingWorkflow(orderItemWorkflowPendingKey(itemId, action));
    setQueuedActionNotice(null);
    try {
      const result = await runOrderItemLifecycleUiMutation({
        action,
        itemId,
        facilityId,
        currentStatus: itemStatus,
        mutate: (workflowAction, lineId, facId) =>
          postWorklistItemWorkflowAction(workflowAction, lineId, facId, itemStatus, {
            cacheScope: { worklists: [...cacheScope] },
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
      return result;
    } catch (error) {
      const httpStatus = (error as { status?: number }).status;
      if (shouldTreatLifecycleErrorAsStaleState(action, itemStatus, httpStatus)) {
        alert(t(orderItemLifecycleStaleStateMessageKey()));
        void loadQueue({ silent: true });
        return null;
      }
      console.error(`${kind} worklist workflow action failed:`, error);
      alert(t(workflowActionFailureMessageKey(action, "worklist")));
      return null;
    } finally {
      setPendingWorkflow(null);
    }
  };

  /** Primary Start: acknowledge then start when needed (does not navigate away). */
  const handleStartLifecycle = async (row: LabRadTechnicianProjectedRow) => {
    if (!facilityId || !isDeptActor || orderIsCancelled(row.order)) return;
    if (isOrderItemAnyWorkflowPending(pendingWorkflowActionRef.current, row.itemId)) return;

    let status = String(row.item.status ?? "");
    // Hold busy across ack→start so the primary CTA stays disabled for the full lifecycle.
    setPendingWorkflow(orderItemWorkflowPendingKey(row.itemId, "start"));
    setQueuedActionNotice(null);
    try {
      if (worklistItemNeedsAcknowledge(status)) {
        try {
          const ackResult = await runOrderItemLifecycleUiMutation({
            action: "acknowledge",
            itemId: row.itemId,
            facilityId,
            currentStatus: status,
            mutate: (workflowAction, lineId, facId) =>
              postWorklistItemWorkflowAction(workflowAction, lineId, facId, status, {
                cacheScope: { worklists: [...cacheScope] },
              }),
            handlers: createOrderLifecycleMutationHandlers({
              itemId: row.itemId,
              action: "acknowledge",
              collectionKind: "worklist",
              applyCollection: (transform) => {
                setQueue((prev) => transform(prev) as typeof prev);
              },
            }),
          });
          if (ackResult.queued) {
            setQueuedActionNotice(t("worklistDepartments.shared.actionQueuedNotice"));
          }
          if (ackResult.idempotent) {
            setQueuedActionNotice(t(orderItemLifecycleIdempotentToastKey("acknowledge")));
          }
          status = "ACKNOWLEDGED";
        } catch (error) {
          const httpStatus = (error as { status?: number }).status;
          if (shouldTreatLifecycleErrorAsStaleState("acknowledge", status, httpStatus)) {
            alert(t(orderItemLifecycleStaleStateMessageKey()));
            void loadQueue({ silent: true });
            return;
          }
          console.error(`${kind} worklist acknowledge failed:`, error);
          alert(t(workflowActionFailureMessageKey("acknowledge", "worklist")));
          return;
        }
      }

      if (worklistItemAllowsStart(status)) {
        try {
          const startResult = await runOrderItemLifecycleUiMutation({
            action: "start",
            itemId: row.itemId,
            facilityId,
            currentStatus: status,
            mutate: (workflowAction, lineId, facId) =>
              postWorklistItemWorkflowAction(workflowAction, lineId, facId, status, {
                cacheScope: { worklists: [...cacheScope] },
              }),
            handlers: createOrderLifecycleMutationHandlers({
              itemId: row.itemId,
              action: "start",
              collectionKind: "worklist",
              applyCollection: (transform) => {
                setQueue((prev) => transform(prev) as typeof prev);
              },
            }),
          });
          if (startResult.queued) {
            setQueuedActionNotice(t("worklistDepartments.shared.actionQueuedNotice"));
          }
          if (startResult.idempotent) {
            setQueuedActionNotice(t(orderItemLifecycleIdempotentToastKey("start")));
          }
        } catch (error) {
          const httpStatus = (error as { status?: number }).status;
          if (shouldTreatLifecycleErrorAsStaleState("start", status, httpStatus)) {
            alert(t(orderItemLifecycleStaleStateMessageKey()));
            void loadQueue({ silent: true });
            return;
          }
          console.error(`${kind} worklist start failed:`, error);
          alert(t(workflowActionFailureMessageKey("start", "worklist")));
          return;
        }
      }

      void loadQueue({ silent: true });
    } finally {
      setPendingWorkflow(null);
    }
  };

  const canStartLifecycle = (row: LabRadTechnicianProjectedRow): boolean => {
    if (!isDeptActor || orderIsCancelled(row.order)) return false;
    const status = String(row.item.status ?? "");
    return worklistItemNeedsAcknowledge(status) || worklistItemAllowsStart(status);
  };

  const canComplete = (row: LabRadTechnicianProjectedRow): boolean => {
    if (!isDeptActor || orderIsCancelled(row.order)) return false;
    return worklistItemAllowsComplete(String(row.item.status ?? ""));
  };

  const startBusyLabel =
    kind === "lab"
      ? t("labRadTechnicianDashboard.startProcessingBusy")
      : t("labRadTechnicianDashboard.startStudyBusy");
  const startIdleLabel =
    kind === "lab"
      ? t("labRadTechnicianDashboard.startProcessing")
      : t("labRadTechnicianDashboard.startStudy");

  const primaryStartLabel = (itemId: string): string => {
    if (
      isOrderItemWorkflowPending(pendingWorkflowAction, itemId, "acknowledge") ||
      isOrderItemWorkflowPending(pendingWorkflowAction, itemId, "start")
    ) {
      return startBusyLabel;
    }
    return startIdleLabel;
  };

  const title =
    kind === "lab"
      ? t("labRadTechnicianDashboard.labTitle")
      : t("labRadTechnicianDashboard.radTitle");
  const subtitle =
    kind === "lab"
      ? t("labRadTechnicianDashboard.labSubtitle")
      : t("labRadTechnicianDashboard.radSubtitle");
  const searchPlaceholder =
    kind === "lab"
      ? t("labRadTechnicianDashboard.searchPlaceholderLab")
      : t("labRadTechnicianDashboard.searchPlaceholderRad");

  const opsChip = (
    key: keyof LabRadWorklistOperationalFilters,
    labelKey: string
  ) => {
    const active = operationalFilters[key];
    return (
      <button
        key={key}
        type="button"
        onClick={() => setOperationalFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
        aria-pressed={active}
        style={ancillaryTouchControlStyle(
          {
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 9999,
            border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
            background: active ? "#eff6ff" : "#fff",
            color: active ? "#1d4ed8" : "#475569",
            cursor: "pointer",
            fontWeight: 600,
          },
          layoutMode
        )}
      >
        {t(labelKey)}
      </button>
    );
  };

  const renderOriginCell = (row: LabRadTechnicianProjectedRow) => {
    const originLabel = t(enterpriseOrderOriginLabelKey(row.origin) as Parameters<typeof t>[0]);
    return formatEnterpriseOrderOriginDisplay({
      originLabel,
      locationLabel: row.locationLabel,
    });
  };

  const renderActionsCell = (row: LabRadTechnicianProjectedRow) => {
    const viewHref = `${detailBase}/${row.orderId}?ligne=${row.itemId}`;
    const busy = isOrderItemAnyWorkflowPending(pendingWorkflowAction, row.itemId);
    const showStart = canStartLifecycle(row);
    const showComplete = canComplete(row);
    const showReadOnly = shouldShowDeptWorklistReadOnlyNotice({
      roles,
      kind,
      status: String(row.item.status),
      orderCancelled: orderIsCancelled(row.order),
    });

    return (
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
        onClick={(ev) => ev.stopPropagation()}
      >
        {showReadOnly ? (
          <span style={{ fontSize: 11, color: "#92400e", maxWidth: 140 }}>{t(deptWorklistReadOnlyNoticeKey(kind))}</span>
        ) : null}
        {showStart ? (
          <button
            type="button"
            data-testid={`${testIdPrefix}-worklist-start-${row.itemId}`}
            disabled={busy}
            aria-label={primaryStartLabel(row.itemId)}
            onClick={() => void handleStartLifecycle(row)}
            style={{
              ...PRIMARY_BTN,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {primaryStartLabel(row.itemId)}
          </button>
        ) : null}
        {showComplete ? (
          <button
            type="button"
            data-testid={`${testIdPrefix}-worklist-complete-${row.itemId}`}
            disabled={busy}
            aria-label={t("worklistDepartments.shared.complete")}
            onClick={() => void handleWorkflowAction("complete", row.itemId, String(row.item.status))}
            style={{
              ...PRIMARY_BTN,
              backgroundColor: "#0f172a",
              borderColor: "#0f172a",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {isOrderItemWorkflowPending(pendingWorkflowAction, row.itemId, "complete")
              ? t(WORKLIST_WORKFLOW_BUSY_LABEL_KEY.complete)
              : t("worklistDepartments.shared.complete")}
          </button>
        ) : null}
        <Link href={viewHref} style={GHOST_BTN} aria-label={t("common.view")}>
          {t("common.view")}
        </Link>
      </div>
    );
  };

  return (
    <OrderLifecycleErrorBoundary>
    <div
      style={{
        minHeight: "calc(100vh - 48px)",
        backgroundColor: "#fff",
        padding: "0 0 24px 0",
        minWidth: 0,
        boxSizing: "border-box",
      }}
      data-testid={`${testIdPrefix}-technician-dashboard`}
      data-layout-mode={layoutMode}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          padding: "12px 16px 0",
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(1.25rem, 2.2vw, 1.5rem)", fontWeight: 650, color: "#0f172a" }}>
            {title}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b", maxWidth: 720, lineHeight: 1.45 }}>
            {subtitle}
          </p>
          {ambulatoryOnly ? (
            <p
              style={{ margin: "8px 0 0", fontSize: 13, color: "#3730a3", fontWeight: 500 }}
              data-testid={`${testIdPrefix}-worklist-ambulatory-filter`}
            >
              {t(kind === "lab" ? "clinicCareD4c7c.lab.ambulatoryFilter" : "clinicCareD4c7c.rad.ambulatoryFilter")}
            </p>
          ) : null}
          {refreshing ? (
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>{t("common.refreshing")}</p>
          ) : null}
        </header>

        {!loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {kind === "lab" ? (
              <>
                <KpiCard label={t("labRadTechnicianDashboard.kpiNewOrders")} value={(kpis as ReturnType<typeof projectLabTechnicianKpis>).newOrders} />
                <KpiCard label={t("labRadTechnicianDashboard.kpiInProgress")} value={(kpis as ReturnType<typeof projectLabTechnicianKpis>).inProgress} />
                <KpiCard label={t("labRadTechnicianDashboard.kpiCompletedToday")} value={(kpis as ReturnType<typeof projectLabTechnicianKpis>).completedToday} />
                <KpiCard
                  label={t("labRadTechnicianDashboard.kpiCriticalResults")}
                  value={(kpis as ReturnType<typeof projectLabTechnicianKpis>).criticalResults}
                  tone="critical"
                />
                <KpiCard
                  label={t("labRadTechnicianDashboard.kpiPendingAck")}
                  value={(kpis as ReturnType<typeof projectLabTechnicianKpis>).pendingAcknowledgement}
                  tone="warn"
                />
              </>
            ) : (
              <>
                <KpiCard label={t("labRadTechnicianDashboard.kpiNewOrders")} value={(kpis as ReturnType<typeof projectRadiologyTechnicianKpis>).newOrders} />
                <KpiCard label={t("labRadTechnicianDashboard.kpiInProgress")} value={(kpis as ReturnType<typeof projectRadiologyTechnicianKpis>).inProgress} />
                <KpiCard
                  label={t("labRadTechnicianDashboard.kpiPreliminaryReports")}
                  value={(kpis as ReturnType<typeof projectRadiologyTechnicianKpis>).preliminaryReports}
                  tone="warn"
                />
                <KpiCard label={t("labRadTechnicianDashboard.kpiCompletedToday")} value={(kpis as ReturnType<typeof projectRadiologyTechnicianKpis>).completedToday} />
                <KpiCard
                  label={t("labRadTechnicianDashboard.kpiOverdue")}
                  value={(kpis as ReturnType<typeof projectRadiologyTechnicianKpis>).overdue}
                  tone="critical"
                />
              </>
            )}
          </div>
        ) : null}

        {!loading && (displayedQueue.length > 0 || pendingLocal.length > 0) ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoComplete="off"
                aria-label={t("worklistDepartments.shared.searchAria")}
                style={SEARCH_STYLE}
              />
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span>{t("labRadTechnicianDashboard.filterPriority")}</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  aria-label={t("labRadTechnicianDashboard.filterPriority")}
                  style={SELECT_STYLE}
                >
                  <option value="ALL">{t("labRadTechnicianDashboard.filterAll")}</option>
                  <option value="STAT">{tOrderPriority(t, "STAT")}</option>
                  <option value="URGENT">{tOrderPriority(t, "URGENT")}</option>
                  <option value="ROUTINE">{tOrderPriority(t, "ROUTINE")}</option>
                </select>
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span>{t("labRadTechnicianDashboard.filterOrigin")}</span>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  aria-label={t("labRadTechnicianDashboard.filterOrigin")}
                  style={SELECT_STYLE}
                >
                  <option value="ALL">{t("labRadTechnicianDashboard.filterAll")}</option>
                  {ENTERPRISE_ORDER_ORIGINS.map((o) => (
                    <option key={o} value={o}>
                      {t(enterpriseOrderOriginLabelKey(o) as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </label>
              {kind === "radiology" && modalitiesAvailable.length > 0 ? (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                  <span>{t("labRadTechnicianDashboard.filterModality")}</span>
                  <select
                    value={modalityFilter}
                    onChange={(e) => setModalityFilter(e.target.value)}
                    aria-label={t("labRadTechnicianDashboard.filterModality")}
                    style={SELECT_STYLE}
                  >
                    <option value="ALL">{t("labRadTechnicianDashboard.filterAll")}</option>
                    {modalitiesAvailable.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569" }}>
                <span>{t("labRadTechnicianDashboard.sortLabel")}</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as TechnicianWorklistSortMode)}
                  aria-label={t("labRadTechnicianDashboard.sortLabel")}
                  style={SELECT_STYLE}
                >
                  <option value="PRIORITY_NEWEST">{t("labRadTechnicianDashboard.sortPriorityNewest")}</option>
                  <option value="NEWEST_FIRST">{t("labRadTechnicianDashboard.sortNewest")}</option>
                  <option value="OLDEST_FIRST">{t("labRadTechnicianDashboard.sortOldest")}</option>
                  <option value="PRIORITY">{t("labRadTechnicianDashboard.sortPriority")}</option>
                </select>
              </label>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} aria-label={t("labRadTechnicianDashboard.operationalFiltersAria")}>
              {opsChip("needsEscalation", "labRadEscalation.filterNeedsEscalation")}
              {opsChip("criticalDelay", "labRadEscalation.filterCriticalDelay")}
              {opsChip("awaitingResultOrFinalization", "labRadEscalation.filterAwaitingResult")}
              {opsChip("awaitingAcknowledgement", "labRadEscalation.filterAwaitingAck")}
              {opsChip("shiftHandoffReview", "labRadEscalation.filterShiftHandoff")}
            </div>
          </div>
        ) : null}

        {queuedActionNotice ? (
          <div
            role="alert"
            style={{
              marginBottom: 12,
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

        {loading && displayedQueue.length === 0 && pendingLocal.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 44,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              />
            ))}
          </div>
        ) : displayedQueue.length === 0 && pendingLocal.length === 0 ? (
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              border: "1px dashed #cbd5e1",
              backgroundColor: "#f8fafc",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#334155" }}>
              {ambulatoryOnly
                ? t(kind === "lab" ? "clinicCareD4c7c.lab.emptyAmbulatory" : "clinicCareD4c7c.rad.emptyAmbulatory")
                : t(kind === "lab" ? "worklistDepartments.lab.empty" : "worklistDepartments.radiology.empty")}
            </p>
          </div>
        ) : (
          <>
            <div
              role="tablist"
              aria-label={t("labRadTechnicianDashboard.tabsAria")}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 10,
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 8,
              }}
            >
              {TABS.map((tab) => {
                const selected = activeTab === tab;
                const labelKey =
                  tab === "NEW"
                    ? "labRadTechnicianDashboard.tabNew"
                    : tab === "IN_PROGRESS"
                      ? "labRadTechnicianDashboard.tabInProgress"
                      : tab === "COMPLETED"
                        ? "labRadTechnicianDashboard.tabCompleted"
                        : "labRadTechnicianDashboard.tabCancelled";
                return (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      minHeight: 40,
                      padding: "8px 14px",
                      borderRadius: 9999,
                      border: selected ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      background: selected ? "#eff6ff" : "#fff",
                      color: selected ? "#1d4ed8" : "#475569",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {t(labelKey)} ({tabCounts[tab]})
                  </button>
                );
              })}
            </div>

            {searchQuery.trim() && tabRows.length === 0 && filteredPendingLocal.length === 0 ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px dashed #cbd5e1",
                  backgroundColor: "#f8fafc",
                  padding: "32px 20px",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#334155" }}>
                  {t("worklistDepartments.shared.emptySearch")}
                </p>
              </div>
            ) : tabRows.length === 0 ? (
              <div
                style={{
                  borderRadius: 12,
                  border: "1px dashed #cbd5e1",
                  backgroundColor: "#f8fafc",
                  padding: "24px 16px",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                {t("labRadTechnicianDashboard.tabEmpty")}
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    background: "#fff",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colPriority")}</th>
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colOrderId")}</th>
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colPatient")}</th>
                      <th style={thStyle}>
                        {kind === "lab"
                          ? t("labRadTechnicianDashboard.colTestPanel")
                          : t("labRadTechnicianDashboard.colStudy")}
                      </th>
                      {kind === "radiology" ? (
                        <th style={thStyle}>{t("labRadTechnicianDashboard.colModality")}</th>
                      ) : null}
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colLocation")}</th>
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colOrdered")}</th>
                      {kind === "lab" ? (
                        <th style={thStyle}>{t("labRadTechnicianDashboard.colCollected")}</th>
                      ) : null}
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colStatus")}</th>
                      <th style={thStyle}>{t("labRadTechnicianDashboard.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabRows.map((row) => {
                      const pSoft = getPriorityBadgeSoft(row.priority);
                      const selected = selectedItemId === row.itemId;
                      return (
                        <tr
                          key={row.itemId}
                          data-testid={`${testIdPrefix}-tech-row-${row.itemId}`}
                          onClick={() => setSelectedItemId(row.itemId)}
                          style={{
                            cursor: "pointer",
                            background: selected ? "#eff6ff" : "#fff",
                            borderTop: "1px solid #e2e8f0",
                          }}
                        >
                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-flex",
                                borderRadius: 9999,
                                padding: "2px 8px",
                                fontSize: 11,
                                fontWeight: 700,
                                background: pSoft.bg,
                                color: pSoft.text,
                                border: `1px solid ${pSoft.border}`,
                              }}
                            >
                              {tOrderPriority(t, row.priority)}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                            {shortOrderId(row.orderId)}
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.patientName}</div>
                            <div style={{ fontSize: 11, color: "#64748b" }}>
                              {row.patientMrn || DISPLAY_DASH}
                            </div>
                          </td>
                          <td style={tdStyle}>{row.studyOrTestLabel}</td>
                          {kind === "radiology" ? (
                            <td style={tdStyle}>{row.modality || DISPLAY_DASH}</td>
                          ) : null}
                          <td style={tdStyle}>{renderOriginCell(row)}</td>
                          <td style={tdStyle}>{formatInstant(row.orderedAt, language)}</td>
                          {kind === "lab" ? (
                            <td style={tdStyle}>{formatInstant(row.collectedAt, language)}</td>
                          ) : null}
                          <td style={tdStyle}>
                            {orderIsCancelled(row.order)
                              ? t("worklistDepartments.shared.orderCancelledBadge")
                              : tOrderItemStatusForWorklist(t, String(row.item.status))}
                          </td>
                          <td style={tdStyle}>{renderActionsCell(row)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {pendingLocal.length > 0 ? (
              <div style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "#0f172a" }}>
                  {t("worklistDepartments.shared.syncPendingTitle")}
                </h2>
                <p style={{ fontSize: 13, color: "#856404", marginBottom: 10 }}>
                  {t("worklistDepartments.shared.syncPendingDescription")}
                </p>
                {filteredPendingLocal.length > 0 ? (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {filteredPendingLocal.map((row) => {
                      const pc = String(row.priority ?? "ROUTINE");
                      const pSoft = getPriorityBadgeSoft(pc);
                      const borderLeft = getPriorityBorder(pc);
                      return (
                        <li key={row.queueItemId}>
                          <MedoraCard leftAccentColor={borderLeft} variant="pendingSync">
                            <MedoraCardInner>
                              <PendingEncounterPatientBlock
                                facilityId={row.facilityId}
                                encounterId={row.encounterId}
                              />
                              <MedoraCardBadgeRow>
                                <MedoraCardBadge preset="neutral">
                                  {kind === "lab" ? t("common.labTest") : t("common.imagingStudy")} ·{" "}
                                  {row.itemLabels.filter(Boolean).join(", ") || DISPLAY_DASH}
                                </MedoraCardBadge>
                                <MedoraCardBadge preset="syncPending">
                                  {t("worklistDepartments.shared.syncPendingStatus")}
                                </MedoraCardBadge>
                              </MedoraCardBadgeRow>
                              <MedoraCardActions railBorderTopColor="#fde68a">
                                <MedoraCardBadge soft={pSoft}>{tOrderPriority(t, pc)}</MedoraCardBadge>
                                <Link
                                  href={`/app/encounters/${row.encounterId}?tab=orders`}
                                  style={PRIMARY_BTN}
                                >
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

      <LabRadTechnicianDetailDrawer
        kind={kind}
        row={selectedRow}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedItemId(null)}
        viewHref={
          selectedRow ? `${detailBase}/${selectedRow.orderId}?ligne=${selectedRow.itemId}` : "#"
        }
        showReadOnlyNotice={
          selectedRow
            ? shouldShowDeptWorklistReadOnlyNotice({
                roles,
                kind,
                status: String(selectedRow.item.status),
                orderCancelled: orderIsCancelled(selectedRow.order),
              })
            : false
        }
        readOnlyMessage={t(deptWorklistReadOnlyNoticeKey(kind))}
        showPrimaryCta={selectedRow ? canStartLifecycle(selectedRow) : false}
        primaryCtaLabel={selectedRow ? primaryStartLabel(selectedRow.itemId) : startIdleLabel}
        primaryCtaDisabled={
          selectedRow
            ? isOrderItemAnyWorkflowPending(pendingWorkflowAction, selectedRow.itemId)
            : true
        }
        onPrimaryCta={() => {
          if (selectedRow) void handleStartLifecycle(selectedRow);
        }}
        showSecondaryWorkflow={selectedRow ? canComplete(selectedRow) : false}
        secondaryWorkflowLabel={
          selectedRow
            ? isOrderItemWorkflowPending(pendingWorkflowAction, selectedRow.itemId, "complete")
              ? t(WORKLIST_WORKFLOW_BUSY_LABEL_KEY.complete)
              : t("worklistDepartments.shared.complete")
            : null
        }
        secondaryWorkflowDisabled={
          selectedRow
            ? isOrderItemAnyWorkflowPending(pendingWorkflowAction, selectedRow.itemId)
            : true
        }
        onSecondaryWorkflow={() => {
          if (selectedRow) {
            void handleWorkflowAction("complete", selectedRow.itemId, String(selectedRow.item.status));
          }
        }}
      />
    </div>
    </OrderLifecycleErrorBoundary>
  );
}

const thStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: 0.3,
  whiteSpace: "nowrap",
  borderBottom: "1px solid #e2e8f0",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
  verticalAlign: "middle",
  color: "#0f172a",
};
