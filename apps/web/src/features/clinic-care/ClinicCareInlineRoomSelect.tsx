/**
 * MEDUI.D4C.4 — compact inline room control for ambulatory trackboard / nursing queue.
 * Reuses PATCH /encounters/:id/room via updateEncounterRoomAssignment (enterprise authority only).
 */

"use client";

import React, { useState } from "react";
import { buildEncounterRoomSelectOptions } from "@/lib/encounterRoomOptions";
import { updateEncounterRoomAssignment } from "@/lib/roomAssignmentApi";
import { useI18n } from "@/lib/i18n";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

export function ClinicCareInlineRoomSelect({
  facilityId,
  encounterId,
  encounterType,
  roomLabel,
  disabled,
  onSaved,
  testId,
}: {
  facilityId: string;
  encounterId: string;
  encounterType?: string | null;
  roomLabel: string | null;
  disabled?: boolean;
  onSaved: () => void | Promise<void>;
  testId?: string;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = buildEncounterRoomSelectOptions(roomLabel);
  const value = (roomLabel ?? "").trim();

  return (
    <div style={{ minWidth: 88, maxWidth: 120 }}>
      <select
        data-testid={testId ?? `clinic-care-room-select-${encounterId}`}
        aria-label={t("clinicCareD4c4.roomSelectAria")}
        disabled={disabled || saving}
        value={value}
        onChange={(e) => {
          const next = e.target.value.trim();
          if (next === value) return;
          void (async () => {
            setSaving(true);
            setError(null);
            try {
              await updateEncounterRoomAssignment(facilityId, encounterId, {
                room: next || null,
              });
              await onSaved();
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setError(message || t("clinicCareD4c2.errors.assignFailed"));
            } finally {
              setSaving(false);
            }
          })();
        }}
        style={{
          width: "100%",
          height: 26,
          borderRadius: 6,
          border: `1px solid ${CLINIC_CARE_SHELL.border}`,
          background: "#fff",
          fontSize: 12,
          padding: "0 4px",
          color: "#0f172a",
          cursor: disabled || saving ? "not-allowed" : "pointer",
        }}
      >
        <option value="">{t("clinicCareD4c4.roomUnassigned")}</option>
        {options.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" style={{ margin: "2px 0 0", fontSize: 10, color: "#b91c1c", lineHeight: 1.2 }}>
          {error}
        </p>
      ) : null}
      {/* encounterType reserved for future unit-aware options; ambulatory reuses enterprise list */}
      {encounterType ? null : null}
    </div>
  );
}
