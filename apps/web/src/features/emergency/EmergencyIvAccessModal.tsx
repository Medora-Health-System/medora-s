"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { appendIvQuickNoteUnique } from "@/lib/ivAccessQuickNotes";

type IvActiveRow = {
  insertionEventId: string;
  site: string;
  gauge: string;
  insertedAt: string;
  recordedByDisplayName: string | null;
  notes: string | null;
};

type IvRemovedRow = {
  removalEventId: string;
  insertionEventId: string;
  site: string;
  gauge: string;
  insertedAt: string;
  insertedByDisplayName?: string | null;
  insertionNotes?: string | null;
  removedAt: string;
  removedByDisplayName?: string | null;
  removalReason?: string | null;
  removalNotes?: string | null;
  reason: string | null;
  notes: string | null;
  recordedByDisplayName: string | null;
};

function fillTpl(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

function parseIvPayload(raw: unknown): { active: IvActiveRow[]; removed: IvRemovedRow[] } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const a = o.active;
  const r = o.removed;
  if (!Array.isArray(a) || !Array.isArray(r)) return null;
  const active: IvActiveRow[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = typeof x.insertionEventId === "string" ? x.insertionEventId : "";
    if (!id) continue;
    active.push({
      insertionEventId: id,
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
      insertedAt: typeof x.insertedAt === "string" ? x.insertedAt : "",
      recordedByDisplayName: typeof x.recordedByDisplayName === "string" ? x.recordedByDisplayName : null,
      notes: typeof x.notes === "string" ? x.notes : null,
    });
  }
  const removed: IvRemovedRow[] = [];
  for (const row of r) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const rid = typeof x.removalEventId === "string" ? x.removalEventId : "";
    if (!rid) continue;
    const removalReason =
      typeof x.removalReason === "string"
        ? x.removalReason
        : typeof x.reason === "string"
          ? x.reason
          : null;
    const removalNotes =
      typeof x.removalNotes === "string"
        ? x.removalNotes
        : typeof x.notes === "string"
          ? x.notes
          : null;
    const removedBy =
      typeof x.removedByDisplayName === "string"
        ? x.removedByDisplayName
        : typeof x.recordedByDisplayName === "string"
          ? x.recordedByDisplayName
          : null;
    removed.push({
      removalEventId: rid,
      insertionEventId: typeof x.insertionEventId === "string" ? x.insertionEventId : "",
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
      insertedAt: typeof x.insertedAt === "string" ? x.insertedAt : "",
      insertedByDisplayName:
        typeof x.insertedByDisplayName === "string" ? x.insertedByDisplayName : null,
      insertionNotes: typeof x.insertionNotes === "string" ? x.insertionNotes : null,
      removedAt: typeof x.removedAt === "string" ? x.removedAt : "",
      removedByDisplayName: removedBy,
      removalReason,
      removalNotes,
      reason: removalReason,
      notes: removalNotes,
      recordedByDisplayName: removedBy,
    });
  }
  return { active, removed };
}

function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px 12px",
  overflowY: "auto",
};

