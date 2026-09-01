"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  placementActionsForStatus,
  placementActionToStatus,
  type PlacementQueueAction,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { HospitalCareShell } from "./HospitalCareShell";
import { HospitalCarePatientCard } from "./HospitalCarePatientCard";
import {
  fetchFacilityPlacementQueue,
  isForbiddenApiError,
  isHospitalBoardPlacementQueueRow,
  isPlacementActionsEnabledInBrowser,
  transitionPlacementRequest,
  type HospitalCarePlacementQueueRow,
  type PlacementQueueAvailability,
} from "./hospitalCarePlacementApi";

const ACTION_I18N: Record<PlacementQueueAction, string> = {
  REVIEW: "hospitalCareD3e7.placement.actions.review",
  ACCEPT: "hospitalCareD3e7.placement.actions.accept",
  DECLINE: "hospitalCareD3e7.placement.actions.decline",
  REQUEST_CLARIFICATION: "hospitalCareD3e7.placement.actions.clarify",
  ASSIGN_BED: "hospitalCareD3e7.placement.actions.assignBed",
  MARK_READY: "hospitalCareD3e7.placement.actions.markReady",
  MARK_DEPARTED: "hospitalCareD3e7.placement.actions.markDeparted",
  MARK_ARRIVED: "hospitalCareD3e7.placement.actions.markArrived",
  CANCEL: "hospitalCareD3e7.placement.actions.cancel",
};

export function HospitalCarePlacementQueueView() {
  const { t } = useI18n();
  const [rows, setRows] = useState<HospitalCarePlacementQueueRow[]>([]);
  const [availability, setAvailability] = useState<PlacementQueueAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bedDraft, setBedDraft] = useState<Record<string, string>>({});
  const actionsEnabled = isPlacementActionsEnabledInBrowser();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFacilityPlacementQueue();
      setRows(data.items);
      setAvailability(data.availability);
    } catch (err) {
      setRows([]);
      setAvailability(null);
      setError(
        isForbiddenApiError(err)
          ? t("hospitalCareD3ca.accessDenied")
          : t("hospitalCareD3ca.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const queueRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => isHospitalBoardPlacementQueueRow(r))
      .filter((r) => {
        if (!q) return true;
        const name = `${r.patient.firstName ?? ""} ${r.patient.lastName ?? ""}`.toLowerCase();
        const mrn = (r.patient.mrn ?? "").toLowerCase();
        return name.includes(q) || mrn.includes(q) || r.status.toLowerCase().includes(q);
      });
  }, [rows, query]);

  const runAction = async (row: HospitalCarePlacementQueueRow, action: PlacementQueueAction) => {
    if (!actionsEnabled) return;
    const toStatus = placementActionToStatus(action);
    if (!toStatus) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      const bed = (bedDraft[row.id] ?? "").trim();
      await transitionPlacementRequest(row.id, {
        toStatus,
        assignedBedKey: action === "ASSIGN_BED" ? bed || "BED-1" : undefined,
        assignedRoomKey:
          action === "ASSIGN_BED" ? row.assignedRoomKey || bed || "ROOM-1" : undefined,
        assignedUnitCode:
          action === "ASSIGN_BED" ? row.assignedUnitCode || "MS" : undefined,
        assignmentSourceSystem: action === "ASSIGN_BED" ? "FLOOR_BOARD" : undefined,
        cancellationReason: action === "CANCEL" ? "Cancelled from placement queue" : undefined,
        acceptanceNotes: action === "REQUEST_CLARIFICATION" ? "Clarification requested" : undefined,
      });
      await reload();
    } catch {
      setActionError(t("hospitalCareD3e7.placement.actionError"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <HospitalCareShell
      active="placementQueue"
      title={t("hospitalCareD3ca.placementQueue.title")}
      subtitle={t("hospitalCareD3ca.placementQueue.subtitle")}
    >
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155" }}>
          {t("common.search")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hospitalCareD3ca.searchPlaceholder")}
            style={{
              display: "block",
              width: "100%",
              maxWidth: 360,
              marginTop: 4,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
            }}
          />
        </label>
      </div>

      {!actionsEnabled ? (
        <p
          style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}
          data-testid="hospital-care-placement-actions-off"
        >
          {t("hospitalCareD3e7.placement.actionsOff")}
        </p>
      ) : null}

      {actionError ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#b91c1c" }} role="alert">
          {error}
        </p>
      ) : availability === "FEATURE_DISABLED" ? (
        <p
          style={{ fontSize: 13, color: "#64748b" }}
          data-testid="hospital-care-placement-feature-off"
        >
          {t("hospitalCareD3ca.featureUnavailable")}
        </p>
      ) : queueRows.length === 0 ? (
        <p style={{ fontSize: 13, color: "#64748b" }} data-testid="hospital-care-placement-empty">
          {t("hospitalCareD3ca.placementQueue.empty")}
        </p>
      ) : (
        <div>
          {queueRows.map((row) => {
            const actions = placementActionsForStatus(row.status);
            return (
              <div key={row.id} style={{ marginBottom: 10 }}>
                <HospitalCarePatientCard
                  row={row}
                  href={`/app/encounters/${row.originatingEncounterId}`}
                />
                {actionsEnabled && actions.length > 0 ? (
                  <div
                    data-testid={`placement-actions-${row.id}`}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 6,
                      paddingLeft: 4,
                    }}
                  >
                    {actions.includes("ASSIGN_BED") ? (
                      <input
                        value={bedDraft[row.id] ?? ""}
                        onChange={(e) =>
                          setBedDraft((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        placeholder={t("hospitalCareD3e7.placement.bedPlaceholder")}
                        style={{
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          fontSize: 12,
                          width: 120,
                        }}
                      />
                    ) : null}
                    {actions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={busyId === row.id}
                        data-testid={`placement-action-${action}-${row.id}`}
                        onClick={() => void runAction(row, action)}
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
                        {t(ACTION_I18N[action] as Parameters<typeof t>[0])}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </HospitalCareShell>
  );
}
