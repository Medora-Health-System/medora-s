"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ENCOUNTER_ROOM_CHANGE_REASON_CODES,
  type EncounterCareUnitCode,
  type EncounterRoomChangeReasonCode,
} from "@medora/shared";
import { EdRoomOccupancyConfirmModal } from "@/components/encounters/EdRoomOccupancyConfirmModal";
import { useI18n } from "@/lib/i18n";
import {
  buildEdRoomOccupancyConfirmPayload,
  checkEdRoomAssignmentConflict,
  parseEdRoomOccupiedApiError,
} from "@/lib/edRoomAssignment";
import type { EdRoomOccupancyConflict } from "@medora/shared";
import { buildEncounterRoomSelectOptions } from "@/lib/encounterRoomOptions";
import {
  encounterRoomUnitLabel,
  extractEncounterRoomInput,
  formatEncounterGovernedRoomDisplay,
  resolveEncounterRoomUnit,
  type EncounterRoomContext,
} from "@/lib/governedRoomDisplay";
import {
  updateEncounterRoomAssignment,
  type EncounterRoomUpdateResponse,
} from "@/lib/roomAssignmentApi";
import { extractRoomAssignmentSaveErrorMessage } from "@/lib/roomAssignmentErrorMessage";

export type RoomAssignmentModalProps = {
  open: boolean;
  facilityId: string;
  encounter: EncounterRoomContext & { id: string };
  onClose: () => void;
  onSaved: (patch: EncounterRoomUpdateResponse) => void | Promise<void>;
};

export function RoomAssignmentModal({
  open,
  facilityId,
  encounter,
  onClose,
  onSaved,
}: RoomAssignmentModalProps) {
  const { t, language } = useI18n();
  const unit = useMemo(() => resolveEncounterRoomUnit(encounter), [encounter]);
  const currentDisplay = useMemo(
    () => formatEncounterGovernedRoomDisplay(encounter, t),
    [encounter, t]
  );
  const isEd = (encounter.type ?? "").toUpperCase() === "EMERGENCY" || unit === "ED";

  const [roomInput, setRoomInput] = useState("");
  const [reasonCode, setReasonCode] = useState<EncounterRoomChangeReasonCode | "">("");
  const [reasonOther, setReasonOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [occupancyConflict, setOccupancyConflict] = useState<EdRoomOccupancyConflict | null>(null);

  useEffect(() => {
    if (!open) return;
    setRoomInput(extractEncounterRoomInput(encounter));
    setReasonCode("");
    setReasonOther("");
    setError(null);
    setOccupancyConflict(null);
  }, [open, encounter]);

  const roomOptions = useMemo(
    () => (isEd ? buildEncounterRoomSelectOptions(encounter.roomLabel) : []),
    [isEd, encounter.roomLabel]
  );

  const performSave = useCallback(
    async (opts?: {
      confirmOccupiedRoomAssignment?: boolean;
      roomOccupancyOverride?: { requestedRoom: string; acceptedRoom: string };
      roomOverride?: string | null;
    }) => {
      setSaving(true);
      setError(null);
      try {
        const roomValue =
          opts?.roomOverride !== undefined ? opts.roomOverride : roomInput.trim() || null;
        const res = await updateEncounterRoomAssignment(facilityId, encounter.id, {
          room: roomValue,
          unitCode: unit,
          reason: reasonCode || null,
          reasonOther: reasonCode === "OTHER" ? reasonOther.trim() || null : null,
          confirmOccupiedRoomAssignment: opts?.confirmOccupiedRoomAssignment,
          roomOccupancyOverride: opts?.roomOccupancyOverride,
        });
        await onSaved(res);
        onClose();
      } catch (err) {
        const conflict = parseEdRoomOccupiedApiError(err);
        if (conflict) {
          setOccupancyConflict(conflict);
          return;
        }
        setError(
          extractRoomAssignmentSaveErrorMessage(err, language, t("roomAssignment.saveFailed"))
        );
      } finally {
        setSaving(false);
      }
    },
    [
      encounter.id,
      facilityId,
      language,
      onClose,
      onSaved,
      reasonCode,
      reasonOther,
      roomInput,
      t,
      unit,
    ]
  );

  const handleSave = useCallback(async () => {
    if (isEd && roomInput.trim()) {
      const conflict = await checkEdRoomAssignmentConflict(
        facilityId,
        roomInput.trim(),
        encounter.id
      );
      if (conflict) {
        setOccupancyConflict(conflict);
        return;
      }
    }
    await performSave();
  }, [encounter.id, facilityId, isEd, performSave, roomInput]);

  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={() => !saving && onClose()}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-assignment-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 440,
            backgroundColor: "#fff",
            borderRadius: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
            padding: "20px 22px",
          }}
        >
          <h2
            id="room-assignment-title"
            style={{ margin: "0 0 14px 0", fontSize: 17, fontWeight: 700, color: "#0f172a" }}
          >
            {t("roomAssignment.title")}
          </h2>

          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {t("roomAssignment.currentRoom")}
              </span>
              <strong style={{ fontSize: 15, color: "#0f172a" }}>{currentDisplay}</strong>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {t("roomAssignment.unitCareArea")}
              </span>
              <span style={{ fontSize: 14, color: "#0f172a" }}>
                {encounterRoomUnitLabel(unit, t)}
              </span>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {t("roomAssignment.roomField")}
              </span>
              {isEd ? (
                <select
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                >
                  {roomOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === "WAITING_ROOM" ? t("encounterRoom.waitingRoom") : opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  disabled={saving}
                  placeholder={t("roomAssignment.roomPlaceholder")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                />
              )}
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                {t("roomAssignment.reasonOptional")}
              </span>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value as EncounterRoomChangeReasonCode | "")}
                disabled={saving}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                }}
              >
                <option value="">{t("roomAssignment.reasonNone")}</option>
                {ENCOUNTER_ROOM_CHANGE_REASON_CODES.map((code) => (
                  <option key={code} value={code}>
                    {t(`roomAssignment.reasons.${code}`)}
                  </option>
                ))}
              </select>
            </label>

            {reasonCode === "OTHER" ? (
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                  {t("roomAssignment.reasonOtherDetail")}
                </span>
                <input
                  type="text"
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                />
              </label>
            ) : null}
          </div>

          {error ? (
            <p role="alert" style={{ color: "#b91c1c", fontSize: 13, margin: "0 0 12px 0" }}>
              {error}
            </p>
          ) : null}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => performSave({ roomOverride: null })}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #fecaca",
                backgroundColor: "#fff",
                color: "#b91c1c",
                fontWeight: 600,
                fontSize: 13,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {t("roomAssignment.clearRoom")}
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  color: "#334155",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#0369a1",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: saving ? "wait" : "pointer",
                }}
              >
                {saving ? t("common.saving") : t("roomAssignment.saveRoom")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {occupancyConflict ? (
        <EdRoomOccupancyConfirmModal
          requestedRoom={occupancyConflict.requestedRoom}
          suggestedRoom={occupancyConflict.suggestedRoom}
          saving={saving}
          onCancel={() => setOccupancyConflict(null)}
          onConfirm={() => {
            const payload = buildEdRoomOccupancyConfirmPayload(occupancyConflict);
            void performSave({
              confirmOccupiedRoomAssignment: true,
              roomOccupancyOverride: payload.roomOccupancyOverride,
              roomOverride: payload.roomLabel,
            });
          }}
        />
      ) : null}
    </>
  );
}
