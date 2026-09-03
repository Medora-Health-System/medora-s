"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterInpatientReviewOrderLines,
  INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS,
  INPATIENT_REVIEW_ORDER_STATUS_BUCKETS,
  projectInpatientReviewOrders,
  resolveInpatientReviewOrderActions,
  type InpatientReviewOrderClinicalGroup,
  type InpatientReviewOrderLine,
  type InpatientReviewOrderStatusBucket,
  inpatientFacilityMedicationOrderMode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchOrderEventsForEncounter, fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { mutateOrderItemLifecycleAction } from "@/lib/mutateOrderItemLifecycleAction";
import { apiFetch } from "@/lib/apiClient";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import { CancelOrderModal, CreateOrderModal, type CancelOrderConfirmPayload } from "@/components/orders";
import { ProviderMedicationOrderGovernanceSection } from "@/components/orders/ProviderMedicationOrderGovernanceSection";
import { auditMedicationOrderGovernancePermissions } from "@/lib/medicationOrderGovernancePermissions";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardInner,
  MedoraCardMetaLines,
  MedoraCardTitle,
  PRIORITY_BORDER,
} from "@/components/medora-card";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";

type StatusFilter = InpatientReviewOrderStatusBucket | "NEEDS_ACTION" | "CHANGED" | "ALL";
type GroupFilter = InpatientReviewOrderClinicalGroup | "ALL";

const CHIP: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 8px",
  borderRadius: 9999,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

const CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP,
  background: "#eff6ff",
  border: "1px solid #93c5fd",
  color: "#1d4ed8",
};

const ACTION_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "4px 8px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function findOrderAndItem(
  orders: unknown[],
  orderId: string,
  orderItemId: string
): { order: Record<string, unknown>; item: Record<string, unknown> } | null {
  for (const raw of orders) {
    const order = asRecord(raw);
    if (!order || String(order.id ?? "") !== orderId) continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const rawItem of items) {
      const item = asRecord(rawItem);
      if (item && String(item.id ?? "") === orderItemId) return { order, item };
    }
  }
  return null;
}

