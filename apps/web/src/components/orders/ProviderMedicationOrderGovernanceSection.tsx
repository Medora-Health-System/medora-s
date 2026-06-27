"use client";

import React, { useMemo, useState } from "react";
import type { MedicationInfusionTimelineResult } from "@/features/emergency/erOrderLifecycleUi";
import { resolveProviderMedicationOrderMarExecutionSummary } from "@/features/orders/providerMedicationOrderMarStatus";
import { useI18n } from "@/lib/i18n";
import {
  type MedicationGovernancePermissionsInput,
  resolveMedicationGovernanceRenderState,
} from "@/lib/medicationOrderGovernancePermissions";
import { medicationOrderLifecycleStatusLabelKey } from "@/lib/medicationOrderLifecycleApi";
import {
  MedicationGovernanceManageButton,
  MedicationGovernanceManageModal,
} from "@/components/orders/MedicationGovernanceManageModal";
import { MedicationOrderGovernanceCompactStatus } from "@/components/orders/MedicationOrderGovernanceCompactStatus";
import { MedicationOrderLifecycleReadOnlyBadge } from "@/components/orders/MedicationOrderLifecycleReadOnlyBadge";

export type ProviderMedicationOrderGovernanceSectionProps = {
  orderType: string;
  orderId: string;
  orderItem: Record<string, unknown>;
  facilityId: string;
  permissions: MedicationGovernancePermissionsInput;
  ordersRaw?: unknown[];
  orderEventsRaw?: unknown[];
  itemStatus?: string;
  infusionTimeline?: Pick<MedicationInfusionTimelineResult, "active" | "lastCompleted">;
  medicationLabel?: string;
  onUpdated?: () => void;
};

function toLifecyclePanelItem(
  item: Record<string, unknown>,
  normalizedLifecycleStatus: ReturnType<
    typeof resolveMedicationGovernanceRenderState
  >["normalizedLifecycleStatus"]
) {
  return {
    id: String(item.id ?? ""),
    medicationLifecycleStatus: normalizedLifecycleStatus,
    frequencyCode: typeof item.frequencyCode === "string" ? item.frequencyCode : null,
    strength: typeof item.strength === "string" ? item.strength : null,
    route: typeof item.route === "string" ? item.route : null,
    notes: typeof item.notes === "string" ? item.notes : null,
    quantity:
      typeof item.quantity === "number"
        ? item.quantity
        : item.quantity != null
          ? Number(item.quantity)
          : null,
    catalogItemId: typeof item.catalogItemId === "string" ? item.catalogItemId : null,
    manualLabel: typeof item.manualLabel === "string" ? item.manualLabel : null,
    medicationFulfillmentIntent:
      typeof item.medicationFulfillmentIntent === "string" ? item.medicationFulfillmentIntent : null,
  };
}

export function ProviderMedicationOrderGovernanceSection({
  orderType,
  orderId,
  orderItem,
  facilityId,
  permissions,
  ordersRaw = [],
  orderEventsRaw = [],
  itemStatus = "",
  infusionTimeline = { active: null, lastCompleted: null },
  medicationLabel,
  onUpdated,
}: ProviderMedicationOrderGovernanceSectionProps) {
  const { t } = useI18n();
  const [manageOpen, setManageOpen] = useState(false);
  const orderItemId = String(orderItem.id ?? "");
  const label =
    medicationLabel ??
    (typeof orderItem.manualLabel === "string" ? orderItem.manualLabel : orderItemId);

  const renderState = useMemo(
    () =>
      resolveMedicationGovernanceRenderState({
        orderType,
        orderItem,
        permissions,
      }),
    [orderType, orderItem, permissions]
  );

  const marExecutionSummary = useMemo(
    () =>
      resolveProviderMedicationOrderMarExecutionSummary({
        itemStatus,
        marManagedInMar: renderState.isMarManagedOrder,
        infusionTimeline,
        t,
      }),
    [itemStatus, renderState.isMarManagedOrder, infusionTimeline, t]
  );

  if (!renderState.shouldRender) {
    return null;
  }

  if (!renderState.effectiveCanPrescribe) {
    return (
      <MedicationOrderGovernanceCompactStatus
        orderItem={orderItem}
        ordersRaw={ordersRaw}
        marExecutionSummary={marExecutionSummary}
      />
    );
  }

  const lifecyclePanelItem = toLifecyclePanelItem(orderItem, renderState.normalizedLifecycleStatus);
  const statusLabel = t(medicationOrderLifecycleStatusLabelKey(renderState.normalizedLifecycleStatus));
  const marLabel = marExecutionSummary ? t(marExecutionSummary) : null;

  return (
    <div
      data-testid="provider-medication-order-governance"
      data-can-prescribe="true"
      data-can-mutate={renderState.canMutate ? "true" : "false"}
      data-hidden-reason={renderState.hiddenReasonCode}
      data-order-item-id={orderItemId}
      style={{
        marginTop: 6,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
      }}
    >
      {renderState.normalizedLifecycleStatus !== "ACTIVE" ? (
        <MedicationOrderLifecycleReadOnlyBadge item={orderItem} orders={ordersRaw} compact />
      ) : null}
      {marLabel ? (
        <span
          data-testid="provider-medication-mar-execution-status"
          style={{
            display: "inline-flex",
            padding: "2px 8px",
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: 600,
            color: "#475569",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
          }}
        >
          {marLabel}
        </span>
      ) : null}
      {infusionTimeline.active ? (
        <span style={{ fontSize: 11, color: "#92400e", fontWeight: 600 }}>
          {t("medicationOrderLifecycle.activeInfusionStopFirst")}
        </span>
      ) : null}
      <span style={{ fontSize: 11, color: "#64748b" }}>
        {t("medicationOrderLifecycle.statusLabel")}: {statusLabel}
      </span>
      <MedicationGovernanceManageButton
        disabled={permissions.encounterSigned && !renderState.effectiveCanPrescribe}
        onClick={() => setManageOpen(true)}
      />
      <MedicationGovernanceManageModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        orderItem={lifecyclePanelItem}
        orderId={orderId}
        orderEvents={orderEventsRaw}
        medicationLabel={label}
        facilityId={facilityId}
        encounterSigned={permissions.encounterSigned ?? false}
        canMutateLifecycle={renderState.canMutate}
        lifecycleStatus={renderState.normalizedLifecycleStatus}
        onUpdated={onUpdated}
      />
    </div>
  );
}
