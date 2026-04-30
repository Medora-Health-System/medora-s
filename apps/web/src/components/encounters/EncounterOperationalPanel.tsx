"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { erHandoffV1SatisfiesInpatientTransferConfirm } from "@medora/shared";
import {
  ErHandoffV1ReadonlySummary,
  erHandoffV1ShouldShowReadonlyOperationalBlock,
} from "@/components/encounters/ErHandoffV1Panel";

const ROOM_VALUES = ["Salle d'attente", ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

type ProviderRow = { id: string; firstName: string; lastName: string };

export function EncounterOperationalPanel({
  encounterId,
  facilityId,
  canEdit,
  roomLabel,
  physicianAssigned,
  onUpdated,
  onSaved,
  showConfirmInpatientTransfer,
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
  /** Open EMERGENCY encounter with saved admission packet — show transfer to hospitalization board. */
  showConfirmInpatientTransfer?: boolean;
  /** For ER handoff (erHandoffV1) merge — same shape as GET /encounters/:id. */
  nursingAssessment?: unknown;
}) {
  const { t } = useI18n();
  const [room, setRoom] = useState(roomLabel ?? "");
  const [physicianId, setPhysicianId] = useState(physicianAssigned?.id ?? "");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handoffSatisfied = useMemo(
    () => erHandoffV1SatisfiesInpatientTransferConfirm(nursingAssessment),
    [nursingAssessment]
  );

  const showReadonlyHandoff = !canEdit && erHandoffV1ShouldShowReadonlyOperationalBlock(nursingAssessment);

  const save = useCallback(
    async (opts?: { confirmInpatientTransfer?: boolean }) => {
      if (!canEdit) return;
      setSaving(true);
      setError(null);
      try {
        const res = await apiFetch(`/encounters/${encounterId}/operational`, {
          method: "PATCH",
          facilityId,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomLabel: room.trim() || null,
            physicianAssignedUserId: physicianId || null,
            ...(opts?.confirmInpatientTransfer ? { confirmInpatientTransfer: true } : {}),
          }),
        });
        if (res && typeof res === "object" && !Array.isArray(res) && !(res as { queued?: boolean }).queued) {
          onSaved?.(res as Record<string, unknown>);
        }
        await Promise.resolve(onUpdated());
      } catch (e) {
        setError(normalizeUserFacingError(e instanceof Error ? e.message : null) || t("encounterOperational.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [canEdit, encounterId, facilityId, onUpdated, onSaved, physicianId, room, t]
  );

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
              <strong style={{ color: "#0f172a" }}>{roomLabel?.trim() || t("common.dash")}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>
                {showConfirmInpatientTransfer
                  ? t("encounterOperational.acceptingPhysicianColon")
                  : t("encounterOperational.assignedProviderColon")}{" "}
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
            {ROOM_VALUES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={fieldLabel}>
            {showConfirmInpatientTransfer
              ? t("encounterOperational.acceptingPhysician")
              : t("encounterOperational.assignedProvider")}
          </label>
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

      {showConfirmInpatientTransfer ? (
        <>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
              {t("encounterOperational.handoffSectionTitle")}
            </div>
            <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("encounterOperational.handoffEditInNursingTabHint")}
            </p>
            <ErHandoffV1ReadonlySummary nursingAssessment={nursingAssessment} />
          </div>

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
              {t("encounterOperational.confirmInpatientTransferHint")}
            </p>
            {!handoffSatisfied ? (
              <p style={{ margin: "0 0 10px 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
                {t("encounterOperational.handoffRequiredForTransferHint")}
              </p>
            ) : null}
            <button
              type="button"
              disabled={saving || !physicianId.trim() || !handoffSatisfied}
              onClick={() => void save({ confirmInpatientTransfer: true })}
              style={{
                padding: "10px 18px",
                backgroundColor: "#0f766e",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                cursor: saving || !physicianId.trim() || !handoffSatisfied ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                opacity: !physicianId.trim() || !handoffSatisfied ? 0.55 : 1,
              }}
            >
              {saving ? t("common.saving") : t("encounterOperational.confirmInpatientTransferButton")}
            </button>
          </div>
        </>
      ) : null}
      {error && (
        <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 12, lineHeight: 1.45 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