export function InpatientReviewOrdersPanel({
  encounterId,
  facilityId,
  canPrescribe,
  encounterSigned = false,
  encounterForOrderModal,
  onRefetchEncounter,
  roles,
  onNavigateSection,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  encounterSigned?: boolean;
  encounterForOrderModal?: { patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null } | null;
  onRefetchEncounter: () => Promise<void>;
  roles: string[];
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
}) {
  const { t, language } = useI18n();
  const { facilityTimeZone, userId } = useFacilityAndRoles();
  const governance = useMemo(
    () => auditMedicationOrderGovernancePermissions({ canPrescribeProp: canPrescribe, roles }),
    [canPrescribe, roles]
  );
  const effectiveCanPrescribe = governance.effectiveCanPrescribe;
  const canUseRnOrderAuthority = roles.includes("RN") && !effectiveCanPrescribe;

  const [ordersRaw, setOrdersRaw] = useState<unknown[]>([]);
  const [eventsRaw, setEventsRaw] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [bucket, setBucket] = useState<StatusFilter>("NEEDS_ACTION");
  const [group, setGroup] = useState<GroupFilter>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<OrderModalTab>("LAB");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelItemId, setCancelItemId] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, events] = await Promise.all([
        fetchOrdersForEncounter(facilityId, encounterId),
        fetchOrderEventsForEncounter(facilityId, encounterId),
      ]);
      setOrdersRaw(orders);
      setEventsRaw(events);
    } finally {
      setLoading(false);
    }
  }, [facilityId, encounterId]);

  useEffect(() => {
    void load();
  }, [load, refresh]);

  const projection = useMemo(
    () =>
      projectInpatientReviewOrders({
        encounterId,
        orders: ordersRaw,
        orderEvents: eventsRaw,
      }),
    [encounterId, ordersRaw, eventsRaw]
  );

  const visible = useMemo(
    () => filterInpatientReviewOrderLines(projection.lines, { bucket, group }),
    [projection.lines, bucket, group]
  );

  const grouped = useMemo(() => {
    const map = new Map<InpatientReviewOrderClinicalGroup, InpatientReviewOrderLine[]>();
    for (const line of visible) {
      const list = map.get(line.clinicalGroup) ?? [];
      list.push(line);
      map.set(line.clinicalGroup, list);
    }
    return INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS.filter((g) => map.has(g)).map((g) => ({
      group: g,
      lines: map.get(g) ?? [],
    }));
  }, [visible]);

  const formatTs = (iso: string | null) =>
    iso ? formatClinicalInstantForFacility(iso, facilityTimeZone, resolveProductUiLanguageOrDefault(language)) : null;

  const lineLabel = (line: InpatientReviewOrderLine) => {
    const found = findOrderAndItem(ordersRaw, line.orderId, line.orderItemId);
    if (found) {
      return getOrderItemDisplayLabelForLanguage(found.item as never, language, t);
    }
    return language === "fr" ? line.displayLabelFr ?? line.manualLabel ?? line.orderItemId : line.displayLabelEn ?? line.manualLabel ?? line.orderItemId;
  };

  async function runLifecycle(line: InpatientReviewOrderLine, action: "acknowledge" | "start" | "complete") {
    setBusyId(line.orderItemId);
    setError(null);
    try {
      await mutateOrderItemLifecycleAction(action, line.orderItemId, facilityId, {
        cacheScope: { encounterId },
      });
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("inpatientReviewOrdersInp2d.empty"));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel(payload: CancelOrderConfirmPayload) {
    if (!cancelItemId) return;
    setCancelBusy(true);
    setError(null);
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
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("inpatientReviewOrdersInp2d.empty"));
    } finally {
      setCancelBusy(false);
    }
  }

  const canOpenCreate = effectiveCanPrescribe || canUseRnOrderAuthority;

  return (
    <div data-testid="inpatient-review-orders-panel" data-persistence="enterprise-orders">
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
        {t("inpatientReviewOrdersInp2d.ownershipHint")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: 14, color: "#0f172a" }}>{t("inpatientReviewOrdersInp2d.title")}</strong>
        <MedoraCardBadge compact soft={{ bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" }}>
          {projection.needsActionCount} {t("inpatientReviewOrdersInp2d.needsAction")}
        </MedoraCardBadge>
        {canOpenCreate ? (
          <button
            type="button"
            data-testid="inpatient-review-orders-create"
            style={ACTION_BTN}
            onClick={() => {
              setCreateTab("LAB");
              setShowCreate(true);
            }}
          >
            {t("inpatientReviewOrdersInp2d.createOrder")}
          </button>
        ) : null}
      </div>
      <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }}>
        {t("inpatientReviewOrdersInp2d.marBoundary")} {t("inpatientReviewOrdersInp2d.viewedNotComplete")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          style={bucket === "NEEDS_ACTION" ? CHIP_ACTIVE : CHIP}
          onClick={() => setBucket("NEEDS_ACTION")}
        >
          {t("inpatientReviewOrdersInp2d.needsAction")} ({projection.needsActionCount})
        </button>
        <button
          type="button"
          style={bucket === "CHANGED" ? CHIP_ACTIVE : CHIP}
          onClick={() => setBucket("CHANGED")}
        >
          {t("inpatientReviewOrdersInp2d.changed")} ({projection.changedCount})
        </button>
        <button type="button" style={bucket === "ALL" ? CHIP_ACTIVE : CHIP} onClick={() => setBucket("ALL")}>
          {t("inpatientReviewOrdersInp2d.all")} ({projection.lines.length})
        </button>
        {INPATIENT_REVIEW_ORDER_STATUS_BUCKETS.map((key) => (
          <button
            key={key}
            type="button"
            style={bucket === key ? CHIP_ACTIVE : CHIP}
            onClick={() => setBucket(key)}
          >
            {t(`inpatientReviewOrdersInp2d.buckets.${key}`)} ({projection.countsByBucket[key]})
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        <button type="button" style={group === "ALL" ? CHIP_ACTIVE : CHIP} onClick={() => setGroup("ALL")}>
          {t("inpatientReviewOrdersInp2d.all")}
        </button>
        {INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS.map((key) => (
          <button
            key={key}
            type="button"
            style={group === key ? CHIP_ACTIVE : CHIP}
            onClick={() => setGroup(key)}
          >
            {t(`inpatientReviewOrdersInp2d.groups.${key}`)} ({projection.countsByGroup[key]})
          </button>
        ))}
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 12 }} role="alert">
          {error}
        </p>
      ) : null}
      {loading ? <p style={{ fontSize: 13, color: "#64748b" }}>{t("inpatientReviewOrdersInp2d.loading")}</p> : null}
      {!loading && visible.length === 0 ? (
        <p data-testid="inpatient-review-orders-empty" style={{ fontSize: 13, color: "#64748b" }}>
          {t("inpatientReviewOrdersInp2d.empty")}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {grouped.map((section) => (
          <section key={section.group} aria-label={t(`inpatientReviewOrdersInp2d.groups.${section.group}`)}>
            <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
              {t(`inpatientReviewOrdersInp2d.groups.${section.group}`)}
            </p>
            <div style={{ display: "grid", gap: 6 }}>
              {section.lines.map((line) => {
                const actions = resolveInpatientReviewOrderActions({
                  roles,
                  canPrescribe: effectiveCanPrescribe,
                  encounterSigned,
                  actorUserId: userId,
                  line,
                });
                const found = findOrderAndItem(ordersRaw, line.orderId, line.orderItemId);
                const accent =
                  line.buckets.includes("STAT_URGENT") || line.buckets.includes("OVERDUE")
                    ? PRIORITY_BORDER.STAT
                    : line.buckets.includes("HELD")
                      ? PRIORITY_BORDER.URGENT
                      : PRIORITY_BORDER.ROUTINE;
                const meta: string[] = [];
                const orderedAt = formatTs(line.orderedAtIso);
                if (line.orderedByDisplay) meta.push(`${t("inpatientReviewOrdersInp2d.orderedBy")}: ${line.orderedByDisplay}`);
                if (orderedAt) meta.push(`${t("inpatientReviewOrdersInp2d.orderedAt")}: ${orderedAt}`);
                if (line.frequencyCode) meta.push(`${t("inpatientReviewOrdersInp2d.frequency")}: ${line.frequencyCode}`);
                if (line.changed && line.lastChangedAtIso) {
                  const changedAt = formatTs(line.lastChangedAtIso);
                  if (changedAt) meta.push(`${t("inpatientReviewOrdersInp2d.changedAt")}: ${changedAt}`);
                }
                if (line.completedAtIso) {
                  const completedAt = formatTs(line.completedAtIso);
                  if (completedAt) meta.push(`${t("inpatientReviewOrdersInp2d.completedAt")}: ${completedAt}`);
                }
                return (
                  <div key={line.orderItemId} data-testid={`inpatient-review-order-${line.orderItemId}`}>
                  <MedoraCard leftAccentColor={accent}>
                    <MedoraCardInner>
                      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <MedoraCardTitle title={lineLabel(line)} />
                          <MedoraCardBadgeRow>
                            {line.buckets.slice(0, 4).map((b) => (
                              <MedoraCardBadge key={b} compact>
                                {t(`inpatientReviewOrdersInp2d.buckets.${b}`)}
                              </MedoraCardBadge>
                            ))}
                            {line.changed ? (
                              <MedoraCardBadge compact soft={{ bg: "#fff7ed", text: "#c2410c", border: "#fdba74" }}>
                                {t("inpatientReviewOrdersInp2d.changed")}
                              </MedoraCardBadge>
                            ) : null}
                          </MedoraCardBadgeRow>
                          {meta.length ? (
                            <MedoraCardMetaLines>
                              {meta.map((lineText) => (
                                <span key={lineText} style={{ fontSize: 11, color: "#64748b" }}>
                                  {lineText}
                                </span>
                              ))}
                            </MedoraCardMetaLines>
                          ) : null}
                          {actions.canHoldDiscontinue && found ? (
                            <ProviderMedicationOrderGovernanceSection
                              orderType={line.orderType}
                              orderId={line.orderId}
                              orderItem={found.item}
                              facilityId={facilityId}
                              permissions={{ canPrescribeProp: effectiveCanPrescribe, roles, encounterSigned }}
                              ordersRaw={ordersRaw}
                              orderEventsRaw={eventsRaw}
                              itemStatus={line.status}
                              medicationLabel={lineLabel(line)}
                              onUpdated={() => setRefresh((n) => n + 1)}
                            />
                          ) : null}
                        </div>
                        <MedoraCardActions inline minWidth={120} gap={6}>
                          {actions.canAcknowledge ? (
                            <button
                              type="button"
                              style={ACTION_BTN}
                              disabled={busyId === line.orderItemId}
                              onClick={() => void runLifecycle(line, "acknowledge")}
                            >
                              {t("inpatientReviewOrdersInp2d.acknowledge")}
                            </button>
                          ) : null}
                          {actions.canStart ? (
                            <button
                              type="button"
                              style={ACTION_BTN}
                              disabled={busyId === line.orderItemId}
                              onClick={() => void runLifecycle(line, "start")}
                            >
                              {t("inpatientReviewOrdersInp2d.start")}
                            </button>
                          ) : null}
                          {actions.canComplete ? (
                            <button
                              type="button"
                              style={ACTION_BTN}
                              disabled={busyId === line.orderItemId}
                              onClick={() => void runLifecycle(line, "complete")}
                            >
                              {t("inpatientReviewOrdersInp2d.complete")}
                            </button>
                          ) : null}
                          {actions.canOpenMar ? (
                            <button
                              type="button"
                              style={ACTION_BTN}
                              data-testid={`inpatient-review-order-open-mar-${line.orderItemId}`}
                              onClick={() => onNavigateSection?.("medications")}
                            >
                              {t("inpatientReviewOrdersInp2d.openMar")}
                            </button>
                          ) : null}
                          {actions.canCancel ? (
                            <button
                              type="button"
                              style={ACTION_BTN}
                              data-testid={`inpatient-review-order-cancel-${line.orderItemId}`}
                              onClick={() => setCancelItemId(line.orderItemId)}
                            >
                              {t("inpatientReviewOrdersInp2d.cancel")}
                            </button>
                          ) : null}
                        </MedoraCardActions>
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {showCreate ? (
        <CreateOrderModal
          key={`${encounterId}-${createTab}-${refresh}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          canUseRnOrderAuthority={canUseRnOrderAuthority}
          isRn={roles.includes("RN")}
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
          initialOrderTab={createTab}
          medicationOrderMode={inpatientFacilityMedicationOrderMode()}
          onClose={() => setShowCreate(false)}
          onRefetchEncounter={onRefetchEncounter}
          onSuccess={async () => {
            setShowCreate(false);
            setRefresh((n) => n + 1);
          }}
        />
      ) : null}
      <CancelOrderModal
        open={Boolean(cancelItemId)}
        orderId={cancelItemId}
        submitting={cancelBusy}
        variant="orderLine"
        onClose={() => setCancelItemId(null)}
        onConfirm={(payload) => void confirmCancel(payload)}
      />
    </div>
  );
}
