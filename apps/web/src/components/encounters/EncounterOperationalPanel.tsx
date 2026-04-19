"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import {
  erHandoffV1HasPersistedBlob,
  erHandoffV1SatisfiesInpatientTransferConfirm,
  mergeErHandoffV1IntoNursingAssessment,
  readErHandoffV1FromNursingAssessment,
  type ErHandoffV1Stored,
} from "@medora/shared";

const ROOM_VALUES = ["Salle d'attente", ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

type ProviderRow = { id: string; firstName: string; lastName: string };

function isoToDatetimeLocalValue(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function datetimeLocalToIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function defaultHandoffForm(read: ErHandoffV1Stored): ErHandoffV1Stored {
  return {
    reportGiven: read.reportGiven ?? false,
    reportGivenAt: read.reportGivenAt,
    receivingNurseName: read.receivingNurseName ?? "",
    handoffNote: read.handoffNote ?? "",
    readyForInpatientTransfer: read.readyForInpatientTransfer ?? false,
    providerDispositionCompleted: read.providerDispositionCompleted ?? false,
    nurseDocumentationCompleted: read.nurseDocumentationCompleted ?? false,
    acceptingPhysicianSelected: read.acceptingPhysicianSelected ?? false,
    reportGivenToReceivingUnit: read.reportGivenToReceivingUnit ?? false,
  };
}

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
  const [handoffSaving, setHandoffSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [handoffForm, setHandoffForm] = useState<ErHandoffV1Stored>(() =>
    defaultHandoffForm(readErHandoffV1FromNursingAssessment(undefined))
  );

  useEffect(() => {
    setRoom(roomLabel ?? "");
  }, [roomLabel]);

  useEffect(() => {
    setPhysicianId(physicianAssigned?.id ?? "");
  }, [physicianAssigned?.id]);

  useEffect(() => {
    setHandoffForm(defaultHandoffForm(readErHandoffV1FromNursingAssessment(nursingAssessment)));
  }, [nursingAssessment]);

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

  const saveHandoff = useCallback(async () => {
    if (!canEdit) return;
    setHandoffSaving(true);
    setError(null);
    try {
      let handoffLastSavedByDisplayName = t("emergencyDisposition.signerFallback");
      try {
        const me = await apiFetch("/auth/me");
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) handoffLastSavedByDisplayName = fn;
        }
      } catch {
        /* fallback label */
      }
      const handoffLastSavedAt = new Date().toISOString();
      const payload: ErHandoffV1Stored = {
        ...handoffForm,
        receivingNurseName: handoffForm.receivingNurseName?.trim() || undefined,
        handoffNote: handoffForm.handoffNote?.trim() || undefined,
        reportGivenAt: handoffForm.reportGivenAt?.trim() || undefined,
        handoffLastSavedAt,
        handoffLastSavedByDisplayName,
      };
      const merged = mergeErHandoffV1IntoNursingAssessment(nursingAssessment, payload);
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: merged }),
      });
      if (res && typeof res === "object" && !Array.isArray(res) && !(res as { queued?: boolean }).queued) {
        onSaved?.(res as Record<string, unknown>);
      }
      await Promise.resolve(onUpdated());
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("encounterOperational.handoffSaveFailed")
      );
    } finally {
      setHandoffSaving(false);
    }
  }, [canEdit, encounterId, facilityId, handoffForm, nursingAssessment, onSaved, onUpdated, t]);

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

  const inputStyle: React.CSSProperties = {
    ...selectStyle,
    width: "100%",
    boxSizing: "border-box",
  };

  const checkboxRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#334155",
  };

  const readHandoff = useMemo(() => readErHandoffV1FromNursingAssessment(nursingAssessment), [nursingAssessment]);

  const handoffLastSavedCaption = useMemo(() => {
    if (!readHandoff.handoffLastSavedByDisplayName?.trim() || !readHandoff.handoffLastSavedAt?.trim()) return null;
    try {
      const d = new Date(readHandoff.handoffLastSavedAt);
      const when = Number.isNaN(d.getTime()) ? readHandoff.handoffLastSavedAt.trim() : d.toLocaleString();
      return t("encounterOperational.handoffLastSavedLine")
        .replace("{name}", readHandoff.handoffLastSavedByDisplayName.trim())
        .replace("{when}", when);
    } catch {
      return null;
    }
  }, [readHandoff.handoffLastSavedAt, readHandoff.handoffLastSavedByDisplayName, t]);

  const handoffReadonlyLines = useMemo(() => {
    const lines: string[] = [];
    if (readHandoff.receivingNurseName) {
      lines.push(`${t("encounterOperational.receivingNurseLabel")}: ${readHandoff.receivingNurseName}`);
    }
    if (readHandoff.reportGiven === true || readHandoff.reportGiven === false) {
      lines.push(
        `${t("encounterOperational.reportGivenLabel")}: ${readHandoff.reportGiven ? t("common.yes") : t("common.no")}`
      );
    }
    if (readHandoff.reportGivenAt) {
      try {
        const d = new Date(readHandoff.reportGivenAt);
        if (!Number.isNaN(d.getTime())) {
          lines.push(`${t("encounterOperational.reportGivenAtLabel")}: ${d.toLocaleString()}`);
        }
      } catch {
        /* ignore */
      }
    }
    if (readHandoff.handoffNote) {
      lines.push(`${t("encounterOperational.handoffNoteLabel")}: ${readHandoff.handoffNote}`);
    }
    if (handoffLastSavedCaption) {
      lines.push(handoffLastSavedCaption);
    }
    if (readHandoff.readyForInpatientTransfer === true || readHandoff.readyForInpatientTransfer === false) {
      lines.push(
        `${t("encounterOperational.readyForTransferLabel")}: ${
          readHandoff.readyForInpatientTransfer ? t("common.yes") : t("common.no")
        }`
      );
    }
    return lines;
  }, [handoffLastSavedCaption, readHandoff, t]);

  const showReadonlyHandoff = !canEdit && (erHandoffV1HasPersistedBlob(nursingAssessment) || handoffReadonlyLines.length > 0);

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
              {handoffReadonlyLines.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
                  {handoffReadonlyLines.map((ln, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {ln}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.dash")}</p>
              )}
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
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", marginBottom: 10 }}>
              {t("encounterOperational.handoffSectionTitle")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
              <div>
                <label style={fieldLabel}>{t("encounterOperational.receivingNurseLabel")}</label>
                <input
                  type="text"
                  value={handoffForm.receivingNurseName ?? ""}
                  onChange={(e) => setHandoffForm((f) => ({ ...f, receivingNurseName: e.target.value }))}
                  style={inputStyle}
                  autoComplete="off"
                />
              </div>
              <label style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={handoffForm.reportGiven ?? false}
                  onChange={(e) => setHandoffForm((f) => ({ ...f, reportGiven: e.target.checked }))}
                />
                {t("encounterOperational.reportGivenLabel")}
              </label>
              <div>
                <label style={fieldLabel}>{t("encounterOperational.reportGivenAtLabel")}</label>
                <input
                  type="datetime-local"
                  value={isoToDatetimeLocalValue(handoffForm.reportGivenAt)}
                  onChange={(e) =>
                    setHandoffForm((f) => ({
                      ...f,
                      reportGivenAt: datetimeLocalToIso(e.target.value),
                    }))
                  }
                  style={{ ...inputStyle, maxWidth: 280 }}
                />
              </div>
              <div>
                <label style={fieldLabel}>{t("encounterOperational.handoffNoteLabel")}</label>
                <textarea
                  value={handoffForm.handoffNote ?? ""}
                  onChange={(e) => setHandoffForm((f) => ({ ...f, handoffNote: e.target.value }))}
                  rows={3}
                  placeholder={t("encounterOperational.handoffNotePlaceholder")}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical" as const }}
                />
              </div>
              <label style={checkboxRow}>
                <input
                  type="checkbox"
                  checked={handoffForm.readyForInpatientTransfer ?? false}
                  onChange={(e) => setHandoffForm((f) => ({ ...f, readyForInpatientTransfer: e.target.checked }))}
                />
                {t("encounterOperational.readyForTransferLabel")}
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr)",
                  gap: 6,
                  padding: "10px 0 0 0",
                  borderTop: "1px dashed #e2e8f0",
                }}
              >
                <label style={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={handoffForm.providerDispositionCompleted ?? false}
                    onChange={(e) =>
                      setHandoffForm((f) => ({ ...f, providerDispositionCompleted: e.target.checked }))
                    }
                  />
                  {t("encounterOperational.checklistProviderDisposition")}
                </label>
                <label style={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={handoffForm.nurseDocumentationCompleted ?? false}
                    onChange={(e) =>
                      setHandoffForm((f) => ({ ...f, nurseDocumentationCompleted: e.target.checked }))
                    }
                  />
                  {t("encounterOperational.checklistNurseDocumentation")}
                </label>
                <label style={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={handoffForm.acceptingPhysicianSelected ?? false}
                    onChange={(e) =>
                      setHandoffForm((f) => ({ ...f, acceptingPhysicianSelected: e.target.checked }))
                    }
                  />
                  {t("encounterOperational.checklistAcceptingPhysician")}
                </label>
                <label style={checkboxRow}>
                  <input
                    type="checkbox"
                    checked={handoffForm.reportGivenToReceivingUnit ?? false}
                    onChange={(e) =>
                      setHandoffForm((f) => ({ ...f, reportGivenToReceivingUnit: e.target.checked }))
                    }
                  />
                  {t("encounterOperational.checklistReportToUnit")}
                </label>
              </div>
              <button
                type="button"
                disabled={handoffSaving}
                onClick={() => void saveHandoff()}
                style={{
                  alignSelf: "flex-start",
                  marginTop: 4,
                  padding: "8px 16px",
                  backgroundColor: "#475569",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  cursor: handoffSaving ? "wait" : "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {handoffSaving ? t("common.saving") : t("encounterOperational.saveHandoffButton")}
              </button>
              {handoffLastSavedCaption ? (
                <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {handoffLastSavedCaption}
                </p>
              ) : null}
            </div>
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
