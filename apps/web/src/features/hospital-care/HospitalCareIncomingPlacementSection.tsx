"use client";

import { useState } from "react";
import Link from "next/link";
import {
  placementActionsForStatus,
  placementActionToStatus,
  type PlacementQueueAction,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { hospitalAdmissionReviewPath } from "./hospitalCarePaths";
import { HospitalCarePatientCard } from "./HospitalCarePatientCard";
import {
  transitionPlacementRequest,
  type HospitalCarePlacementQueueRow,
} from "./hospitalCarePlacementApi";
import { observationNursingWorkspacePath } from "@/features/observation-workspace/observationWorkspacePaths";
import { inpatientNursingWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";

type ReceivingTransportAction = "MARK_READY" | "MARK_DEPARTED" | "MARK_ARRIVED";

/** Existing queue actions that remain legal after 1G moves a bed-assigned row off Placement queue. */
const RECEIVING_TRANSPORT_ACTIONS: readonly ReceivingTransportAction[] = [
  "MARK_READY",
  "MARK_DEPARTED",
  "MARK_ARRIVED",
];

const ACTION_I18N: Record<
  ReceivingTransportAction,
  | "hospitalCareD3e7.placement.actions.markReady"
  | "hospitalCareD3e7.placement.actions.markDeparted"
  | "edHosp1gHospitalBoard.markArrived"
> = {
  MARK_READY: "hospitalCareD3e7.placement.actions.markReady",
  MARK_DEPARTED: "hospitalCareD3e7.placement.actions.markDeparted",
  MARK_ARRIVED: "edHosp1gHospitalBoard.markArrived",
};

function receivingWorkspaceHref(row: HospitalCarePlacementQueueRow): string | null {
  const receiving = row.receivingEncounterId?.trim();
  if (!receiving) return null;
  return row.requestedEncounterType === "OBSERVATION"
    ? observationNursingWorkspacePath(receiving)
    : inpatientNursingWorkspacePath(receiving);
}

export function receivingTransportActionsForRow(
  row: HospitalCarePlacementQueueRow
): ReceivingTransportAction[] {
  return placementActionsForStatus(row.status).filter((action): action is ReceivingTransportAction =>
    (RECEIVING_TRANSPORT_ACTIONS as readonly PlacementQueueAction[]).includes(action)
  );
}

export function HospitalCareIncomingPlacementSection({
  surface,
  rows,
  onReload,
}: {
  surface: "OBSERVATION" | "ADMISSIONS";
  rows: HospitalCarePlacementQueueRow[];
  onReload?: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const testId =
    surface === "OBSERVATION"
      ? "ed-hosp-1g-incoming-observation"
      : "ed-hosp-1g-incoming-admissions";
  const title =
    surface === "OBSERVATION"
      ? t("edHosp1gHospitalBoard.incomingObservation")
      : t("edHosp1gHospitalBoard.incomingAdmissions");

  if (rows.length === 0) return null;

  const runTransportAction = async (
    row: HospitalCarePlacementQueueRow,
    action: PlacementQueueAction
  ) => {
    const toStatus = placementActionToStatus(action);
    if (!toStatus) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      const updated = await transitionPlacementRequest(row.id, { toStatus });
      await onReload?.();
      if (action === "MARK_ARRIVED") {
        const href = receivingWorkspaceHref(updated) ?? receivingWorkspaceHref(row);
        if (href) window.location.assign(href);
      }
    } catch {
      setActionError(t("hospitalCareD3e7.placement.actionError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section data-testid={testId} style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {title}
      </h2>
      {actionError ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {actionError}
        </p>
      ) : null}
      {rows.map((row) => {
        const startHref = receivingWorkspaceHref(row);
        const transportActions = receivingTransportActionsForRow(row);
        return (
          <div key={row.id} style={{ marginBottom: 8 }}>
            <HospitalCarePatientCard
              row={row}
              href={hospitalAdmissionReviewPath(row.originatingEncounterId)}
            />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 4,
                paddingLeft: 4,
              }}
            >
              <Link
                href={hospitalAdmissionReviewPath(row.originatingEncounterId)}
                data-testid={`ed-hosp-1g-review-handoff-${row.id}`}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0f766e",
                  textDecoration: "none",
                  border: "1px solid #99f6e4",
                  background: "#f0fdfa",
                  borderRadius: 8,
                  padding: "6px 10px",
                }}
              >
                {t("edHosp1gHospitalBoard.reviewHandoff")}
              </Link>
              {startHref ? (
                <Link
                  href={startHref}
                  data-testid={`ed-hosp-1g-start-receiving-${row.id}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0f766e",
                    textDecoration: "none",
                    border: "1px solid #99f6e4",
                    background: "#f0fdfa",
                    borderRadius: 8,
                    padding: "6px 10px",
                  }}
                >
                  {t("edHosp1gHospitalBoard.startReceiving")}
                </Link>
              ) : null}
              {transportActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      disabled={busyId === row.id}
                      data-testid={
                        action === "MARK_ARRIVED"
                          ? `ed-hosp-1g-mark-arrived-${row.id}`
                          : `ed-hosp-1g-${action.toLowerCase().replaceAll("_", "-")}-${row.id}`
                      }
                      onClick={() => void runTransportAction(row, action)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#fff",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: busyId === row.id ? "wait" : "pointer",
                      }}
                    >
                      {t(ACTION_I18N[action])}
                    </button>
                  ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
