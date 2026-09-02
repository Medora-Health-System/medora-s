"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  ErHandoffV1ReadonlySummary,
  erHandoffV1ShouldShowReadonlyOperationalBlock,
} from "@/components/encounters/ErHandoffV1Panel";
import { EdRoomOccupancyConfirmModal } from "@/components/encounters/EdRoomOccupancyConfirmModal";
import {
  buildEdRoomOccupancyConfirmPayload,
  checkEdRoomAssignmentConflict,
  isSameNormalizedRoom,
  parseEdRoomOccupiedApiError,
} from "@/lib/edRoomAssignment";
import { buildEncounterRoomSelectOptions, formatEncounterRoomDisplay } from "@/lib/encounterRoomOptions";
import type { EdRoomOccupancyConflict } from "@medora/shared";

type ProviderRow = { id: string; firstName: string; lastName: string };

export function EncounterOperationalPanel({
  encounterId,
  facilityId,
  canEdit,
  roomLabel,
  physicianAssigned,
  onUpdated,
  onSaved,
  nursingAssessment,
}: {
  encounterId: string;
  facilityId: string;
  canEdit: boolean;
  roomLabel?: string | null;
  physicianAssigned?: { id: string; firstName: string; lastName: string } | null;
  onUpdated: () => void | Promise<void>;
  /** Merge returned API fields immediately (avoids empty display before GET completes). */
  onSaved?: (patch: Record<string, unknown>) => void;
  /** For ER handoff (erHandoffV1) merge — same shape as GET /encounters/:id. */
  nursingAssessment?: unknown;
}) {
  const { t } = useI18n();
  const [room, setRoom] = useState(roomLabel ?? "");
  const [physicianId, setPhysicianId] = useState(physicianAssigned?.id ?? "");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomOccupancyConflict, setRoomOccupancyConflict] = useState<EdRoomOccupancyConflict | null>(null);

  useEffect(() => {
    setRoom(roomLabel ?? "");
  }, [roomLabel]);

  useEffect(() => {
    setPhysicianId(physicianAssigned?.id ?? "");
  }, [physicianAssigned?.id]);

  useEffect(() => {
    if (!facilityId || !canEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/roster/providers", { facilityId });
        if (!cancelled && Array.isArray(data)) setProviders(data);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, canEdit]);

  /** Include current provider if missing from roster (avoids raw UUID in `<select>`). */
  const providersForSelect = useMemo(() => {
    const list = [...providers];
    const effectiveId = (physicianId || physicianAssigned?.id || "").trim();
    if (!effectiveId) return list;
    if (list.some((p) => p.id === effectiveId)) return list;
    if (physicianAssigned && physicianAssigned.id === effectiveId) {
      return [
        {
          id: physicianAssigned.id,
          firstName: physicianAssigned.firstName,
          lastName: physicianAssigned.lastName,
        },
        ...list,
      ];
    }
    return [{ id: effectiveId, firstName: "", lastName: "" }, ...list];
  }, [providers, physicianId, physicianAssigned]);

  const providerOptionLabel = useCallback(
    (p: ProviderRow) => {
      const s = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
      return s || t("encounterOperational.providerNameFallback");
    },
    [t]
  );

  const showReadonlyHandoff = !canEdit && erHandoffV1ShouldShowReadonlyOperationalBlock(nursingAssessment);

  const roomOptions = useMemo(() => buildEncounterRoomSelectOptions(room), [room]);

  const performSave = useCallback(
    async (
      roomToSave: string,
      opts?: {
        occupancyConfirm?: EdRoomOccupancyConflict;
        acceptedRoom?: string;
      }
    ) => {
      if (!canEdit) return;
      setSaving(true);
      setError(null);
      try {
        const occupancyPayload = opts?.occupancyConfirm
          ? buildEdRoomOccupancyConfirmPayload(opts.occupancyConfirm, opts.acceptedRoom)
          : null;
        const res = await apiFetch(`/encounters/${encounterId}/operational`, {
          method: "PATCH",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomLabel: occupancyPayload?.roomLabel ?? (roomToSave.trim() || null),
            physicianAssignedUserId: physicianId || null,
            ...(occupancyPayload
              ? {
                  confirmOccupiedRoomAssignment: occupancyPayload.confirmOccupiedRoomAssignment,
                  roomOccupancyOverride: occupancyPayload.roomOccupancyOverride,
                }
              : {}),
          }),
        });
        if (res && typeof res === "object" && !Array.isArray(res) && !(res as { queued?: boolean }).queued) {
          onSaved?.(res as Record<string, unknown>);
          const savedRoom = (res as { roomLabel?: string | null }).roomLabel;
          if (typeof savedRoom === "string") setRoom(savedRoom);
        }
        await Promise.resolve(onUpdated());
      } catch (e) {
        const apiConflict = parseEdRoomOccupiedApiError(e);
        if (apiConflict) {
          setRoomOccupancyConflict(apiConflict);
          return;
        }
        setError(normalizeUserFacingError(e instanceof Error ? e.message : null, "fr") || t("encounterOperational.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [canEdit, encounterId, facilityId, onUpdated, onSaved, physicianId, t]
  );

  const save = useCallback(async () => {
    if (!canEdit) return;
    const trimmedRoom = room.trim();
    if (isSameNormalizedRoom(roomLabel, trimmedRoom)) {
      await performSave(trimmedRoom);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const conflict = await checkEdRoomAssignmentConflict(facilityId, trimmedRoom, encounterId);
      if (conflict) {
        setRoomOccupancyConflict(conflict);
        return;
      }
      await performSave(trimmedRoom);
    } catch (e) {
      const apiConflict = parseEdRoomOccupiedApiError(e);
      if (apiConflict) {
        setRoomOccupancyConflict(apiConflict);
        return;
      }
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, "fr") || t("encounterOperational.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [canEdit, encounterId, facilityId, performSave, room, roomLabel, t]);

  const confirmOccupiedRoomAssignment = useCallback(async () => {
    if (!roomOccupancyConflict) return;
    const nextRoom = roomOccupancyConflict.suggestedRoom;
    setRoom(nextRoom);
    setRoomOccupancyConflict(null);
    await performSave(roomOccupancyConflict.requestedRoom, {
      occupancyConfirm: roomOccupancyConflict,
      acceptedRoom: nextRoom,
    });
  }, [performSave, roomOccupancyConflict]);

  const panelShell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
    marginTop: 16,
    padding: "16px 18px",
  };

  const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#64748b",
    marginBottom: 6,
    letterSpacing: "0.02em",
  };

  const selectStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    minWidth: 160,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  if (!canEdit) {
    return (
      <div style={panelShell}>
        <div style={{ fontSize: 13, color: "#334155", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, rowGap: 10 }}>
            <div>
              <span style={{ color: "#64748b" }}>{t("encounterOperational.roomColon")} </span>
              <strong style={{ color: "#0f172a" }}>{formatEncounterRoomDisplay(roomLabel, t)}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>
                {t("encounterOperational.assignedProviderColon")}{" "}
              </span>
              <strong style={{ color: "#0f172a" }}>
                {physicianAssigned
                  ? `${physicianAssigned.firstName} ${physicianAssigned.lastName}`.trim()
                  : t("common.dash")}
              </strong>
            </div>
          </div>
          {showReadonlyHandoff ? (
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                {t("encounterOperational.handoffSectionTitle")}
              </div>
              <ErHandoffV1ReadonlySummary nursingAssessment={nursingAssessment} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div style={panelShell}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 14, letterSpacing: "0.01em" }}>
        {t("encounterOperational.panelTitle")}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        <div>
          <label style={fieldLabel}>{t("encounterOperational.room")}</label>
          <select
            value={room || ""}
            onChange={(e) => setRoom(e.target.value)}
            style={{ ...selectStyle, minWidth: 168 }}
          >
            <option value="">{t("common.dash")}</option>
            {roomOptions.map((r) => (
              <option key={r} value={r}>
                {formatEncounterRoomDisplay(r, t, r)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>{t("encounterOperational.assignedProvider")}</label>
          <select
            value={physicianId}
            onChange={(e) => setPhysicianId(e.target.value)}
            style={{ ...selectStyle, minWidth: 228 }}
          >
            <option value="">{t("common.dash")}</option>
            {providersForSelect.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{
            padding: "10px 18px",
            backgroundColor: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: saving ? "wait" : "pointer",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
        >
          {saving ? t("common.saving") : t("common.save")}
        </button>
      </div>

      {error && (
        <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 12, lineHeight: 1.45 }} role="alert">
          {error}
        </p>
      )}
      {roomOccupancyConflict ? (
        <EdRoomOccupancyConfirmModal
          requestedRoom={roomOccupancyConflict.requestedRoom}
          suggestedRoom={roomOccupancyConflict.suggestedRoom}
          saving={saving}
          onCancel={() => {
            if (saving) return;
            setRoomOccupancyConflict(null);
          }}
          onConfirm={() => void confirmOccupiedRoomAssignment()}
        />
      ) : null}
    </div>
  );
}