const panel: React.CSSProperties = {
  width: "min(520px, 100%)",
  backgroundColor: "#fff",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

const IV_INSERT_CHIP_KEYS = [
  "toleratedWell",
  "noInfiltration",
  "bloodDrawn",
  "flushedEasy",
  "dressingSecured",
] as const;
const IV_REMOVE_CHIP_KEYS = [
  "bandageApplied",
  "noBleeding",
  "catheterIntact",
  "siteCleanDry",
  "toleratedRemoval",
] as const;

const chipBtn: React.CSSProperties = {
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  lineHeight: 1.3,
};

function IvQuickChipRow({
  group,
  keys,
  disabled,
  onAppend,
  t,
}: {
  group: "insertQuickNotes" | "removeQuickNotes";
  keys: readonly string[];
  disabled: boolean;
  onAppend: (phrase: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          margin: "0 0 6px 0",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#64748b",
        }}
      >
        {t("erIvAccess.quickNotesLabel")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {keys.map((k) => {
          const label = t(`erIvAccess.${group}.${k}`);
          return (
            <button
              key={k}
              type="button"
              disabled={disabled}
              onClick={() => onAppend(label)}
              style={{
                ...chipBtn,
                opacity: disabled ? 0.5 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmergencyIvAccessModal({
  open,
  onClose,
  encounterId,
  facilityId,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  onRecorded: () => void;
}) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [active, setActive] = useState<IvActiveRow[]>([]);
  const [removed, setRemoved] = useState<IvRemovedRow[]>([]);

  const [site, setSite] = useState("");
  const [gauge, setGauge] = useState("");
  const [insertedAtLocal, setInsertedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [notes, setNotes] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [removeForId, setRemoveForId] = useState<string | null>(null);
  const [removedAtLocal, setRemovedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [removeReason, setRemoveReason] = useState("");
  const [removeNotes, setRemoveNotes] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    try {
      const data = await apiFetch(`/encounters/${encounterId}/iv-access`, { facilityId });
      const parsed = parseIvPayload(data);
      if (!parsed) {
        setLoadErr(t("erIvAccess.loadError"));
        setActive([]);
        setRemoved([]);
      } else {
        setActive(parsed.active);
        setRemoved(parsed.removed);
      }
    } catch (e) {
      setLoadErr(normalizeUserFacingError(e instanceof Error ? e.message : null) || t("erIvAccess.loadError"));
      setActive([]);
      setRemoved([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    if (!open) return;
    void reload();
    setSite("");
    setGauge("");
    setInsertedAtLocal(toDatetimeLocalValue(new Date()));
    setNotes("");
    setSubmitErr(null);
    setRemoveForId(null);
    setRemovedAtLocal(toDatetimeLocalValue(new Date()));
    setRemoveReason("");
    setRemoveNotes("");
  }, [open, reload]);

  const onSaveInsert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        site: site.trim(),
        gauge: gauge.trim(),
      };
      if (notes.trim()) body.notes = notes.trim();
      if (insertedAtLocal.trim()) {
        const iso = new Date(insertedAtLocal).toISOString();
        if (!Number.isNaN(new Date(insertedAtLocal).getTime())) body.insertedAt = iso;
      }
      await apiFetch(`/encounters/${encounterId}/iv-access/insert`, {
        method: "POST",
        facilityId,
        body: JSON.stringify(body),
      });
      onRecorded();
      await reload();
      setSite("");
      setGauge("");
      setNotes("");
      setInsertedAtLocal(toDatetimeLocalValue(new Date()));
    } catch (err) {
      setSubmitErr(normalizeUserFacingError(err instanceof Error ? err.message : null) || t("erIvAccess.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmRemove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeForId) return;
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {};
      if (removedAtLocal.trim()) {
        const d = new Date(removedAtLocal);
        if (!Number.isNaN(d.getTime())) body.removedAt = d.toISOString();
      }
      if (removeReason.trim()) body.reason = removeReason.trim();
      if (removeNotes.trim()) body.notes = removeNotes.trim();
      await apiFetch(`/encounters/${encounterId}/iv-access/${encodeURIComponent(removeForId)}/remove`, {
        method: "POST",
        facilityId,
        body: JSON.stringify(body),
      });
      onRecorded();
      setRemoveForId(null);
      setRemoveReason("");
      setRemoveNotes("");
      setRemovedAtLocal(toDatetimeLocalValue(new Date()));
      await reload();
    } catch (err) {
      setSubmitErr(normalizeUserFacingError(err instanceof Error ? err.message : null) || t("erIvAccess.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const sectionTitle: React.CSSProperties = {
    margin: "0 0 8px 0",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="er-iv-access-title"
      style={overlay}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div style={panel} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 id="er-iv-access-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            {t("erIvAccess.modalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            {t("erIvAccess.closePanel")}
          </button>
        </div>

        <div style={{ padding: "14px 16px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
          {loadErr ? (
            <p style={{ margin: 0, fontSize: 13, color: "#b45309", fontWeight: 600 }}>{loadErr}</p>
          ) : null}
          {submitErr ? (
            <p style={{ margin: 0, fontSize: 13, color: "#b45309", fontWeight: 600 }}>{submitErr}</p>
          ) : null}

          <div>
            <p style={sectionTitle}>{t("erIvAccess.sectionActive")}</p>
            {loading ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
            ) : active.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("erIvAccess.emptyActive")}</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                {active.map((row) => (
                  <li key={row.insertionEventId} style={{ marginBottom: 8 }}>
                    <div>
                      {fillTpl(t("erIvAccess.activeLine"), {
                        gauge: row.gauge.trim(),
                        site: row.site.trim(),
                        by: (row.recordedByDisplayName ?? "").trim() || "—",
                        time: formatEncounterChromeDateTime(row.insertedAt, language),
                      })}
                    </div>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setRemoveForId(row.insertionEventId);
                        setRemovedAtLocal(toDatetimeLocalValue(new Date()));
                        setSubmitErr(null);
                      }}
                      style={{
                        marginTop: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        background: "#fef2f2",
                        color: "#991b1b",
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {t("erIvAccess.remove")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {removeForId ? (
            <form onSubmit={onConfirmRemove} style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 12 }}>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>{t("erIvAccess.confirmRemoveTitle")}</p>
              <label style={labelStyle}>{t("erIvAccess.removedAtLabel")}</label>
              <input
                type="datetime-local"
                value={removedAtLocal}
                onChange={(e) => setRemovedAtLocal(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>{t("erIvAccess.reasonLabel")}</label>
              <input
                type="text"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>{t("erIvAccess.notesLabel")}</label>
              <IvQuickChipRow
                group="removeQuickNotes"
                keys={IV_REMOVE_CHIP_KEYS}
                disabled={submitting}
                t={t}
                onAppend={(phrase) => setRemoveNotes((prev) => appendIvQuickNoteUnique(prev, phrase))}
              />
              <textarea
                value={removeNotes}
                onChange={(e) => setRemoveNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: "#b91c1c",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {t("erIvAccess.confirmRemove")}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setRemoveForId(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {t("erIvAccess.cancel")}
                </button>
              </div>
            </form>
          ) : null}

          <form onSubmit={onSaveInsert}>
            <p style={sectionTitle}>{t("erIvAccess.sectionDocument")}</p>
            <label style={labelStyle}>{t("erIvAccess.siteLabel")}</label>
            <input
              required
              type="text"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder={t("erIvAccess.sitePlaceholder")}
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <label style={labelStyle}>{t("erIvAccess.gaugeLabel")}</label>
            <input
              required
              type="text"
              value={gauge}
              onChange={(e) => setGauge(e.target.value)}
              placeholder={t("erIvAccess.gaugePlaceholder")}
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <label style={labelStyle}>{t("erIvAccess.insertedAtLabel")}</label>
            <input
              type="datetime-local"
              value={insertedAtLocal}
              onChange={(e) => setInsertedAtLocal(e.target.value)}
              style={{ ...inputStyle, marginBottom: 10 }}
            />
            <label style={labelStyle}>{t("erIvAccess.notesLabel")}</label>
            <IvQuickChipRow
              group="insertQuickNotes"
              keys={IV_INSERT_CHIP_KEYS}
              disabled={submitting || loading}
              t={t}
              onAppend={(phrase) => setNotes((prev) => appendIvQuickNoteUnique(prev, phrase))}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              style={{ ...inputStyle, marginBottom: 12, resize: "vertical" }}
            />
            <button
              type="submit"
              disabled={submitting || loading}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#1d4ed8",
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                cursor: submitting || loading ? "not-allowed" : "pointer",
              }}
            >
              {t("erIvAccess.save")}
            </button>
          </form>

          {removed.length > 0 ? (
            <div>
              <p style={sectionTitle}>{t("erIvAccess.sectionRemoved")}</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {removed.slice(0, 12).map((row) => {
                  const insertedBy = (row.insertedByDisplayName ?? "").trim() || "—";
                  const removedBy = (row.removedByDisplayName ?? row.recordedByDisplayName ?? "").trim() || "—";
                  const meta = [row.removalReason, row.insertionNotes, row.removalNotes]
                    .filter((x): x is string => Boolean(x && String(x).trim()))
                    .join(" · ");
                  return (
                    <li key={row.removalEventId} style={{ marginBottom: 8 }}>
                      <div style={{ color: "#334155", fontWeight: 600 }}>
                        {fillTpl(t("erIvAccess.removedLifecycleLine"), {
                          gauge: row.gauge.trim(),
                          site: row.site.trim(),
                          insertedBy,
                          insertedTime: formatEncounterChromeDateTime(row.insertedAt, language),
                          removedBy,
                          removedTime: formatEncounterChromeDateTime(row.removedAt, language),
                        })}
                      </div>
                      {meta ? (
                        <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{meta}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
