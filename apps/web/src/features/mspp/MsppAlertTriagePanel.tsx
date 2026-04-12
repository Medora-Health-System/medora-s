"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  buildMsppAlertTriageVerifyBody,
  postMsppAlertTriageAcknowledge,
  postMsppAlertTriageAssign,
  postMsppAlertTriageNote,
  postMsppAlertTriageStatus,
  type MsppAlertTriageAssignee,
  type MsppAlertTriageRow,
  type MsppAlertTriageStatus,
  type MsppSanitarySignalsResponse,
} from "@/lib/msppApi";

const TRIAGE_STATUSES: MsppAlertTriageStatus[] = [
  "NEW",
  "ACKNOWLEDGED",
  "UNDER_REVIEW",
  "ESCALATED_INTERNAL",
  "CLOSED",
];

export function MsppAlertTriagePanel({
  row,
  window,
  assignees,
  onSaved,
}: {
  row: MsppAlertTriageRow;
  window: MsppSanitarySignalsResponse["window"];
  assignees: MsppAlertTriageAssignee[];
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const base = () => buildMsppAlertTriageVerifyBody(row, window);

  const [status, setStatus] = useState<MsppAlertTriageStatus>(row.triage?.triageStatus ?? "NEW");
  const [note, setNote] = useState(row.triage?.triageNote ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(row.triage?.assignedToUserId ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setStatus(row.triage?.triageStatus ?? "NEW");
    setNote(row.triage?.triageNote ?? "");
    setAssigneeId(row.triage?.assignedToUserId ?? "");
    setErr(null);
  }, [row.alertKey, row.triage?.triageStatus, row.triage?.triageNote, row.triage?.assignedToUserId]);

  async function run(op: () => Promise<unknown>) {
    setSaving(true);
    setErr(null);
    try {
      await op();
      await onSaved();
    } catch {
      setErr(t("msppAlertTriage.saveError"));
    } finally {
      setSaving(false);
    }
  }

  const btnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.7 : 1,
  };
  const primaryBtn: React.CSSProperties = { ...btnStyle, background: "#1e293b", color: "#fff", borderColor: "#1e293b" };

  return (
    <div style={{ maxWidth: 720 }}>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 12 }}>
        {t("msppAlertTriage.panelHint")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
            {t("msppAlertTriage.fieldStatus")}
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as MsppAlertTriageStatus)}
            disabled={saving}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              minWidth: 200,
              background: "#fff",
            }}
          >
            {TRIAGE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`msppAlertTriage.status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          style={primaryBtn}
          disabled={saving}
          onClick={() => run(() => postMsppAlertTriageStatus({ ...base(), triageStatus: status }))}
        >
          {t("msppAlertTriage.saveStatus")}
        </button>
        <button
          type="button"
          style={btnStyle}
          disabled={saving}
          onClick={() => run(() => postMsppAlertTriageAcknowledge(base()))}
        >
          {t("msppAlertTriage.ackReceipt")}
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
          {t("msppAlertTriage.fieldNote")}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
          rows={3}
          style={{
            width: "100%",
            maxWidth: 560,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            fontSize: 14,
            resize: "vertical",
          }}
        />
        <div style={{ marginTop: 6 }}>
          <button
            type="button"
            style={btnStyle}
            disabled={saving}
            onClick={() => run(() => postMsppAlertTriageNote({ ...base(), triageNote: note }))}
          >
            {t("msppAlertTriage.saveNote")}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
            {t("msppAlertTriage.fieldAssignee")}
          </label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={saving}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 14,
              minWidth: 220,
              background: "#fff",
            }}
          >
            <option value="">{t("msppAlertTriage.assigneeNone")}</option>
            {assignees.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          style={btnStyle}
          disabled={saving}
          onClick={() =>
            run(() =>
              postMsppAlertTriageAssign({
                ...base(),
                assignedToUserId: assigneeId.trim() ? assigneeId : null,
              })
            )
          }
        >
          {t("msppAlertTriage.saveAssign")}
        </button>
      </div>

      {row.triage?.acknowledgedAt ? (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 12, marginBottom: 0 }}>
          {t("msppAlertTriage.ackMeta")
            .replace("{name}", row.triage.acknowledgedByDisplayName ?? "—")
            .replace(
              "{time}",
              new Date(row.triage.acknowledgedAt).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            )}
        </p>
      ) : null}

      {err ? (
        <p style={{ color: "#991b1b", fontSize: 13, marginTop: 10, marginBottom: 0 }} role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}
