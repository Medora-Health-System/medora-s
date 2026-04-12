"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  buildMsppAlertTriageVerifyBody,
  fetchMsppAlertInvestigationDetail,
  postMsppAlertInvestigationAssign,
  postMsppAlertInvestigationNote,
  postMsppAlertInvestigationOpen,
  postMsppAlertInvestigationStatus,
  type MsppAlertInvestigationCompact,
  type MsppAlertInvestigationEventRow,
  type MsppAlertInvestigationWorkflowStatus,
  type MsppAlertTriageAssignee,
  type MsppAlertTriageRow,
  type MsppSanitarySignalsResponse,
} from "@/lib/msppApi";
import { MSPP_MUTED_INLINE } from "./msppUiChrome";

const INV_STATUSES: MsppAlertInvestigationWorkflowStatus[] = [
  "OPEN",
  "FIELD_VERIFICATION",
  "LAB_FOLLOWUP",
  "COORDINATION_ACTIVE",
  "CLOSED",
];

function formatEventLine(
  t: (k: string) => string,
  e: MsppAlertInvestigationEventRow
): string {
  if (e.action === "OPENED") {
    return e.note?.trim() ? e.note.trim() : t("msppAlertInvestigation.eventOpened");
  }
  if (e.action === "STATUS_CHANGED") {
    const beforeLabel = e.statusBefore ? t(`msppAlertInvestigation.status.${e.statusBefore}`) : "—";
    const afterLabel = e.statusAfter ? t(`msppAlertInvestigation.status.${e.statusAfter}`) : "—";
    return t("msppAlertInvestigation.eventStatusLine").replace("{before}", beforeLabel).replace("{after}", afterLabel);
  }
  if (e.action === "NOTE_ADDED") {
    return e.note?.trim() ? e.note.trim() : t("msppAlertInvestigation.eventNote");
  }
  if (e.action === "ASSIGNED") {
    return e.assignedToUserId
      ? t("msppAlertInvestigation.eventAssignToUser")
      : t("msppAlertInvestigation.eventAssignCleared");
  }
  return e.action;
}

export function MsppAlertInvestigationPanel({
  row,
  window,
  assignees,
  compact,
  onChanged,
}: {
  row: MsppAlertTriageRow;
  window: MsppSanitarySignalsResponse["window"];
  assignees: MsppAlertTriageAssignee[];
  compact: MsppAlertInvestigationCompact | undefined;
  onChanged: () => Promise<void>;
}) {
  const { t } = useI18n();
  const base = useCallback(() => buildMsppAlertTriageVerifyBody(row, window), [row, window]);

  const [openSummary, setOpenSummary] = useState("");
  const [invStatus, setInvStatus] = useState<MsppAlertInvestigationWorkflowStatus>("OPEN");
  const [assigneeId, setAssigneeId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [events, setEvents] = useState<MsppAlertInvestigationEventRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (compact) {
      setInvStatus(compact.investigationStatus);
      setAssigneeId(compact.assignedToUserId ?? "");
    } else {
      setInvStatus("OPEN");
      setAssigneeId("");
    }
    setErr(null);
  }, [compact?.id, compact?.investigationStatus, compact?.assignedToUserId, compact?.updatedAt]);

  useEffect(() => {
    if (!compact) {
      setEvents([]);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    void fetchMsppAlertInvestigationDetail(row.alertKey)
      .then((d) => {
        if (!cancelled) setEvents(d.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [compact?.id, compact?.updatedAt, row.alertKey]);

  async function run(op: () => Promise<unknown>) {
    setSaving(true);
    setErr(null);
    try {
      await op();
      await onChanged();
    } catch {
      setErr(t("msppAlertInvestigation.saveError"));
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
  const primaryBtn: React.CSSProperties = { ...btnStyle, background: "#0f766e", color: "#fff", borderColor: "#0f766e" };

  return (
    <div style={{ maxWidth: 720 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("msppAlertInvestigation.sectionTitle")}
      </h3>
      <p style={{ fontSize: 12, color: "#64748b", marginTop: 0, marginBottom: 12 }}>
        {t("msppAlertInvestigation.panelHint")}
      </p>

      {err ? (
        <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 8 }}>{err}</p>
      ) : null}

      {!compact ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
            {t("msppAlertInvestigation.openSummaryPlaceholder")}
            <textarea
              value={openSummary}
              onChange={(e) => setOpenSummary(e.target.value)}
              rows={3}
              disabled={saving}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>
          <button
            type="button"
            style={primaryBtn}
            disabled={saving}
            onClick={() =>
              run(() =>
                postMsppAlertInvestigationOpen({
                  ...base(),
                  summary: openSummary.trim() ? openSummary.trim() : null,
                })
              )
            }
          >
            {t("msppAlertInvestigation.open")}
          </button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
            {t("msppAlertInvestigation.openedMeta")
              .replace("{name}", compact.openedByDisplayName)
              .replace("{time}", new Date(compact.openedAt).toLocaleString("fr-FR"))}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                {t("msppAlertInvestigation.statusLabel")}
              </label>
              <select
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value as MsppAlertInvestigationWorkflowStatus)}
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
                {INV_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`msppAlertInvestigation.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              style={{ ...primaryBtn, background: "#1e293b", borderColor: "#1e293b" }}
              disabled={saving}
              onClick={() => run(() => postMsppAlertInvestigationStatus({ ...base(), investigationStatus: invStatus }))}
            >
              {t("msppAlertInvestigation.saveStatus")}
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
                {t("msppAlertInvestigation.assignLabel")}
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
                  minWidth: 240,
                  background: "#fff",
                }}
              >
                <option value="">{t("msppAlertTriage.assigneeNone")}</option>
                {assignees.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" style={btnStyle} disabled={saving} onClick={() => run(() => postMsppAlertInvestigationAssign({ ...base(), assignedToUserId: assigneeId || null }))}>
              {t("msppAlertInvestigation.saveAssign")}
            </button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>
              {t("msppAlertInvestigation.noteLabel")}
            </label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={3}
              disabled={saving}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                fontSize: 14,
                resize: "vertical",
              }}
            />
            <button
              type="button"
              style={{ ...btnStyle, marginTop: 8 }}
              disabled={saving || !noteDraft.trim()}
              onClick={() =>
                run(async () => {
                  await postMsppAlertInvestigationNote({ ...base(), note: noteDraft.trim() });
                  setNoteDraft("");
                })
              }
            >
              {t("msppAlertInvestigation.addNote")}
            </button>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#334155" }}>
              {t("msppAlertInvestigation.historyTitle")}
            </h4>
            {loadingDetail ? (
              <p style={{ ...MSPP_MUTED_INLINE, margin: 0 }}>{t("msppAlertInvestigation.loadingDetail")}</p>
            ) : events.length === 0 ? (
              <p style={{ ...MSPP_MUTED_INLINE, margin: 0 }}>{t("msppAlertInvestigation.historyEmpty")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569" }}>
                {events.map((e) => (
                  <li key={e.id} style={{ marginBottom: 8 }}>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>
                      {new Date(e.createdAt).toLocaleString("fr-FR")} · {e.createdByDisplayName}
                    </span>
                    <div>{formatEventLine(t, e)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
