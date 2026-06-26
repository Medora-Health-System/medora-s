"use client";

import React, { useMemo, useState } from "react";
import type { MedicationInfusionTimelineResult } from "@/features/emergency/erOrderLifecycleUi";
import { resolveProviderMedicationOrderMarExecutionSummary } from "@/features/orders/providerMedicationOrderMarStatus";
import { useI18n } from "@/lib/i18n";
import {
  type MedicationGovernancePermissionsInput,
  resolveMedicationGovernanceRenderState,
} from "@/lib/medicationOrderGovernancePermissions";
import { MedicationOrderLifecycleHistoryModal } from "@/components/orders/MedicationOrderLifecycleHistoryModal";
import { MedicationOrderLifecyclePanel } from "@/components/orders/MedicationOrderLifecyclePanel";
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
  const [historyOpen, setHistoryOpen] = useState(false);
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

  const shellStyle: React.CSSProperties = {
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
  };

  return (
    <div
      data-testid="provider-medication-order-governance"
      data-can-prescribe={renderState.effectiveCanPrescribe ? "true" : "false"}
      data-can-mutate={renderState.canMutate ? "true" : "false"}
      data-hidden-reason={renderState.hiddenReasonCode}
      data-order-item-id={orderItemId}
      style={shellStyle}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#1d4ed8",
          marginBottom: 6,
        }}
      >
        {t("medicationOrderLifecycle.providerGovernanceTitle")}
      </div>

      {marExecutionSummary ? (
        <p
          data-testid="provider-medication-mar-execution-status"
          style={{ margin: "0 0 8px 0", fontSize: 12, color: "#334155", lineHeight: 1.45 }}
        >
          <strong>{t("medicationOrderLifecycle.marExecutionStatus")}:</strong> {marExecutionSummary}
        </p>
      ) : null}

      {infusionTimeline.active ? (
        <p style={{ margin: "0 0 8px 0", fontSize: 12, color: "#92400e", lineHeight: 1.45 }}>
          {t("medicationOrderLifecycle.activeInfusionStopFirst")}
        </p>
      ) : null}

      <MedicationOrderLifecycleReadOnlyBadge item={orderItem} orders={ordersRaw} compact={false} />

      {renderState.canMutate ? (
        <MedicationOrderLifecyclePanel
          orderItem={toLifecyclePanelItem(orderItem, renderState.normalizedLifecycleStatus)}
          facilityId={facilityId}
          encounterSigned={permissions.encounterSigned ?? false}
          canMutateLifecycle={renderState.canMutate}
          onUpdated={onUpdated}
        />
      ) : null}

      {renderState.effectiveCanPrescribe ? (
        <button
          type="button"
          data-testid="medication-lifecycle-view-history"
          onClick={() => setHistoryOpen(true)}
          style={{
            marginTop: 8,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          {t("medicationOrderLifecycle.viewHistory")}
        </button>
      ) : null}

      <MedicationOrderLifecycleHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        orderItemId={orderItemId}
        orderId={orderId}
        orderEvents={orderEventsRaw}
        medicationLabel={label}
      />
    </div>
  );
}
